import { NextResponse } from 'next/server'
import { getApiStatus, getKnockoutFixtures } from '@/lib/api-football'

// GET /api/test-football?mode=status   → solo verifica la API key
// GET /api/test-football?mode=fixtures → trae 16avos y 8avos del Mundial 2026
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

    return NextResponse.json({ ok: false, error: 'mode inválido. Usa ?mode=status o ?mode=fixtures' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
