import { NextResponse } from 'next/server'
import { getApiStatus, getKnockoutFixtures } from '@/lib/api-football'

// GET /api/test-football?mode=status        → verifica API key (api-sports.io)
// GET /api/test-football?mode=fixtures      → trae 16avos y 8avos (api-sports.io)
// GET /api/test-football?mode=bracket-debug → muestra datos crudos de football-data.org para diagnóstico
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') ?? 'status'

  try {
    if (mode === 'status') {
      const data = await getApiStatus()
      return NextResponse.json({ ok: true, mode, data })
    }

    if (mode === 'fixtures') {
      const data = await getKnockoutFixtures()
      return NextResponse.json({ ok: true, mode, data })
    }

    if (mode === 'bracket-debug') {
      const key = process.env.FOOTBALL_DATA_TOKEN
      if (!key) return NextResponse.json({ ok: false, error: 'FOOTBALL_DATA_TOKEN no configurado' }, { status: 500 })

      const res = await fetch(
        'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
        { headers: { 'X-Auth-Token': key }, cache: 'no-store' }
      )
      if (!res.ok) return NextResponse.json({ ok: false, error: `API error ${res.status}` }, { status: 500 })

      const data = await res.json()
      const STAGES = new Set(['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'])
      const matches = (data.matches ?? [])
        .filter((m: any) => STAGES.has(m.stage))
        .map((m: any) => ({
          utcDate: m.utcDate,
          stage: m.stage,
          status: m.status,
          home: m.homeTeam?.name ?? null,
          away: m.awayTeam?.name ?? null,
          score: m.score,
        }))

      return NextResponse.json({ ok: true, count: matches.length, matches })
    }

    return NextResponse.json({ ok: false, error: 'mode inválido' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
