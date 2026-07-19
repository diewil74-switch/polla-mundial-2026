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

  // MVP and top scorer come from the request body (manual input)
  const body = await request.json().catch(() => ({}))
  const mvpFirstName: string = body.mvp_first_name ?? ''
  const mvpLastName: string = body.mvp_last_name ?? ''
  const mvpCountry: string = body.mvp_country ?? ''
  const topScorerFirstName: string = body.top_scorer_first_name ?? ''
  const topScorerLastName: string = body.top_scorer_last_name ?? ''
  const topScorerCountry: string = body.top_scorer_country ?? ''

  // Auto-derive champion/runner_up/third_place from match results
  const { data: keyMatches } = await supabase
    .from('matches')
    .select('match_number, home_team_id, away_team_id, winner_team_id, home_team:home_team_id(name), away_team:away_team_id(name), winner_team:winner_team_id(name)')
    .in('match_number', [103, 104])

  const finalM = keyMatches?.find((m: any) => m.match_number === 104)
  const thirdM = keyMatches?.find((m: any) => m.match_number === 103)

  const champion: string = (finalM?.winner_team as any)?.name ?? ''
  const runner_up: string = finalM?.winner_team_id
    ? finalM.winner_team_id === finalM.home_team_id
      ? (finalM.away_team as any)?.name ?? ''
      : (finalM.home_team as any)?.name ?? ''
    : ''
  const third_place: string = (thirdM?.winner_team as any)?.name ?? ''

  // Fetch all special predictions
  const { data: allPredictions, error: fetchError } = await supabase
    .from('special_predictions')
    .select('*')

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  const teamPredDeadline = new Date('2026-06-11T23:59:59-05:00')
  const knockoutStartDeadline = new Date('2026-06-28T00:00:00-05:00')

  // Group by user
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
      const predictionTime = new Date(pred.updated_at || pred.created_at)
      const beforeTeamDeadline = predictionTime < teamPredDeadline
      const beforeKnockouts = predictionTime < knockoutStartDeadline
      const beforeTournament = predictionTime < new Date('2026-06-11T14:00:00-05:00')

      if (pred.type === 'champion' && champion && pred.value === champion) {
        championPoints = beforeTeamDeadline ? 20 : beforeKnockouts ? 10 : 0
      } else if (pred.type === 'runner_up' && runner_up && pred.value === runner_up) {
        runnerUpPoints = beforeTeamDeadline ? 12 : beforeKnockouts ? 6 : 0
      } else if (pred.type === 'third_place' && third_place && pred.value === third_place) {
        thirdPlacePoints = beforeTeamDeadline ? 12 : beforeKnockouts ? 6 : 0
      } else if (pred.type === 'mvp' && mvpFirstName && mvpLastName && beforeTournament) {
        try {
          const p = typeof pred.value === 'string' ? JSON.parse(pred.value) : pred.value
          if (
            p.first_name?.toLowerCase() === mvpFirstName.toLowerCase() &&
            p.last_name?.toLowerCase() === mvpLastName.toLowerCase() &&
            p.country === mvpCountry
          ) mvpPoints = 10
        } catch {}
      } else if (pred.type === 'top_scorer' && topScorerFirstName && topScorerLastName && beforeTournament) {
        try {
          const p = typeof pred.value === 'string' ? JSON.parse(pred.value) : pred.value
          if (
            p.first_name?.toLowerCase() === topScorerFirstName.toLowerCase() &&
            p.last_name?.toLowerCase() === topScorerLastName.toLowerCase() &&
            p.country === topScorerCountry
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

  // Batch update using service role (bypasses RLS)
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
