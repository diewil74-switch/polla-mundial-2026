const BASE_URL = 'https://v3.football.api-sports.io'

function getHeaders() {
  const key = process.env.API_FOOTBALL_KEY
  if (!key) throw new Error('API_FOOTBALL_KEY no está configurada en .env.local')
  return { 'x-apisports-key': key }
}

export async function getApiStatus() {
  const res = await fetch(`${BASE_URL}/status`, { headers: getHeaders() })
  if (!res.ok) throw new Error(`API-Football status error: ${res.status}`)
  return res.json()
}

// Liga 1 = FIFA World Cup, temporada 2026
export async function getWorldCupFixtures(round?: string) {
  const params = new URLSearchParams({ league: '1', season: '2026' })
  if (round) params.set('round', round)

  const res = await fetch(`${BASE_URL}/fixtures?${params}`, { headers: getHeaders() })
  if (!res.ok) throw new Error(`API-Football fixtures error: ${res.status}`)
  return res.json()
}

// Trae solo partidos de 16avos y 8avos
export async function getKnockoutFixtures() {
  const [r32, r16] = await Promise.all([
    getWorldCupFixtures('Round of 16'),
    getWorldCupFixtures('Round of 8'),
  ])
  return { r32: r32.response ?? [], r16: r16.response ?? [] }
}
