import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fetchApiFixtures, NEXT_MATCH, POSITION_IN_NEXT } from '@/lib/sync-bracket'

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

  try {
    const { last32, knockout, warnings } = await fetchApiFixtures()

    // Fetch DB dieciseisavos to match by team IDs (not by UTC time)
    const { data: r32DbMatches } = await supabase
      .from('matches')
      .select('match_number, home_team_id, away_team_id')
      .gte('match_number', 73)
      .lte('match_number', 88)

    // Updates accumulator: match_number → fields to update
    const updatesMap = new Map<number, Record<string, any>>()
    const summary: string[] = []
    const allWarnings = [...warnings]

    function addUpdate(mn: number, fields: Record<string, any>) {
      updatesMap.set(mn, { ...(updatesMap.get(mn) ?? {}), ...fields })
    }

    // Process LAST_32: match API fixture to DB match by team IDs, then propagate winner
    for (const f of last32) {
      if (!f.isFinished) continue
      if (f.homeTeamId === null && f.awayTeamId === null) continue

      // Find which DB match has these two teams (in either order)
      const dbMatch = r32DbMatches?.find(m =>
        (m.home_team_id === f.homeTeamId && m.away_team_id === f.awayTeamId) ||
        (m.home_team_id === f.awayTeamId && m.away_team_id === f.homeTeamId)
      )

      if (!dbMatch) {
        allWarnings.push(`LAST_32: sin partido en DB para "${f.homeTeamName}" vs "${f.awayTeamName}"`)
        continue
      }

      const mn = dbMatch.match_number
      const isFlipped = dbMatch.home_team_id === f.awayTeamId

      // Update dieciseisavo score (respecting DB home/away order)
      const dbHomeScore = isFlipped ? f.awayScore : f.homeScore
      const dbAwayScore = isFlipped ? f.homeScore : f.awayScore
      const winnerId = f.winnerIsApiHome
        ? (isFlipped ? f.awayTeamId : f.homeTeamId)
        : f.winnerIsApiHome === false
        ? (isFlipped ? f.homeTeamId : f.awayTeamId)
        : null

      if (dbHomeScore !== null) addUpdate(mn, { home_score: dbHomeScore })
      if (dbAwayScore !== null) addUpdate(mn, { away_score: dbAwayScore })
      if (winnerId !== null) addUpdate(mn, { winner_team_id: winnerId })
      summary.push(`P${mn}: ${f.homeTeamName} vs ${f.awayTeamName} [${f.homeScore}-${f.awayScore}]`)

      // Propagate winner to next match
      if (winnerId !== null) {
        const nextMn = NEXT_MATCH[mn]
        const pos = POSITION_IN_NEXT[mn]
        if (nextMn && pos) {
          addUpdate(nextMn, pos === 'home' ? { home_team_id: winnerId } : { away_team_id: winnerId })
        }
      }
    }

    // Process LAST_16+ (Octavos, Cuartos, Semis, Final)
    for (const f of knockout) {
      if (f.homeTeamId !== null) addUpdate(f.matchNumber, { home_team_id: f.homeTeamId })
      if (f.awayTeamId !== null) addUpdate(f.matchNumber, { away_team_id: f.awayTeamId })

      if (f.isFinished) {
        if (f.homeScore !== null) addUpdate(f.matchNumber, { home_score: f.homeScore })
        if (f.awayScore !== null) addUpdate(f.matchNumber, { away_score: f.awayScore })
        if (f.winnerId !== null) {
          addUpdate(f.matchNumber, { winner_team_id: f.winnerId })
          const nextMn = NEXT_MATCH[f.matchNumber]
          const pos = POSITION_IN_NEXT[f.matchNumber]
          if (nextMn && pos) {
            addUpdate(nextMn, pos === 'home' ? { home_team_id: f.winnerId } : { away_team_id: f.winnerId })
          }
        }
      }

      summary.push(`P${f.matchNumber}: ${f.isFinished ? `[${f.homeScore}-${f.awayScore}]` : '[Por jugar]'}`)
    }

    // Apply all updates to DB (P73-P95 already correct — skip to avoid overwrites)
    let updated = 0
    const dbErrors: string[] = []
    let anyFinished = false

    for (const [mn, payload] of updatesMap.entries()) {
      if (mn <= 96) continue  // P73-P96 ya están correctamente configurados (octavos y 16avos terminados)
      if (Object.keys(payload).length === 0) continue
      if ('home_score' in payload || 'away_score' in payload) anyFinished = true

      const { error } = await supabase
        .from('matches')
        .update(payload)
        .eq('match_number', mn)

      if (error) dbErrors.push(`P${mn}: ${error.message}`)
      else updated++
    }

    if (anyFinished) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
      await fetch(`${siteUrl}/api/admin/recalculate-points`, {
        method: 'POST',
        headers: { Cookie: request.headers.get('Cookie') ?? '' },
      }).catch(() => null)
    }

    return NextResponse.json({
      ok: true,
      updated,
      total: updatesMap.size,
      summary,
      warnings: [...allWarnings, ...dbErrors],
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
