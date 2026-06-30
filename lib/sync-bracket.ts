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

// Dieciseisavos (LAST_32) UTC → DB match_number P73-P88
// Verified from football-data.org API response
const LAST32_UTC_TO_MATCH: Record<string, number> = {
  '2026-06-28T19:00': 73,
  '2026-06-29T17:00': 74,
  '2026-06-29T20:30': 75,
  '2026-06-30T01:00': 76,
  '2026-06-30T17:00': 77,
  '2026-06-30T21:00': 78,
  '2026-07-01T01:00': 79,
  '2026-07-01T16:00': 80,
  '2026-07-01T20:00': 81,
  '2026-07-02T00:00': 82,
  '2026-07-02T19:00': 83,
  '2026-07-02T23:00': 84,
  '2026-07-03T03:00': 85,
  '2026-07-03T18:00': 86,
  '2026-07-03T22:00': 87,
  '2026-07-04T01:30': 88,
}

// Octavos+ (LAST_16, QF, SF, 3rd, Final) UTC → DB match_number P89-P104
const LAST16_UTC_TO_MATCH: Record<string, number> = {
  '2026-07-04T17:00': 90,
  '2026-07-04T21:00': 89,
  '2026-07-05T20:00': 91,
  '2026-07-06T00:00': 92,
  '2026-07-06T19:00': 93,
  '2026-07-07T00:00': 94,
  '2026-07-07T16:00': 95,
  '2026-07-07T20:00': 96,
  '2026-07-09T20:00': 97,
  '2026-07-10T19:00': 98,
  '2026-07-11T21:00': 99,
  '2026-07-12T01:00': 100,
  '2026-07-14T19:00': 101,
  '2026-07-15T19:00': 102,
  '2026-07-18T21:00': 103,
  '2026-07-19T19:00': 104,
}

// Which match does the winner of each match go to next
const NEXT_MATCH: Record<number, number> = {
  73: 90, 74: 91, 75: 89, 76: 90, 77: 89, 78: 91,
  79: 92, 80: 92, 81: 94, 82: 94, 83: 93, 84: 93,
  85: 96, 86: 95, 87: 96, 88: 95,
  89: 97, 90: 97, 91: 99, 92: 99,
  93: 98, 94: 98, 95: 100, 96: 100,
  97: 101, 98: 101, 99: 102, 100: 102,
  101: 104, 102: 104,
}

const POSITION_IN_NEXT: Record<number, 'home' | 'away'> = {
  73: 'home', 74: 'home', 75: 'home', 76: 'away', 77: 'away', 78: 'away',
  79: 'home', 80: 'away', 81: 'home', 82: 'away', 83: 'home', 84: 'away',
  85: 'home', 86: 'home', 87: 'away', 88: 'away',
  89: 'home', 90: 'away', 91: 'home', 92: 'away',
  93: 'home', 94: 'away', 95: 'home', 96: 'away',
  97: 'home', 98: 'away', 99: 'home', 100: 'away',
  101: 'home', 102: 'away',
}

export interface MatchUpdate {
  match_number: number
  home_team_id?: number
  away_team_id?: number
  home_score?: number
  away_score?: number
  winner_team_id?: number
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
    { headers: { 'X-Auth-Token': key }, cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`football-data.org error HTTP ${res.status}`)

  const data = await res.json()
  const ALL_STAGES = new Set(['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'])
  const matches = (data.matches ?? []).filter((m: any) => ALL_STAGES.has(m.stage))

  // Accumulate updates per match_number (multiple sources can contribute to same match)
  const updatesMap = new Map<number, MatchUpdate>()
  const warnings: string[] = []

  function ensureUpdate(matchNum: number, label: string): MatchUpdate {
    if (!updatesMap.has(matchNum)) updatesMap.set(matchNum, { match_number: matchNum, label })
    return updatesMap.get(matchNum)!
  }

  function resolveTeamId(name: string | null, matchNum: number, side: string): number | undefined {
    if (!name) return undefined
    const id = TEAM_TO_ID[name]
    if (id === undefined) warnings.push(`P${matchNum}: equipo no mapeado "${name}" (${side})`)
    return id
  }

  function getScore(m: any) {
    const src = m.score.duration === 'PENALTY_SHOOTOUT' && m.score.regularTime
      ? m.score.regularTime
      : m.score.fullTime
    return src
  }

  for (const m of matches) {
    const utcKey = m.utcDate.slice(0, 16)
    const isFinished = m.status === 'FINISHED'

    if (m.stage === 'LAST_32') {
      const matchNum = LAST32_UTC_TO_MATCH[utcKey]
      if (!matchNum) { warnings.push(`LAST_32 sin mapeo: ${utcKey}`); continue }

      if (isFinished) {
        // Update the dieciseisavo match itself with score + winner
        const homeId = resolveTeamId(m.homeTeam?.name, matchNum, 'home')
        const awayId = resolveTeamId(m.awayTeam?.name, matchNum, 'away')
        const src = getScore(m)
        const update = ensureUpdate(matchNum, `P${matchNum}: ${m.homeTeam?.name ?? '?'} vs ${m.awayTeam?.name ?? '?'} [${src?.home}-${src?.away}]`)
        if (homeId !== undefined) update.home_team_id = homeId
        if (awayId !== undefined) update.away_team_id = awayId
        if (src?.home !== null && src?.home !== undefined) update.home_score = src.home
        if (src?.away !== null && src?.away !== undefined) update.away_score = src.away

        // Determine winner and propagate to next match
        let winnerId: number | undefined
        if (m.score.winner === 'HOME_TEAM') winnerId = homeId
        else if (m.score.winner === 'AWAY_TEAM') winnerId = awayId

        if (winnerId !== undefined) {
          update.winner_team_id = winnerId
          const nextMatchNum = NEXT_MATCH[matchNum]
          const position = POSITION_IN_NEXT[matchNum]
          if (nextMatchNum && position) {
            const nextUpdate = ensureUpdate(nextMatchNum, `P${nextMatchNum}: propagado desde P${matchNum}`)
            if (position === 'home') nextUpdate.home_team_id = winnerId
            else nextUpdate.away_team_id = winnerId
          }
        }
      }
    } else {
      // LAST_16, QUARTER_FINALS, SEMI_FINALS, THIRD_PLACE, FINAL
      const matchNum = LAST16_UTC_TO_MATCH[utcKey]
      if (!matchNum) { warnings.push(`${m.stage} sin mapeo: ${utcKey}`); continue }

      const homeId = resolveTeamId(m.homeTeam?.name, matchNum, 'home')
      const awayId = resolveTeamId(m.awayTeam?.name, matchNum, 'away')
      const src = getScore(m)
      const label = `P${matchNum}: ${m.homeTeam?.name ?? '?'} vs ${m.awayTeam?.name ?? '?'}${isFinished ? ` [${src?.home}-${src?.away}]` : ' [Por jugar]'}`
      const update = ensureUpdate(matchNum, label)

      if (homeId !== undefined) update.home_team_id = homeId
      if (awayId !== undefined) update.away_team_id = awayId

      if (isFinished) {
        if (src?.home !== null && src?.home !== undefined) update.home_score = src.home
        if (src?.away !== null && src?.away !== undefined) update.away_score = src.away

        let winnerId: number | undefined
        if (m.score.winner === 'HOME_TEAM') winnerId = homeId
        else if (m.score.winner === 'AWAY_TEAM') winnerId = awayId
        if (winnerId !== undefined) {
          update.winner_team_id = winnerId
          const nextMatchNum = NEXT_MATCH[matchNum]
          const position = POSITION_IN_NEXT[matchNum]
          if (nextMatchNum && position) {
            const nextUpdate = ensureUpdate(nextMatchNum, `P${nextMatchNum}: propagado desde P${matchNum}`)
            if (position === 'home') nextUpdate.home_team_id = winnerId
            else nextUpdate.away_team_id = winnerId
          }
        }
      }
    }
  }

  const updates = Array.from(updatesMap.values()).sort((a, b) => a.match_number - b.match_number)
  const summary = updates.map(u => u.label)

  return { updates, summary, warnings }
}
