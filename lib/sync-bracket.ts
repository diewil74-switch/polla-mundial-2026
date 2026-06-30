// Maps football-data.org English team names → our DB team IDs
const TEAM_TO_ID: Record<string, number> = {
  'Mexico': 1,
  'South Africa': 4,
  'Canada': 5,
  'Switzerland': 6,
  'Bosnia-Herzegovina': 8,
  'Brazil': 9,
  'Morocco': 10,
  'United States': 13,
  'Australia': 14,
  'Paraguay': 16,
  'Germany': 17,
  'Ivory Coast': 18,
  'Ecuador': 19,
  'Netherlands': 21,
  'Japan': 22,
  'Sweden': 23,
  'Belgium': 25,
  'Egypt': 27,
  'Spain': 29,
  'Cape Verde Islands': 32,
  'France': 33,
  'Senegal': 34,
  'Norway': 35,
  'Argentina': 37,
  'Algeria': 38,
  'Austria': 39,
  'Portugal': 41,
  'Colombia': 42,
  'Congo DR': 43,
  'England': 45,
  'Croatia': 46,
  'Ghana': 48,
}

// Maps UTC datetime (YYYY-MM-DDTHH:MM) → DB match_number
// Verified comparing football-data.org fixture times with our matches.match_date values
const UTC_TO_MATCH: Record<string, number> = {
  // Octavos de final (LAST_16) — P89-P96
  '2026-07-04T17:00': 90,
  '2026-07-04T21:00': 89,
  '2026-07-05T20:00': 91,
  '2026-07-06T00:00': 92,
  '2026-07-06T19:00': 93,
  '2026-07-07T00:00': 94,
  '2026-07-07T16:00': 95,
  '2026-07-07T20:00': 96,
  // Cuartos de final (QUARTER_FINALS) — P97-P100
  '2026-07-09T20:00': 97,
  '2026-07-10T19:00': 98,
  '2026-07-11T21:00': 99,
  '2026-07-12T01:00': 100,
  // Semifinales (SEMI_FINALS) — P101-P102
  '2026-07-14T19:00': 101,
  '2026-07-15T19:00': 102,
  // Tercer puesto — P103
  '2026-07-18T21:00': 103,
  // Final — P104
  '2026-07-19T19:00': 104,
}

export interface MatchUpdate {
  match_number: number
  home_team_id: number | null
  away_team_id: number | null
  home_score: number | null
  away_score: number | null
  winner_team_id: number | null
  is_finished: boolean
  label: string
}

export async function fetchBracketUpdates(): Promise<{
  updates: MatchUpdate[]
  summary: string[]
  warnings: string[]
}> {
  const key = process.env.FOOTBALL_DATA_TOKEN
  if (!key) throw new Error('FOOTBALL_DATA_TOKEN no configurado en .env.local')

  const res = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
    { headers: { 'X-Auth-Token': key }, next: { revalidate: 0 } }
  )
  if (!res.ok) throw new Error(`football-data.org error HTTP ${res.status}`)

  const data = await res.json()
  const KNOCKOUT_STAGES = new Set(['LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'])
  const matches = (data.matches ?? []).filter((m: any) => KNOCKOUT_STAGES.has(m.stage))

  const updates: MatchUpdate[] = []
  const summary: string[] = []
  const warnings: string[] = []

  for (const m of matches) {
    const utcKey = m.utcDate.slice(0, 16) // "2026-07-04T17:00"
    const matchNumber = UTC_TO_MATCH[utcKey]

    if (!matchNumber) {
      warnings.push(`Hora sin mapeo: ${utcKey} (stage: ${m.stage})`)
      continue
    }

    const homeName: string | null = m.homeTeam?.name ?? null
    const awayName: string | null = m.awayTeam?.name ?? null
    const homeId = homeName ? (TEAM_TO_ID[homeName] ?? null) : null
    const awayId = awayName ? (TEAM_TO_ID[awayName] ?? null) : null

    if (homeName && homeId === null) warnings.push(`P${matchNumber}: equipo no mapeado "${homeName}"`)
    if (awayName && awayId === null) warnings.push(`P${matchNumber}: equipo no mapeado "${awayName}"`)

    const isFinished = m.status === 'FINISHED'
    const scoreData = m.score

    // Use regularTime for penalty shootouts, fullTime otherwise
    const src = scoreData.duration === 'PENALTY_SHOOTOUT' && scoreData.regularTime
      ? scoreData.regularTime
      : scoreData.fullTime

    const homeScore = isFinished && src ? (src.home ?? null) : null
    const awayScore = isFinished && src ? (src.away ?? null) : null

    let winnerId: number | null = null
    if (isFinished && scoreData.winner === 'HOME_TEAM') winnerId = homeId
    else if (isFinished && scoreData.winner === 'AWAY_TEAM') winnerId = awayId

    const label = `P${matchNumber}: ${homeName ?? '?'} vs ${awayName ?? '?'}${isFinished ? ` [${homeScore}-${awayScore}${scoreData.duration === 'PENALTY_SHOOTOUT' ? ' pen.' : ''}]` : ' [Por jugar]'}`

    updates.push({ match_number: matchNumber, home_team_id: homeId, away_team_id: awayId, home_score: homeScore, away_score: awayScore, winner_team_id: winnerId, is_finished: isFinished, label })
    summary.push(label)
  }

  // Sort by match number
  updates.sort((a, b) => a.match_number - b.match_number)
  summary.sort()

  return { updates, summary, warnings }
}
