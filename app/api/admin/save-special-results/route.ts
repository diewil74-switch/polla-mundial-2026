import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getMatchResults(supabase: any) {
  const { data: keyMatches } = await supabase
    .from('matches')
    .select('match_number, home_team_id, away_team_id, winner_team_id')
    .in('match_number', [103, 104])

  const finalM = (keyMatches as any[])?.find((m) => m.match_number === 104)
  const thirdM = (keyMatches as any[])?.find((m) => m.match_number === 103)

  const teamIds = new Set<number>()
  if (finalM?.home_team_id) teamIds.add(finalM.home_team_id)
  if (finalM?.away_team_id) teamIds.add(finalM.away_team_id)
  if (finalM?.winner_team_id) teamIds.add(finalM.winner_team_id)
  if (thirdM?.winner_team_id) teamIds.add(thirdM.winner_team_id)

  const { data: teamRows } = await supabase
    .from('teams')
    .select('id, name')
    .in('id', [...teamIds])

  const teamName = (id: number | null): string =>
    id ? ((teamRows as any[])?.find((t) => t.id === id)?.name ?? '') : ''

  return {
    champion: teamName(finalM?.winner_team_id ?? null),
    runner_up: finalM?.winner_team_id
      ? finalM.winner_team_id === finalM.home_team_id
        ? teamName(finalM.away_team_id)
        : teamName(finalM.home_team_id)
      : '',
    third_place: teamName(thirdM?.winner_team_id ?? null),
  }
}

// GET /api/admin/save-special-results — diagnóstico: muestra predicciones sin modificar nada
export async function GET() {
  const supabaseUser = await createServerClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabaseUser.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const supabase = await getServiceClient()
  const results = await getMatchResults(supabase)

  const { data: allPreds } = await supabase
    .from('special_predictions')
    .select('id, user_id, type, value, created_at, points_earned')
    .order('user_id')
    .order('type')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')

  const nameMap = new Map(profiles?.map((p: any) => [p.id, p.display_name]) ?? [])

  const byUser: Record<string, any> = {}
  allPreds?.forEach((pred: any) => {
    const name = nameMap.get(pred.user_id) ?? pred.user_id
    if (!byUser[name]) byUser[name] = {}
    let parsedValue = pred.value
    try { parsedValue = JSON.parse(pred.value) } catch {}
    byUser[name][pred.type] = {
      value: parsedValue,
      raw: pred.value,
      created_at: pred.created_at,
      points_earned: pred.points_earned,
    }
  })

  return NextResponse.json({ results, byUser })
}

// POST /api/admin/save-special-results — calcula y guarda puntos
export async function POST(request: Request) {
  const supabaseUser = await createServerClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabaseUser.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const supabase = await getServiceClient()

  const body = await request.json().catch(() => ({}))
  const mvpFirstName: string = body.mvp_first_name ?? ''
  const mvpLastName: string = body.mvp_last_name ?? ''
  const mvpCountry: string = body.mvp_country ?? ''
  const topScorerFirstName: string = body.top_scorer_first_name ?? ''
  const topScorerLastName: string = body.top_scorer_last_name ?? ''
  const topScorerCountry: string = body.top_scorer_country ?? ''

  const { champion, runner_up, third_place } = await getMatchResults(supabase)

  const { data: allPredictions, error: fetchError } = await supabase
    .from('special_predictions')
    .select('id, user_id, type, value, created_at')

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  const { data: profiles } = await supabase.from('profiles').select('id, display_name')
  const nameMap = new Map(profiles?.map((p: any) => [p.id, p.display_name]) ?? [])

  // Usar created_at: el trigger update_updated_at_column() se dispara en cada UPDATE
  // corrompiendo updated_at. created_at solo se fija en INSERT.
  const teamPredDeadline = new Date('2026-06-11T23:59:59-05:00')
  const knockoutStartDeadline = new Date('2026-06-28T00:00:00-05:00')

  // Normaliza nombre: minúsculas, sin tildes, espacios simples
  const normName = (s: string) =>
    (s ?? '').trim().normalize('NFD').split('').filter(c => c.charCodeAt(0) < 0x0300 || c.charCodeAt(0) > 0x036f).join('').toLowerCase().replace(/\s+/g, ' ')

  const userPredictions = new Map<string, any[]>()
  allPredictions?.forEach((pred: any) => {
    if (!userPredictions.has(pred.user_id)) userPredictions.set(pred.user_id, [])
    userPredictions.get(pred.user_id)!.push(pred)
  })

  const updates: { id: number; points_earned: number }[] = []
  const detailByUser: Record<string, any> = {}

  for (const [userId, predictions] of userPredictions.entries()) {
    let championPoints = 0
    let runnerUpPoints = 0
    let thirdPlacePoints = 0
    let mvpPoints = 0
    let topScorerPoints = 0
    const debugInfo: Record<string, any> = {}

    predictions.forEach((pred: any) => {
      const t = new Date(pred.created_at)
      const beforeTeam = t < teamPredDeadline
      const beforeKnockout = t < knockoutStartDeadline

      if (pred.type === 'champion' && champion && pred.value === champion) {
        championPoints = beforeTeam ? 20 : beforeKnockout ? 10 : 0
      } else if (pred.type === 'runner_up' && runner_up && pred.value === runner_up) {
        runnerUpPoints = beforeTeam ? 12 : beforeKnockout ? 6 : 0
      } else if (pred.type === 'third_place' && third_place && pred.value === third_place) {
        thirdPlacePoints = beforeTeam ? 12 : beforeKnockout ? 6 : 0
      } else if (pred.type === 'top_scorer' && topScorerFirstName && topScorerLastName) {
        try {
          const p = typeof pred.value === 'string' ? JSON.parse(pred.value) : pred.value
          // Comparar nombre completo normalizado (sin tildes, sin importar split first/last)
          const storedFull = normName(`${p.first_name ?? ''} ${p.last_name ?? ''}`).trim()
          const adminFull = normName(`${topScorerFirstName} ${topScorerLastName}`).trim()
          const countryMatch = !topScorerCountry || normName(p.country ?? '') === normName(topScorerCountry)
          const matches = storedFull === adminFull && countryMatch
          debugInfo.top_scorer = {
            stored: p, stored_full: storedFull,
            admin_input: { first_name: topScorerFirstName, last_name: topScorerLastName, country: topScorerCountry },
            admin_full: adminFull,
            name_match: matches,
            before_knockout: beforeKnockout,
            created_at: pred.created_at,
          }
          if (matches && beforeKnockout) topScorerPoints = 10
        } catch (e: any) {
          debugInfo.top_scorer = { parse_error: e.message, raw: pred.value }
        }
      } else if (pred.type === 'mvp' && mvpFirstName && mvpLastName) {
        try {
          const p = typeof pred.value === 'string' ? JSON.parse(pred.value) : pred.value
          const storedFull = normName(`${p.first_name ?? ''} ${p.last_name ?? ''}`).trim()
          const adminFull = normName(`${mvpFirstName} ${mvpLastName}`).trim()
          const countryMatch = !mvpCountry || normName(p.country ?? '') === normName(mvpCountry)
          const matches = storedFull === adminFull && countryMatch
          debugInfo.mvp = {
            stored: p, stored_full: storedFull,
            admin_input: { first_name: mvpFirstName, last_name: mvpLastName, country: mvpCountry },
            admin_full: adminFull,
            name_match: matches,
            before_knockout: beforeKnockout,
          }
          if (matches && beforeKnockout) mvpPoints = 10
        } catch (e: any) {
          debugInfo.mvp = { parse_error: e.message, raw: pred.value }
        }
      }
    })

    const displayName = nameMap.get(userId) ?? userId
    detailByUser[displayName] = {
      champion: championPoints,
      runner_up: runnerUpPoints,
      third_place: thirdPlacePoints,
      mvp: mvpPoints,
      top_scorer: topScorerPoints,
      ...debugInfo,
    }

    predictions.forEach((pred: any) => {
      let points = 0
      if (pred.type === 'champion') points = championPoints
      else if (pred.type === 'runner_up') points = runnerUpPoints
      else if (pred.type === 'third_place') points = thirdPlacePoints
      else if (pred.type === 'mvp') points = mvpPoints
      else if (pred.type === 'top_scorer') points = topScorerPoints
      updates.push({ id: pred.id, points_earned: points })
    })
  }

  let updated = 0
  const errors: string[] = []
  for (const upd of updates) {
    const { error } = await supabase
      .from('special_predictions')
      .update({ points_earned: upd.points_earned })
      .eq('id', upd.id)
    if (error) errors.push(`id ${upd.id}: ${error.message}`)
    else updated++
  }

  return NextResponse.json({
    ok: true,
    updated,
    champion,
    runner_up,
    third_place,
    top_scorer_input: { first_name: topScorerFirstName, last_name: topScorerLastName, country: topScorerCountry },
    mvp_input: { first_name: mvpFirstName, last_name: mvpLastName, country: mvpCountry },
    detailByUser,
    errors,
  })
}
