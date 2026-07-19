import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabaseUser = await createServerClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabaseUser.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json().catch(() => ({}))
  const mvpFirstName: string = body.mvp_first_name ?? ''
  const mvpLastName: string = body.mvp_last_name ?? ''
  const mvpCountry: string = body.mvp_country ?? ''
  const topScorerFirstName: string = body.top_scorer_first_name ?? ''
  const topScorerLastName: string = body.top_scorer_last_name ?? ''
  const topScorerCountry: string = body.top_scorer_country ?? ''

  // Derivar campeón/sub/tercero desde P103 y P104 — queries separadas para evitar joins problemáticos
  const { data: keyMatches } = await supabase
    .from('matches')
    .select('match_number, home_team_id, away_team_id, winner_team_id')
    .in('match_number', [103, 104])

  const finalM = keyMatches?.find((m: any) => m.match_number === 104)
  const thirdM = keyMatches?.find((m: any) => m.match_number === 103)

  // Recoger todos los team_ids necesarios para buscar nombres
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
    id ? (teamRows?.find((t: any) => t.id === id)?.name ?? '') : ''

  const champion: string = teamName(finalM?.winner_team_id ?? null)
  const runner_up: string = finalM?.winner_team_id
    ? finalM.winner_team_id === finalM.home_team_id
      ? teamName(finalM.away_team_id)
      : teamName(finalM.home_team_id)
    : ''
  const third_place: string = teamName(thirdM?.winner_team_id ?? null)

  // Leer todas las predicciones especiales
  const { data: allPredictions, error: fetchError } = await supabase
    .from('special_predictions')
    .select('id, user_id, type, value, created_at')

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  // Usar created_at (no updated_at): el trigger update_updated_at_column() se dispara
  // en cada UPDATE de la tabla (incluidos saves de admin), corrompiendo updated_at.
  // created_at solo se fija en INSERT y refleja cuándo el usuario hizo su predicción.
  const teamPredDeadline = new Date('2026-06-11T23:59:59-05:00')
  const knockoutStartDeadline = new Date('2026-06-28T00:00:00-05:00')
  const firstMatchDeadline = new Date('2026-06-11T14:00:00-05:00')

  const userPredictions = new Map<string, any[]>()
  allPredictions?.forEach((pred: any) => {
    if (!userPredictions.has(pred.user_id)) userPredictions.set(pred.user_id, [])
    userPredictions.get(pred.user_id)!.push(pred)
  })

  const updates: { id: number; points_earned: number }[] = []

  for (const [, predictions] of userPredictions.entries()) {
    let championPoints = 0
    let runnerUpPoints = 0
    let thirdPlacePoints = 0
    let mvpPoints = 0
    let topScorerPoints = 0

    predictions.forEach((pred: any) => {
      const t = new Date(pred.created_at)
      const beforeTeam = t < teamPredDeadline
      const beforeKnockout = t < knockoutStartDeadline
      const beforeFirst = t < firstMatchDeadline

      if (pred.type === 'champion' && champion && pred.value === champion) {
        championPoints = beforeTeam ? 20 : beforeKnockout ? 10 : 0
      } else if (pred.type === 'runner_up' && runner_up && pred.value === runner_up) {
        runnerUpPoints = beforeTeam ? 12 : beforeKnockout ? 6 : 0
      } else if (pred.type === 'third_place' && third_place && pred.value === third_place) {
        thirdPlacePoints = beforeTeam ? 12 : beforeKnockout ? 6 : 0
      } else if (pred.type === 'mvp' && mvpFirstName && mvpLastName && beforeKnockout) {
        // Deadline: inicio de eliminatorias (28 jun), no primer partido — form estuvo abierto hasta entonces
        try {
          const p = typeof pred.value === 'string' ? JSON.parse(pred.value) : pred.value
          if (
            p.first_name?.toLowerCase() === mvpFirstName.toLowerCase() &&
            p.last_name?.toLowerCase() === mvpLastName.toLowerCase() &&
            p.country?.toLowerCase() === mvpCountry?.toLowerCase()
          ) mvpPoints = 10
        } catch {}
      } else if (pred.type === 'top_scorer' && topScorerFirstName && topScorerLastName && beforeKnockout) {
        // Deadline: inicio de eliminatorias (28 jun), no primer partido — form estuvo abierto hasta entonces
        try {
          const p = typeof pred.value === 'string' ? JSON.parse(pred.value) : pred.value
          if (
            p.first_name?.toLowerCase() === topScorerFirstName.toLowerCase() &&
            p.last_name?.toLowerCase() === topScorerLastName.toLowerCase() &&
            p.country?.toLowerCase() === topScorerCountry?.toLowerCase()
          ) topScorerPoints = 10
        } catch {}
      }
    })

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

  // Actualizar con service role (bypasea RLS)
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
    errors,
  })
}
