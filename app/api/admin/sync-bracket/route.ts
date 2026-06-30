import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fetchBracketUpdates } from '@/lib/sync-bracket'

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
    const { updates, summary, warnings } = await fetchBracketUpdates()

    let updated = 0
    const dbErrors: string[] = []
    let anyFinished = false

    for (const u of updates) {
      const payload: Record<string, any> = {}

      if (u.home_team_id !== null) payload.home_team_id = u.home_team_id
      if (u.away_team_id !== null) payload.away_team_id = u.away_team_id

      if (u.is_finished) {
        anyFinished = true
        if (u.home_score !== null) payload.home_score = u.home_score
        if (u.away_score !== null) payload.away_score = u.away_score
        if (u.winner_team_id !== null) payload.winner_team_id = u.winner_team_id
      }

      if (Object.keys(payload).length === 0) continue

      const { error } = await supabase
        .from('matches')
        .update(payload)
        .eq('match_number', u.match_number)

      if (error) dbErrors.push(`P${u.match_number}: ${error.message}`)
      else updated++
    }

    // Recalculate all user points if any finished matches were updated
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
      total: updates.length,
      summary,
      warnings: [...warnings, ...dbErrors],
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
