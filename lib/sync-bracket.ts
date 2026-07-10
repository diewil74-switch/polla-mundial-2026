export const TEAM_TO_ID: Record<string, number> = {
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

export const NEXT_MATCH: Record<number, number> = {
  73: 90, 74: 91, 75: 89, 76: 90, 77: 91, 78: 89,
  79: 92, 80: 92, 81: 94, 82: 94, 83: 93, 84: 93,
  85: 95, 86: 96, 87: 96, 88: 95,
  89: 97, 90: 97, 91: 99, 92: 99,
  93: 98, 94: 98, 95: 100, 96: 100,
  97: 101, 98: 101, 99: 102, 100: 102,
  101: 104, 102: 104,
}

export const POSITION_IN_NEXT: Record<number, 'home' | 'away'> = {
  73: 'home', 74: 'home', 75: 'home', 76: 'away', 77: 'away', 78: 'away',
  79: 'home', 80: 'away', 81: 'home', 82: 'away', 83: 'home', 84: 'away',
  85: 'home', 86: 'away', 87: 'home', 88: 'away',
  89: 'home', 90: 'away', 91: 'home', 92: 'away',
  93: 'home', 94: 'away', 95: 'home', 96: 'away',
  97: 'home', 98: 'away', 99: 'home', 100: 'away',
  101: 'home', 102: 'away',
}

// Octavos+ UTC → DB match_number (P89-P104)
export const LAST16_UTC_TO_MATCH: Record<string, number> = {
  '2026-07-04T17:00': 90,
  '2026-07-04T21:00': 89,
  '2026-07-05T20:00': 91,
  '2026-07-06T01:00': 92,
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

export interface Last32ApiFixture {
  homeTeamId: number | null
  awayTeamId: number | null
  homeTeamName: string | null
  awayTeamName: string | null
  isFinished: boolean
  homeScore: number | null
  awayScore: number | null
  // winner relative to the API home/away (not necessarily the DB home/away)
  winnerIsApiHome: boolean | null
}

export interface KnockoutApiFixture {
  matchNumber: number
  homeTeamId: number | null
  awayTeamId: number | null
  isFinished: boolean
  homeScore: number | null
  awayScore: number | null
  winnerId: number | null
}

export async function fetchApiFixtures(): Promise<{
  last32: Last32ApiFixture[]
  knockout: KnockoutApiFixture[]
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
  const STAGES = new Set(['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'])
  const matches = (data.matches ?? []).filter((m: any) => STAGES.has(m.stage))

  const last32: Last32ApiFixture[] = []
  const knockout: KnockoutApiFixture[] = []
  const warnings: string[] = []

  for (const m of matches) {
    const homeName: string | null = m.homeTeam?.name ?? null
    const awayName: string | null = m.awayTeam?.name ?? null
    const homeId = homeName ? (TEAM_TO_ID[homeName] ?? null) : null
    const awayId = awayName ? (TEAM_TO_ID[awayName] ?? null) : null

    if (homeName && homeId === null) warnings.push(`Equipo sin mapear: "${homeName}"`)
    if (awayName && awayId === null) warnings.push(`Equipo sin mapear: "${awayName}"`)

    const isFinished = m.status === 'FINISHED'
    const src = m.score.duration === 'PENALTY_SHOOTOUT' && m.score.regularTime
      ? m.score.regularTime
      : m.score.fullTime
    const homeScore: number | null = isFinished && src ? (src.home ?? null) : null
    const awayScore: number | null = isFinished && src ? (src.away ?? null) : null

    if (m.stage === 'LAST_32') {
      last32.push({
        homeTeamId: homeId,
        awayTeamId: awayId,
        homeTeamName: homeName,
        awayTeamName: awayName,
        isFinished,
        homeScore,
        awayScore,
        winnerIsApiHome: isFinished
          ? m.score.winner === 'HOME_TEAM'
            ? true
            : m.score.winner === 'AWAY_TEAM'
            ? false
            : null
          : null,
      })
    } else {
      const utcKey = m.utcDate.slice(0, 16)
      const matchNumber = LAST16_UTC_TO_MATCH[utcKey]
      if (!matchNumber) { warnings.push(`${m.stage} sin mapeo UTC: ${utcKey}`); continue }

      let winnerId: number | null = null
      if (isFinished) {
        if (m.score.winner === 'HOME_TEAM') winnerId = homeId
        else if (m.score.winner === 'AWAY_TEAM') winnerId = awayId
      }

      knockout.push({ matchNumber, homeTeamId: homeId, awayTeamId: awayId, isFinished, homeScore, awayScore, winnerId })
    }
  }

  return { last32, knockout, warnings }
}
