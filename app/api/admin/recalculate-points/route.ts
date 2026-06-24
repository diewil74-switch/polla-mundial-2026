import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabaseUser = await createServerClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabaseUser.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Compute group standings dynamically from completed matches
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

  const { data: allUsers } = await supabase.from('profiles').select('id, display_name')
  if (!allUsers) return NextResponse.json({ error: 'No se pudieron cargar usuarios' }, { status: 500 })

  const results: string[] = []

  for (const u of allUsers) {
    const { data: userPreds } = await supabase.from('predictions').select('points_earned').eq('user_id', u.id)
    const matchPoints = userPreds?.reduce((s, p) => s + (p.points_earned || 0), 0) || 0

    const { data: specialPreds } = await supabase.from('special_predictions').select('points_earned').eq('user_id', u.id)
    const specialPoints = specialPreds?.reduce((s, p) => s + (p.points_earned || 0), 0) || 0

    const { data: posPreds } = await supabase
      .from('group_position_predictions')
      .select('group_id, team_id, predicted_position')
      .eq('user_id', u.id)

    let groupOrderBonus = 0
    'ABCDEFGHIJKL'.split('').forEach(groupId => {
      const gs = dynamicStandings.get(groupId)
      if (!gs) return
      const gpp = posPreds?.filter(pp => pp.group_id === groupId) || []
      if (gpp.length < 4) return
      let allMatch = true
      for (let pos = 1; pos <= 4; pos++) {
        const realTeamId = gs.find(s => s.position === pos)?.team_id
        const predTeamId = gpp.find(pp => pp.predicted_position === pos)?.team_id
        if (!realTeamId || !predTeamId || realTeamId !== predTeamId) { allMatch = false; break }
      }
      if (allMatch) groupOrderBonus += 3
    })

    const totalPoints = matchPoints + specialPoints + groupOrderBonus
    await supabase.from('profiles').update({ total_points: totalPoints }).eq('id', u.id)
    results.push(`${u.display_name}: ${totalPoints} pts (partidos: ${matchPoints}, especiales: ${specialPoints}, grupos: ${groupOrderBonus})`)
  }

  return NextResponse.json({ success: true, count: allUsers.length, results })
}
