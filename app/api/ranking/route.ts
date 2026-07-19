import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUser = await createServerClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Service role bypasses RLS — única forma de leer datos de todos los usuarios
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: allUsers } = await supabase.from('profiles').select('id, display_name')
  if (!allUsers) return NextResponse.json({ error: 'Error cargando usuarios' }, { status: 500 })

  // Paginate all calculated predictions (can exceed 1000 rows)
  let allPredictions: any[] = []
  for (let page = 0; page < 10; page++) {
    const { data: batch } = await supabase
      .from('predictions')
      .select('user_id, points_earned')
      .eq('calculated', true)
      .order('match_id').order('user_id')
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (!batch || batch.length === 0) break
    allPredictions = allPredictions.concat(batch)
    if (batch.length < 1000) break
  }

  const matchPts: Record<string, number> = {}
  allPredictions.forEach(p => {
    matchPts[p.user_id] = (matchPts[p.user_id] || 0) + (p.points_earned || 0)
  })

  const { data: allSpecial } = await supabase
    .from('special_predictions')
    .select('user_id, type, points_earned, created_at')
    .order('created_at', { ascending: false })

  // Deduplicar por tipo: tomar solo la más reciente por (user_id, type)
  const specialLatest: Record<string, Record<string, number>> = {}
  allSpecial?.forEach((p: any) => {
    if (!specialLatest[p.user_id]) specialLatest[p.user_id] = {}
    if (!(p.type in specialLatest[p.user_id])) {
      specialLatest[p.user_id][p.type] = p.points_earned || 0
    }
  })
  const specialPts: Record<string, number> = {}
  Object.entries(specialLatest).forEach(([userId, byType]) => {
    specialPts[userId] = Object.values(byType).reduce((s, pts) => s + pts, 0)
  })

  // Group order bonus
  const { data: completedGroupMatches } = await supabase
    .from('matches')
    .select('group_id, home_team_id, away_team_id, home_score, away_score')
    .eq('phase', 'groups')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)

  const dynamicStandings = new Map<string, Array<{ team_id: number; position: number }>>()
  'ABCDEFGHIJKL'.split('').forEach(groupId => {
    const gMatches = completedGroupMatches?.filter(m => m.group_id === groupId) || []
    if (gMatches.length < 6) return
    const teamStats: Record<number, { pts: number; gf: number; gc: number }> = {}
    gMatches.forEach(m => {
      if (!teamStats[m.home_team_id]) teamStats[m.home_team_id] = { pts: 0, gf: 0, gc: 0 }
      if (!teamStats[m.away_team_id]) teamStats[m.away_team_id] = { pts: 0, gf: 0, gc: 0 }
      teamStats[m.home_team_id].gf += m.home_score
      teamStats[m.home_team_id].gc += m.away_score
      teamStats[m.away_team_id].gf += m.away_score
      teamStats[m.away_team_id].gc += m.home_score
      if (m.home_score > m.away_score) teamStats[m.home_team_id].pts += 3
      else if (m.home_score < m.away_score) teamStats[m.away_team_id].pts += 3
      else { teamStats[m.home_team_id].pts += 1; teamStats[m.away_team_id].pts += 1 }
    })
    dynamicStandings.set(groupId, Object.entries(teamStats)
      .map(([tid, s]) => ({ team_id: Number(tid), pts: s.pts, gf: s.gf, gd: s.gf - s.gc }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
      .map((t, i) => ({ team_id: t.team_id, position: i + 1 })))
  })

  const { data: allGroupPos } = await supabase
    .from('group_position_predictions')
    .select('user_id, group_id, team_id, predicted_position')

  const groupBonusPts: Record<string, number> = {}
  for (const u of allUsers) {
    let bonus = 0
    const userPosPreds = allGroupPos?.filter(pp => pp.user_id === u.id) || []
    'ABCDEFGHIJKL'.split('').forEach(groupId => {
      const gs = dynamicStandings.get(groupId)
      if (!gs) return
      const gpp = userPosPreds.filter(pp => pp.group_id === groupId)
      if (gpp.length < 4) return
      let allMatch = true
      for (let pos = 1; pos <= 4; pos++) {
        const realTeamId = gs.find(s => s.position === pos)?.team_id
        const predTeamId = gpp.find(pp => pp.predicted_position === pos)?.team_id
        if (!realTeamId || !predTeamId || realTeamId !== predTeamId) { allMatch = false; break }
      }
      if (allMatch) bonus += 3
    })
    groupBonusPts[u.id] = bonus
  }

  const rankings = allUsers
    .map(u => ({
      id: u.id,
      display_name: u.display_name,
      group_bonus: groupBonusPts[u.id] || 0,
      total_points: (matchPts[u.id] || 0) + (specialPts[u.id] || 0) + (groupBonusPts[u.id] || 0),
    }))
    .sort((a, b) => b.total_points - a.total_points)

  return NextResponse.json(rankings)
}
