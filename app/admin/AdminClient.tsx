'use client'

import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calculateMatchPointsWithBonus } from '@/lib/scoring'
import type { User } from '@supabase/supabase-js'

type Profile = {
  id: string
  display_name: string
  email: string
  role: string
  total_points: number
  created_at: string
}

export default function AdminClient({ user, profile }: { user: User, profile: Profile | null }) {
  const [activeTab, setActiveTab] = useState('results')
  const router = useRouter()
  const supabase = createClient()

  const tabs = [
    { id: 'results', label: 'Resultados', icon: '⚽' },
    { id: 'bracket', label: 'Bracket', icon: '🏆' },
    { id: 'groups', label: 'Grupos', icon: '📋' },
    { id: 'specials', label: 'Especiales', icon: '🌟' },
    { id: 'users', label: 'Usuarios', icon: '👥' },
    { id: 'ranking', label: 'Ranking', icon: '📊' },
  ]

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-red-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                <span className="mr-2">🛡️</span>
                Panel de Administración
              </h1>
              <p className="text-sm text-slate-600 mt-1">Bienvenido, {profile?.display_name}</p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/rules"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-red-600 font-medium text-sm transition-colors flex items-center gap-1"
              >
                📋 Reglas
              </a>
              <a
                href="/dashboard"
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Ver Dashboard
              </a>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-red-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-6 py-4 font-semibold transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'results' && <ResultsTab />}
        {activeTab === 'bracket' && <BracketTab />}
        {activeTab === 'groups' && <GroupStandingsTab />}
        {activeTab === 'specials' && <SpecialsTab />}
        {activeTab === 'users' && <UsersTab currentUserId={user.id} />}
        {activeTab === 'ranking' && <RankingTab />}
      </div>
    </div>
  )
}

// Tab 1: Results Management
function ResultsTab() {
  const [matches, setMatches] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [recalculating, setRecalculating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadMatches()
  }, [filter])

  async function loadMatches() {
    let query = supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(id, name, flag_emoji),
        away_team:teams!matches_away_team_id_fkey(id, name, flag_emoji)
      `)
      .order('match_date', { ascending: true })
      .limit(200)

    if (filter === 'scheduled') {
      query = query.eq('status', 'scheduled')
    } else if (filter === 'finished') {
      query = query.eq('status', 'finished')
    }

    const { data } = await query
    if (data) setMatches(data)
    setLoading(false)
  }

  async function clearResult(matchId: number) {
    if (!confirm('¿Estás seguro de que quieres anular este resultado? Esto recalculará los puntos de todas las predicciones.')) {
      return
    }

    setSaving(matchId)

    try {
      // Clear match result
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          home_score: null,
          away_score: null,
          winner_team_id: null,
        })
        .eq('id', matchId)

      if (matchError) {
        console.error('Error al limpiar resultado:', matchError)
        alert(`Error al anular resultado: ${matchError.message}`)
        setSaving(null)
        return
      }

      // Update local state
      setMatches(prevMatches =>
        prevMatches.map(m =>
          m.id === matchId
            ? { ...m, home_score: null, away_score: null, winner_team_id: null }
            : m
        )
      )

      // Get all users with predictions for this match
      const { data: predictions, error: predError } = await supabase
        .from('predictions')
        .select('user_id')
        .eq('match_id', matchId)

      // Recalculate predictions (set points to 0)
      await supabase
        .from('predictions')
        .update({ points_earned: 0, calculated: false })
        .eq('match_id', matchId)

      if (predError) {
        console.error('Error al recalcular predicciones:', predError)
      }

      // Recalculate total_points for each affected user
      if (predictions && predictions.length > 0) {
        const { data: completedGroupMatchesAR } = await supabase
          .from('matches')
          .select('group_id, home_team_id, away_team_id, home_score, away_score')
          .eq('phase', 'groups')
          .not('home_score', 'is', null)
          .not('away_score', 'is', null)

        const dynamicStandingsAR = new Map<string, Array<{team_id: number, position: number}>>()
        'ABCDEFGHIJKL'.split('').forEach(groupId => {
          const gMatches = completedGroupMatchesAR?.filter((m: any) => m.group_id === groupId) || []
          if (gMatches.length < 6) return
          const teamStats: Record<number, {pts: number, gf: number, gc: number}> = {}
          gMatches.forEach((m: any) => {
            if (!teamStats[m.home_team_id]) teamStats[m.home_team_id] = {pts: 0, gf: 0, gc: 0}
            if (!teamStats[m.away_team_id]) teamStats[m.away_team_id] = {pts: 0, gf: 0, gc: 0}
            teamStats[m.home_team_id].gf += m.home_score
            teamStats[m.home_team_id].gc += m.away_score
            teamStats[m.away_team_id].gf += m.away_score
            teamStats[m.away_team_id].gc += m.home_score
            if (m.home_score > m.away_score) teamStats[m.home_team_id].pts += 3
            else if (m.home_score < m.away_score) teamStats[m.away_team_id].pts += 3
            else { teamStats[m.home_team_id].pts += 1; teamStats[m.away_team_id].pts += 1 }
          })
          dynamicStandingsAR.set(groupId, Object.entries(teamStats)
            .map(([tid, s]) => ({team_id: Number(tid), pts: s.pts, gf: s.gf, gd: s.gf - s.gc}))
            .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
            .map((t, i) => ({team_id: t.team_id, position: i + 1})))
        })

        const uniqueUsers = [...new Set(predictions.map(p => p.user_id))]
        for (const userId of uniqueUsers) {
          const { data: userPreds } = await supabase
            .from('predictions')
            .select('points_earned')
            .eq('user_id', userId)

          const matchPoints = userPreds?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0

          const { data: specialPreds } = await supabase
            .from('special_predictions')
            .select('points_earned')
            .eq('user_id', userId)

          const specialPoints = specialPreds?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0

          let groupOrderBonus = 0
          const { data: userPositionPredictions } = await supabase
            .from('group_position_predictions')
            .select('group_id, team_id, predicted_position')
            .eq('user_id', userId)

          'ABCDEFGHIJKL'.split('').forEach((groupId) => {
            const groupStandings = dynamicStandingsAR.get(groupId)
            if (!groupStandings) return

            const groupPosPreds = userPositionPredictions?.filter(
              (pp: any) => pp.group_id === groupId
            ) || []
            if (groupPosPreds.length < 4) return

            let allMatch = true
            for (let position = 1; position <= 4; position++) {
              const realTeamId = groupStandings.find(s => s.position === position)?.team_id
              const predTeamId = groupPosPreds.find((pp: any) => pp.predicted_position === position)?.team_id
              if (!realTeamId || !predTeamId || realTeamId !== predTeamId) {
                allMatch = false
                break
              }
            }
            if (allMatch) groupOrderBonus += 3
          })

          const totalPoints = matchPoints + specialPoints + groupOrderBonus

          await supabase
            .from('profiles')
            .update({ total_points: totalPoints })
            .eq('id', userId)
        }
      }

      alert('✅ Resultado anulado correctamente')
    } catch (error) {
      console.error('Error:', error)
      alert('Error al anular resultado')
    } finally {
      setSaving(null)
      loadMatches()
    }
  }

  async function saveResult(matchId: number, homeScore: number, awayScore: number) {
    setSaving(matchId)

    try {
      const match = matches.find(m => m.id === matchId)
      if (!match) {
        alert('Error: No se encontró el partido')
        setSaving(null)
        return
      }

      // Determine winner
      const winnerId =
        homeScore > awayScore ? match.home_team_id :
        awayScore > homeScore ? match.away_team_id : null

      // Update match (don't auto-change status, let admin manage it)
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          winner_team_id: winnerId,
        })
        .eq('id', matchId)

      if (matchError) {
        console.error('Error al actualizar partido:', matchError)
        alert(`Error al guardar resultado: ${matchError.message}`)
        setSaving(null)
        return
      }

      console.log('✅ Marcador actualizado exitosamente')

      // Update local state immediately so it persists in UI
      setMatches(prevMatches =>
        prevMatches.map(m =>
          m.id === matchId
            ? { ...m, home_score: homeScore, away_score: awayScore, winner_team_id: winnerId }
            : m
        )
      )

      // Recalculate points for all predictions
      const { data: predictions, error: predError } = await supabase
        .from('predictions')
        .select('user_id, pred_home, pred_away, pred_winner_team_id')
        .eq('match_id', matchId)

      if (predError) {
        console.error('Error al cargar predicciones:', predError)
        alert('Resultado guardado pero hubo un error al recalcular puntos')
        setSaving(null)
        loadMatches()
        return
      }

      if (predictions && predictions.length > 0) {
        const allPredictions = predictions.map((p) => ({
          pred_home: p.pred_home,
          pred_away: p.pred_away,
          pred_winner_team_id: p.pred_winner_team_id,
        }))

        for (const pred of predictions) {
          const points = calculateMatchPointsWithBonus(
            { ...match, home_score: homeScore, away_score: awayScore, winner_team_id: winnerId },
            { pred_home: pred.pred_home, pred_away: pred.pred_away, pred_winner_team_id: pred.pred_winner_team_id },
            allPredictions
          )

          await supabase
            .from('predictions')
            .update({ points_earned: points, calculated: true })
            .eq('match_id', matchId)
            .eq('user_id', pred.user_id)
        }

        // Update all users' totals via server-side API (includes group bonus for all users)
        const res = await fetch('/api/admin/recalculate-points', { method: 'POST' })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Error al actualizar totales')

        alert(`✅ Resultado guardado. ${predictions.length} predicciones recalculadas.`)
      } else {
        alert('✅ Resultado guardado (sin predicciones para este partido)')
      }

      loadMatches()
    } catch (error) {
      console.error('Error inesperado:', error)
      alert(`Error inesperado: ${error}`)
    } finally {
      setSaving(null)
    }
  }

  async function recalculateAllPoints() {
    if (!confirm('¿Estás seguro de que quieres recalcular TODOS los puntos de TODOS los partidos con resultados? Esto puede tardar un momento.')) {
      return
    }

    setRecalculating(true)

    try {
      // Get all matches with results
      const { data: matchesWithResults } = await supabase
        .from('matches')
        .select('*')
        .not('home_score', 'is', null)
        .not('away_score', 'is', null)

      let totalPredictionsRecalculated = 0

      // Recalculate each match (if any)
      if (matchesWithResults && matchesWithResults.length > 0) {
        for (const match of matchesWithResults) {
        const { data: predictions } = await supabase
          .from('predictions')
          .select('user_id, pred_home, pred_away, pred_winner_team_id')
          .eq('match_id', match.id)

        if (predictions && predictions.length > 0) {
          // Convert predictions to format expected by scoring function
          const allPredictions = predictions.map((p) => ({
            pred_home: p.pred_home,
            pred_away: p.pred_away,
            pred_winner_team_id: p.pred_winner_team_id,
          }))

          for (const pred of predictions) {
            const points = calculateMatchPointsWithBonus(
              match,
              {
                pred_home: pred.pred_home,
                pred_away: pred.pred_away,
                pred_winner_team_id: pred.pred_winner_team_id,
              },
              allPredictions
            )

            await supabase
              .from('predictions')
              .update({ points_earned: points, calculated: true })
              .eq('match_id', match.id)
              .eq('user_id', pred.user_id)
          }
          totalPredictionsRecalculated += predictions.length
        }
      }
      }

      // Update profile totals via server-side API (bypasses RLS, includes group bonus)
      const res = await fetch('/api/admin/recalculate-points', { method: 'POST' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Error al actualizar totales')

      alert(`✅ Recálculo completado!\n\n${matchesWithResults?.length || 0} partidos\n${totalPredictionsRecalculated} predicciones\n${result.count} usuarios actualizados`)
      loadMatches()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al recalcular puntos: ' + (error as any).message)
    } finally {
      setRecalculating(false)
    }
  }

  if (loading) return <div className="text-center py-12">Cargando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Resultados</h2>
        <div className="flex gap-2">
          <button
            onClick={recalculateAllPoints}
            disabled={recalculating}
            className="bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            {recalculating ? 'Recalculando...' : '🔄 Recalcular Todos los Puntos'}
          </button>
          {['all', 'scheduled', 'finished'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === f
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'scheduled' ? 'Programados' : 'Finalizados'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {matches.map((match) => (
          <MatchResultCard
            key={match.id}
            match={match}
            onSave={saveResult}
            onClear={clearResult}
            saving={saving === match.id}
          />
        ))}
      </div>
    </div>
  )
}

function MatchResultCard({ match, onSave, onClear, saving }: any) {
  const [homeScore, setHomeScore] = useState(match.home_score?.toString() || '')
  const [awayScore, setAwayScore] = useState(match.away_score?.toString() || '')
  const [editing, setEditing] = useState(false)

  const isFinished = match.status === 'finished'
  const hasScore = match.home_score !== null && match.away_score !== null
  const colombiaTime = new Date(match.match_date).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'short',
    timeStyle: 'short',
  })

  return (
    <div className="bg-white border border-red-100 rounded-lg p-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <p className="text-xs text-slate-500 mb-2">
            Partido #{match.match_number} | {match.phase} | {colombiaTime}
          </p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {match.home_team?.flag_emoji && <span className="text-2xl">{match.home_team.flag_emoji}</span>}
              <span className="font-semibold text-slate-800">
                {match.home_team?.name || match.home_team_label}
              </span>
            </div>
            <span className="text-slate-400">vs</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">
                {match.away_team?.name || match.away_team_label}
              </span>
              {match.away_team?.flag_emoji && <span className="text-2xl">{match.away_team.flag_emoji}</span>}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">{match.venue}, {match.city}</p>
        </div>

        {hasScore && !editing ? (
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-xs text-slate-600 mb-1">Resultado</p>
              <p className="text-2xl font-bold text-slate-800">
                {match.home_score} - {match.away_score}
              </p>
            </div>
            <button
              onClick={() => setEditing(true)}
              disabled={saving}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Editar
            </button>
            <button
              onClick={() => onClear(match.id)}
              disabled={saving}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              {saving ? 'Anulando...' : 'Anular'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="20"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-16 px-2 py-2 border border-slate-300 rounded text-center font-semibold"
                placeholder="0"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                min="0"
                max="20"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-16 px-2 py-2 border border-slate-300 rounded text-center font-semibold"
                placeholder="0"
              />
            </div>
            <button
              onClick={() => {
                const home = parseInt(homeScore) || 0
                const away = parseInt(awayScore) || 0
                onSave(match.id, home, away)
                setEditing(false)
              }}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            {editing && (
              <button
                onClick={() => setEditing(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg font-semibold"
              >
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Tab 2: Bracket Management
function BracketTab() {
  const [matches, setMatches] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ ok: boolean; message: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: matchesData } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(id, name, flag_emoji),
        away_team:teams!matches_away_team_id_fkey(id, name, flag_emoji)
      `)
      .gte('match_number', 73)
      .order('match_number', { ascending: true })

    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .order('name', { ascending: true })

    if (matchesData) setMatches(matchesData)
    if (teamsData) setTeams(teamsData)
    setLoading(false)
  }

  async function autoAssignWinner(match: any) {
    if (match.home_score === null || match.away_score === null) {
      alert('Este partido no tiene resultado aún')
      return
    }

    const winnerId =
      match.home_score > match.away_score
        ? match.home_team_id
        : match.away_score > match.home_score
          ? match.away_team_id
          : null

    if (!winnerId) {
      alert('El partido terminó en empate. Debes asignar manualmente quién pasó.')
      return
    }

    await assignWinner(match.id, winnerId)
  }

  async function assignBothTeams(matchId: number, homeTeamId: number, awayTeamId: number) {
    setSaving(matchId)

    // Update both teams for this match
    const { error } = await supabase
      .from('matches')
      .update({
        home_team_id: homeTeamId,
        away_team_id: awayTeamId
      })
      .eq('id', matchId)

    if (error) {
      console.error('Error al asignar equipos:', error)
      alert(`Error al asignar equipos: ${error.message}`)
      setSaving(null)
      return
    }

    alert('Equipos asignados correctamente')
    setSaving(null)
    loadData()
  }

  async function clearTeams(matchId: number) {
    if (!confirm('¿Estás seguro de que quieres limpiar los equipos de este partido?')) {
      return
    }

    setSaving(matchId)

    // Clear teams for this match
    const { error } = await supabase
      .from('matches')
      .update({
        home_team_id: null,
        away_team_id: null,
        winner_team_id: null
      })
      .eq('id', matchId)

    if (error) {
      console.error('Error al limpiar equipos:', error)
      alert(`Error al limpiar equipos: ${error.message}`)
      setSaving(null)
      return
    }

    alert('✅ Equipos limpiados correctamente')
    setSaving(null)
    loadData()
  }

  async function assignWinner(matchId: number, winnerId: number) {
    setSaving(matchId)

    const match = matches.find(m => m.id === matchId)
    if (!match) return

    // Update winner_team_id
    const { error: matchError } = await supabase
      .from('matches')
      .update({ winner_team_id: winnerId })
      .eq('id', matchId)

    if (matchError) {
      alert(`Error al asignar ganador: ${matchError.message}`)
      setSaving(null)
      return
    }

    // Recalculate predictions for this match with the new winner
    const { data: predictions } = await supabase
      .from('predictions')
      .select('user_id, pred_home, pred_away, pred_winner_team_id')
      .eq('match_id', matchId)

    if (predictions && predictions.length > 0) {
      const allPredictions = predictions.map(p => ({
        pred_home: p.pred_home,
        pred_away: p.pred_away,
        pred_winner_team_id: p.pred_winner_team_id,
      }))
      for (const pred of predictions) {
        const points = calculateMatchPointsWithBonus(
          { ...match, winner_team_id: winnerId },
          { pred_home: pred.pred_home, pred_away: pred.pred_away, pred_winner_team_id: pred.pred_winner_team_id },
          allPredictions
        )
        await supabase
          .from('predictions')
          .update({ points_earned: points, calculated: true })
          .eq('match_id', matchId)
          .eq('user_id', pred.user_id)
      }
      await fetch('/api/admin/recalculate-points', { method: 'POST' })
    }

    // Find next match and position
    const nextMatchNumber = getNextMatchNumber(match.match_number)
    if (!nextMatchNumber) {
      alert('Clasificado actualizado (es la final)')
      setSaving(null)
      loadData()
      return
    }

    const position = getPositionInNextMatch(match.match_number)
    const { data: nextMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('match_number', nextMatchNumber)
      .single()

    if (!nextMatch) {
      setSaving(null)
      loadData()
      return
    }

    // Update next match team
    if (position === 'home') {
      await supabase
        .from('matches')
        .update({ home_team_id: winnerId })
        .eq('id', nextMatch.id)
    } else {
      await supabase
        .from('matches')
        .update({ away_team_id: winnerId })
        .eq('id', nextMatch.id)
    }

    alert('Clasificado asignado correctamente')
    setSaving(null)
    loadData()
  }

  // Lookup tables for real World Cup 2026 bracket progression
  const NEXT_MATCH: Record<number, number> = {
    // R32 → Octavos
    73: 90, 74: 91, 75: 89, 76: 90, 77: 89, 78: 91,
    79: 92, 80: 92, 81: 94, 82: 94, 83: 93, 84: 93,
    85: 96, 86: 95, 87: 96, 88: 95,
    // Octavos → Cuartos
    89: 97, 90: 97, 91: 99, 92: 99,
    93: 98, 94: 98, 95: 100, 96: 100,
    // Cuartos → Semis
    97: 101, 98: 101, 99: 102, 100: 102,
    // Semis → Final
    101: 104, 102: 104,
  }

  const POSITION_IN_NEXT: Record<number, 'home' | 'away'> = {
    // R32 → Octavos
    73: 'home', 74: 'home', 75: 'home', 76: 'away', 77: 'away', 78: 'away',
    79: 'home', 80: 'away', 81: 'home', 82: 'away', 83: 'home', 84: 'away',
    85: 'home', 86: 'home', 87: 'away', 88: 'away',
    // Octavos → Cuartos
    89: 'home', 90: 'away', 91: 'home', 92: 'away',
    93: 'home', 94: 'away', 95: 'home', 96: 'away',
    // Cuartos → Semis
    97: 'home', 98: 'away', 99: 'home', 100: 'away',
    // Semis → Final
    101: 'home', 102: 'away',
  }

  function getNextMatchNumber(currentMatchNumber: number): number | null {
    return NEXT_MATCH[currentMatchNumber] ?? null
  }

  function getPositionInNextMatch(currentMatchNumber: number): 'home' | 'away' {
    return POSITION_IN_NEXT[currentMatchNumber] ?? 'home'
  }

  async function syncBracket() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/admin/sync-bracket', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setSyncResult({ ok: true, message: `Sincronizado: ${data.updated}/${data.total} partidos actualizados.${data.warnings?.length ? ` Avisos: ${data.warnings.join('; ')}` : ''}` })
        loadData()
      } else {
        setSyncResult({ ok: false, message: data.error ?? 'Error desconocido' })
      }
    } catch (e: any) {
      setSyncResult({ ok: false, message: e.message })
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <div className="text-center py-12">Cargando...</div>

  // Group matches by round
  const r32Matches = matches.filter(m => m.match_number >= 73 && m.match_number <= 88)
  const r16Matches = matches.filter(m => m.match_number >= 89 && m.match_number <= 96)
  const quarterMatches = matches.filter(m => m.match_number >= 97 && m.match_number <= 100)
  const semiMatches = matches.filter(m => m.match_number >= 101 && m.match_number <= 102)
  const thirdPlaceMatch = matches.find(m => m.match_number === 103)
  const finalMatch = matches.find(m => m.match_number === 104)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Gestión del Bracket</h2>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Instrucciones:</strong> Para cada partido, puedes asignar manualmente el equipo clasificado usando el menú desplegable, o usar el botón "Auto-completar desde resultado" si ya hay resultado registrado.
        </p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={syncBracket}
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing ? 'Sincronizando...' : 'Sincronizar Bracket desde API'}
        </button>
        {syncResult && (
          <span className={`text-sm ${syncResult.ok ? 'text-green-700' : 'text-red-700'}`}>
            {syncResult.message}
          </span>
        )}
      </div>

      <div className="space-y-8">
        {/* Dieciseisavos */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Dieciseisavos de Final</h3>
          <div className="space-y-3">
            {r32Matches.map(match => (
              <BracketMatchCard
                key={match.id}
                match={match}
                teams={teams}
                onAssign={assignWinner}
                onAssignBothTeams={assignBothTeams}
                onClearTeams={clearTeams}
                onAutoAssign={autoAssignWinner}
                saving={saving === match.id}
              />
            ))}
          </div>
        </div>

        {/* Octavos */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Octavos de Final</h3>
          <div className="space-y-3">
            {r16Matches.map(match => (
              <BracketMatchCard
                key={match.id}
                match={match}
                teams={teams}
                onAssign={assignWinner}
                onAssignBothTeams={assignBothTeams}
                onClearTeams={clearTeams}
                onAutoAssign={autoAssignWinner}
                saving={saving === match.id}
              />
            ))}
          </div>
        </div>

        {/* Cuartos */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Cuartos de Final</h3>
          <div className="space-y-3">
            {quarterMatches.map(match => (
              <BracketMatchCard
                key={match.id}
                match={match}
                teams={teams}
                onAssign={assignWinner}
                onAssignBothTeams={assignBothTeams}
                onClearTeams={clearTeams}
                onAutoAssign={autoAssignWinner}
                saving={saving === match.id}
              />
            ))}
          </div>
        </div>

        {/* Semifinales */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Semifinales</h3>
          <div className="space-y-3">
            {semiMatches.map(match => (
              <BracketMatchCard
                key={match.id}
                match={match}
                teams={teams}
                onAssign={assignWinner}
                onAssignBothTeams={assignBothTeams}
                onClearTeams={clearTeams}
                onAutoAssign={autoAssignWinner}
                saving={saving === match.id}
              />
            ))}
          </div>
        </div>

        {/* Final */}
        {finalMatch && (
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Final</h3>
            <BracketMatchCard
              match={finalMatch}
              teams={teams}
              onAssign={assignWinner}
              onAssignBothTeams={assignBothTeams}
              onClearTeams={clearTeams}
              onAutoAssign={autoAssignWinner}
              saving={saving === finalMatch.id}
            />
          </div>
        )}

        {/* Tercer lugar */}
        {thirdPlaceMatch && (
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Tercer Lugar</h3>
            <BracketMatchCard
              match={thirdPlaceMatch}
              teams={teams}
              onAssign={assignWinner}
              onAssignBothTeams={assignBothTeams}
              onClearTeams={clearTeams}
              onAutoAssign={autoAssignWinner}
              saving={saving === thirdPlaceMatch.id}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function BracketMatchCard({ match, teams, onAssign, onAssignBothTeams, onClearTeams, onAutoAssign, saving }: any) {
  const [selectedHomeTeam, setSelectedHomeTeam] = useState(match.home_team_id?.toString() || '')
  const [selectedAwayTeam, setSelectedAwayTeam] = useState(match.away_team_id?.toString() || '')

  // Update local state when match changes (e.g., after clearing teams)
  useEffect(() => {
    setSelectedHomeTeam(match.home_team_id?.toString() || '')
    setSelectedAwayTeam(match.away_team_id?.toString() || '')
  }, [match.home_team_id, match.away_team_id])

  const colombiaTime = new Date(match.match_date).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'short',
    timeStyle: 'short',
  })

  const hasResult = match.home_score !== null && match.away_score !== null

  return (
    <div className="bg-white border border-red-100 rounded-lg p-4">
      <div className="space-y-4">
        {/* Match header */}
        <div>
          <p className="text-xs text-slate-500 mb-2">
            Partido #{match.match_number} | {colombiaTime}
          </p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {match.home_team?.flag_emoji && <span className="text-2xl">{match.home_team.flag_emoji}</span>}
              <span className="font-semibold text-slate-800">
                {match.home_team?.name || match.home_team_label || 'TBD'}
              </span>
              {match.winner_team_id === match.home_team_id && <span className="text-green-600">✓</span>}
            </div>
            <span className="text-slate-400">vs</span>
            <div className="flex items-center gap-2">
              {match.winner_team_id === match.away_team_id && <span className="text-green-600">✓</span>}
              <span className="font-semibold text-slate-800">
                {match.away_team?.name || match.away_team_label || 'TBD'}
              </span>
              {match.away_team?.flag_emoji && <span className="text-2xl">{match.away_team.flag_emoji}</span>}
            </div>
          </div>
          {hasResult && (
            <p className="text-sm text-slate-600 mt-1">
              Resultado: {match.home_score} - {match.away_score}
            </p>
          )}
          {hasResult && match.home_score === match.away_score && match.home_team_id && match.away_team_id && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-semibold text-amber-800 mb-2">⚽ Empate — ¿Quién avanzó por penales?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => onAssign(match.id, match.home_team_id)}
                  disabled={saving}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50 ${
                    match.winner_team_id === match.home_team_id
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-green-500'
                  }`}
                >
                  {match.home_team?.flag_emoji} {match.home_team?.name || 'Local'}{match.winner_team_id === match.home_team_id ? ' ✓' : ''}
                </button>
                <button
                  onClick={() => onAssign(match.id, match.away_team_id)}
                  disabled={saving}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50 ${
                    match.winner_team_id === match.away_team_id
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-green-500'
                  }`}
                >
                  {match.away_team?.flag_emoji} {match.away_team?.name || 'Visitante'}{match.winner_team_id === match.away_team_id ? ' ✓' : ''}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Team assignment controls */}
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-semibold text-slate-700 min-w-[120px]">Equipo Local:</label>
            <select
              value={selectedHomeTeam}
              onChange={(e) => setSelectedHomeTeam(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg font-semibold text-sm"
            >
              <option value="">Seleccionar equipo local...</option>
              {teams.map((team: { id: number; name: string; flag_emoji: string }) => (
                <option key={team.id} value={team.id}>
                  {team.flag_emoji} {team.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-semibold text-slate-700 min-w-[120px]">Equipo Visitante:</label>
            <select
              value={selectedAwayTeam}
              onChange={(e) => setSelectedAwayTeam(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg font-semibold text-sm"
            >
              <option value="">Seleccionar equipo visitante...</option>
              {teams.map((team: { id: number; name: string; flag_emoji: string }) => (
                <option key={team.id} value={team.id}>
                  {team.flag_emoji} {team.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                if (selectedHomeTeam && selectedAwayTeam) {
                  onAssignBothTeams(match.id, parseInt(selectedHomeTeam), parseInt(selectedAwayTeam))
                }
              }}
              disabled={!selectedHomeTeam || !selectedAwayTeam || saving}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? 'Guardando...' : 'Asignar Equipos'}
            </button>
            {hasResult && (
              <button
                onClick={() => onAutoAssign(match)}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 whitespace-nowrap"
              >
                Auto-completar desde resultado
              </button>
            )}
            {(match.home_team_id || match.away_team_id) && (
              <button
                onClick={() => onClearTeams(match.id)}
                disabled={saving}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 whitespace-nowrap"
              >
                {saving ? 'Limpiando...' : 'Limpiar Equipos'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Tab 3: User Management
function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setUsers(data)
    setLoading(false)
  }

  async function toggleAdminRole(userId: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'

    // Si se está intentando asignar rol de admin, verificar el límite
    if (newRole === 'admin') {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      const currentAdminCount = admins?.length || 0

      if (currentAdminCount >= 3) {
        alert('⚠️ Límite alcanzado: Solo puede haber 3 administradores activos. Debes quitar el rol de admin a otro usuario primero.')
        return
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      alert(`Error al actualizar rol: ${error.message}`)
      return
    }

    alert(`✅ Rol actualizado correctamente a: ${newRole === 'admin' ? 'Administrador' : 'Usuario'}`)
    loadUsers()
  }

  async function deleteUser(userId: string, userName: string) {
    if (!confirm(`¿Estás seguro de eliminar al usuario "${userName}"? Esta acción no se puede deshacer y eliminará todas sus predicciones.`)) {
      return
    }

    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(`Error al eliminar usuario: ${data.error}`)
      return
    }

    alert(`Usuario "${userName}" eliminado correctamente`)
    loadUsers()
  }

  if (loading) return <div className="text-center py-12">Cargando...</div>

  const userCount = users.length
  const adminCount = users.filter(u => u.role === 'admin').length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h2>
        <div className="flex items-center gap-4 mt-1">
          <p className="text-slate-600">{userCount} usuarios registrados</p>
          <span className="text-slate-400">•</span>
          <p className={`font-semibold ${adminCount >= 3 ? 'text-red-600' : 'text-slate-600'}`}>
            {adminCount}/3 administradores
          </p>
        </div>
      </div>

      {adminCount >= 3 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Límite alcanzado:</strong> Ya hay 3 administradores activos. Para asignar admin a otro usuario, primero debes quitar el rol de uno existente.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-red-600 text-white">
            <tr>
              <th className="px-6 py-4 text-left">Nombre</th>
              <th className="px-6 py-4 text-left">Email</th>
              <th className="px-6 py-4 text-center">Rol</th>
              <th className="px-6 py-4 text-center">Puntos</th>
              <th className="px-6 py-4 text-left">Registro</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-slate-800 font-semibold">{user.display_name}</td>
                <td className="px-6 py-4 text-slate-600">{user.email}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    user.role === 'admin'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-center font-bold text-red-600">{user.total_points}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">
                  {new Date(user.created_at).toLocaleDateString('es-CO')}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => toggleAdminRole(user.id, user.role)}
                      disabled={user.id === currentUserId || (user.role !== 'admin' && adminCount >= 3)}
                      className={`px-3 py-2 rounded-lg font-semibold text-xs transition-colors ${
                        (user.id === currentUserId || (user.role !== 'admin' && adminCount >= 3))
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : user.role === 'admin'
                            ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                      title={
                        user.id === currentUserId
                          ? 'No puedes modificar tu propio rol'
                          : (user.role !== 'admin' && adminCount >= 3)
                            ? 'Límite de 3 administradores alcanzado'
                            : ''
                      }
                    >
                      {user.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                    </button>
                    <button
                      onClick={() => deleteUser(user.id, user.display_name)}
                      disabled={user.id === currentUserId}
                      className="px-3 py-2 rounded-lg font-semibold text-xs bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Tab 4: Ranking with Breakdown
function RankingTab() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [userBreakdown, setUserBreakdown] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    loadRanking()
  }, [])

  async function loadRanking() {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, total_points')
      .order('total_points', { ascending: false })

    if (data) setProfiles(data)
    setLoading(false)
  }

  async function recalculateAllPoints() {
    if (!confirm('¿Recalcular puntos de TODOS los usuarios? Esto puede tomar varios segundos.')) {
      return
    }

    setRecalculating(true)
    try {
      const res = await fetch('/api/admin/recalculate-points', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')
      alert(`Puntos recalculados para ${data.count} usuarios`)
      await loadRanking()
    } catch (error) {
      console.error('❌ Error recalculando puntos:', error)
      alert('Error al recalcular puntos: ' + JSON.stringify(error))
    } finally {
      setRecalculating(false)
    }
  }

  async function toggleUserBreakdown(userId: string) {
    if (expandedUser === userId) {
      setExpandedUser(null)
      setUserBreakdown(null)
      return
    }

    setExpandedUser(userId)

    // Load all predictions paginando (Supabase limita 1000/página)
    let allPredictions: any[] = []
    for (let page = 0; page < 10; page++) {
      const { data: batch } = await supabase
        .from('predictions')
        .select(`
          id,
          user_id,
          match_id,
          points_earned,
          pred_home,
          pred_away,
          match:matches!inner(
            id,
            phase,
            group_id,
            home_team_id,
            away_team_id,
            home_score,
            away_score,
            winner_team_id
          )
        `)
        .eq('calculated', true)
        .order('match_id').order('user_id')
        .range(page * 1000, (page + 1) * 1000 - 1)
      if (!batch || batch.length === 0) break
      allPredictions = allPredictions.concat(batch)
      if (batch.length < 1000) break
    }

    // Compute group standings dynamically from completed matches
    const { data: completedGroupMatchesBD } = await supabase
      .from('matches')
      .select('group_id, home_team_id, away_team_id, home_score, away_score')
      .eq('phase', 'groups')
      .not('home_score', 'is', null)
      .not('away_score', 'is', null)

    const dynamicStandingsBD = new Map<string, Array<{team_id: number, position: number}>>()
    'ABCDEFGHIJKL'.split('').forEach(groupId => {
      const gMatches = completedGroupMatchesBD?.filter((m: any) => m.group_id === groupId) || []
      if (gMatches.length < 6) return
      const teamStats: Record<number, {pts: number, gf: number, gc: number}> = {}
      gMatches.forEach((m: any) => {
        if (!teamStats[m.home_team_id]) teamStats[m.home_team_id] = {pts: 0, gf: 0, gc: 0}
        if (!teamStats[m.away_team_id]) teamStats[m.away_team_id] = {pts: 0, gf: 0, gc: 0}
        teamStats[m.home_team_id].gf += m.home_score
        teamStats[m.home_team_id].gc += m.away_score
        teamStats[m.away_team_id].gf += m.away_score
        teamStats[m.away_team_id].gc += m.home_score
        if (m.home_score > m.away_score) teamStats[m.home_team_id].pts += 3
        else if (m.home_score < m.away_score) teamStats[m.away_team_id].pts += 3
        else { teamStats[m.home_team_id].pts += 1; teamStats[m.away_team_id].pts += 1 }
      })
      dynamicStandingsBD.set(groupId, Object.entries(teamStats)
        .map(([tid, s]) => ({team_id: Number(tid), pts: s.pts, gf: s.gf, gd: s.gf - s.gc}))
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
        .map((t, i) => ({team_id: t.team_id, position: i + 1})))
    })

    // Load breakdown for this user
    const userPredictions = allPredictions?.filter(p => p.user_id === userId) || []

    const { data: specialPreds } = await supabase
      .from('special_predictions')
      .select('*')
      .eq('user_id', userId)

    // Group predictions by match_id to identify unique exact scores
    const predictionsByMatch = new Map<number, any[]>()
    allPredictions?.forEach((pred: any) => {
      const matchId = pred.match.id
      if (!predictionsByMatch.has(matchId)) {
        predictionsByMatch.set(matchId, [])
      }
      predictionsByMatch.get(matchId)!.push(pred)
    })

    // Count unique predictions for this user
    let uniqueCount = 0
    predictionsByMatch.forEach((predictions, matchId) => {
      const exactScorePreds = predictions.filter(
        (p) =>
          p.match.home_score !== null &&
          p.match.away_score !== null &&
          p.pred_home === p.match.home_score &&
          p.pred_away === p.match.away_score
      )
      if (exactScorePreds.length === 1 && exactScorePreds[0].user_id === userId) {
        uniqueCount++
      }
    })

    // Calculate breakdown
    let exactScore = 0
    let correctResult = 0
    let correctGoal = 0
    let correctQualifier = 0

    userPredictions.forEach((pred: any) => {
      if (pred.match.phase === 'groups') {
        // Group stage - check each condition directly
        const isExactScore =
          pred.pred_home === pred.match.home_score &&
          pred.pred_away === pred.match.away_score

        const homeGoalCorrect = pred.pred_home === pred.match.home_score
        const awayGoalCorrect = pred.pred_away === pred.match.away_score

        const actualResult =
          pred.match.home_score > pred.match.away_score ? 'home' :
          pred.match.home_score < pred.match.away_score ? 'away' : 'draw'
        const predictedResult =
          pred.pred_home > pred.pred_away ? 'home' :
          pred.pred_home < pred.pred_away ? 'away' : 'draw'
        const correctWinner = actualResult === predictedResult

        // Add points to respective categories
        if (isExactScore) {
          exactScore += 3
        }
        if (homeGoalCorrect) {
          correctGoal += 1
        }
        if (awayGoalCorrect) {
          correctGoal += 1
        }
        if (correctWinner) {
          correctResult += 2
        }
      } else {
        // Knockout stage
        const isExactScore =
          pred.match.home_score !== null &&
          pred.match.away_score !== null &&
          pred.pred_home === pred.match.home_score &&
          pred.pred_away === pred.match.away_score

        const predictedWinner =
          pred.pred_home > pred.pred_away
            ? pred.match.home_team_id
            : pred.match.away_team_id

        const correctWinner = predictedWinner === pred.match.winner_team_id

        if (correctWinner) {
          correctQualifier += 3
        }
        if (isExactScore) {
          exactScore += 3
        }
      }
    })

    const uniquePredictions = uniqueCount * 5

    // Calculate group order bonus based on manual position predictions
    let groupOrderBonus = 0
    const { data: userPositionPredictionsBD } = await supabase
      .from('group_position_predictions')
      .select('group_id, team_id, predicted_position')
      .eq('user_id', userId)

    'ABCDEFGHIJKL'.split('').forEach((groupId) => {
      const groupStandings = dynamicStandingsBD.get(groupId)
      if (!groupStandings) return

      const groupPosPreds = userPositionPredictionsBD?.filter(
        (pp: any) => pp.group_id === groupId
      ) || []
      if (groupPosPreds.length < 4) return

      let allMatch = true
      for (let position = 1; position <= 4; position++) {
        const realTeamId = groupStandings.find(s => s.position === position)?.team_id
        const predTeamId = groupPosPreds.find((pp: any) => pp.predicted_position === position)?.team_id
        if (!realTeamId || !predTeamId || realTeamId !== predTeamId) {
          allMatch = false
          break
        }
      }
      if (allMatch) groupOrderBonus += 3
    })

    // Get special predictions points by type
    const champion = specialPreds?.find(sp => sp.type === 'champion')?.points_earned || 0
    const runnerUp = specialPreds?.find(sp => sp.type === 'runner_up')?.points_earned || 0
    const thirdPlace = specialPreds?.find(sp => sp.type === 'third_place')?.points_earned || 0
    const mvp = specialPreds?.find(sp => sp.type === 'mvp')?.points_earned || 0
    const topScorer = specialPreds?.find(sp => sp.type === 'top_scorer')?.points_earned || 0

    const groupPoints = exactScore + correctResult + correctGoal
    const eliminationPoints = correctQualifier
    const specialPoints = champion + runnerUp + thirdPlace + mvp + topScorer

    setUserBreakdown({
      exactScore,
      correctResult,
      correctGoal,
      correctQualifier,
      uniquePredictions,
      groupOrderBonus,
      champion,
      runnerUp,
      thirdPlace,
      mvp,
      topScorer,
      groupPoints,
      eliminationPoints,
      specialPoints,
      total: groupPoints + eliminationPoints + specialPoints + uniquePredictions + groupOrderBonus,
    })
  }

  if (loading) return <div className="text-center py-12">Cargando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Ranking Global</h2>
        <button
          onClick={recalculateAllPoints}
          disabled={recalculating}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
        >
          {recalculating ? (
            <>
              <span className="animate-spin">🔄</span>
              Recalculando...
            </>
          ) : (
            <>
              🔄 Recalcular Puntos
            </>
          )}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-red-600 text-white">
            <tr>
              <th className="px-6 py-4 text-left">Posición</th>
              <th className="px-6 py-4 text-left">Nombre</th>
              <th className="px-6 py-4 text-center">Puntos Totales</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {profiles.map((profile, idx) => (
              <Fragment key={profile.id}>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className="text-2xl">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-800 font-semibold">{profile.display_name}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-lg font-bold text-red-600">{profile.total_points}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleUserBreakdown(profile.id)}
                      className="text-red-600 hover:text-red-700 font-semibold text-sm"
                    >
                      {expandedUser === profile.id ? '▼ Ocultar' : '▶ Ver desglose'}
                    </button>
                  </td>
                </tr>
                {expandedUser === profile.id && userBreakdown && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 bg-red-50">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-slate-800 mb-3">Desglose de puntos</h4>
                        <div className="grid grid-cols-6 gap-3">
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">Marcador Exacto</p>
                            <p className="text-xl font-bold text-slate-800">{userBreakdown.exactScore}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">Ganador Acertado</p>
                            <p className="text-xl font-bold text-slate-800">{userBreakdown.correctResult}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">Gol Acertado</p>
                            <p className="text-xl font-bold text-slate-800">{userBreakdown.correctGoal}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">Predicción Única</p>
                            <p className="text-xl font-bold text-slate-800">{userBreakdown.uniquePredictions}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">Bono Orden Grupo</p>
                            <p className="text-xl font-bold text-slate-800">{userBreakdown.groupOrderBonus}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">Clasificado Acertado</p>
                            <p className="text-xl font-bold text-slate-800">{userBreakdown.correctQualifier}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">Campeón</p>
                            <p className="text-xl font-bold text-slate-800">{userBreakdown.champion}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">Subcampeón</p>
                            <p className="text-xl font-bold text-slate-800">{userBreakdown.runnerUp}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">3er Lugar</p>
                            <p className="text-xl font-bold text-slate-800">{userBreakdown.thirdPlace}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">MVP</p>
                            <p className="text-xl font-bold text-slate-800">{userBreakdown.mvp}</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">Goleador</p>
                            <p className="text-xl font-bold text-slate-800">{userBreakdown.topScorer}</p>
                          </div>
                          <div className="bg-red-600 rounded-lg p-3 col-span-2">
                            <p className="text-xs text-white mb-1">Total General</p>
                            <p className="text-xl font-bold text-white">{userBreakdown.total}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ====================================
// ESPECIALES TAB
// ====================================
function SpecialsTab() {
  const [teams, setTeams] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [actualResults, setActualResults] = useState({
    champion: '',
    runner_up: '',
    third_place: '',
    mvp_first_name: '',
    mvp_last_name: '',
    mvp_country: '',
    top_scorer_first_name: '',
    top_scorer_last_name: '',
    top_scorer_country: '',
  })
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    // Load teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .order('name')

    if (teamsData) setTeams(teamsData)

    // Load existing actual results if any
    // We'll store these in a special table or use special_predictions with a specific user_id
    // For now, let's check if there's a config table or similar
  }

  async function saveSpecialResults() {
    setSaving(true)

    try {
      // Get all users' special predictions
      const { data: allPredictions, error: fetchError } = await supabase
        .from('special_predictions')
        .select('*')

      if (fetchError) throw fetchError

      // Group predictions by user
      const userPredictions = new Map<string, any[]>()
      allPredictions?.forEach((pred) => {
        if (!userPredictions.has(pred.user_id)) {
          userPredictions.set(pred.user_id, [])
        }
        userPredictions.get(pred.user_id)!.push(pred)
      })

      // Calculate points for each user
      const updates: any[] = []

      // Define deadlines for progressive point system (Colombia timezone)
      const firstMatchDeadline = new Date('2026-06-11T14:00:00-05:00') // 11 jun, 2pm Colombia — para MVP y goleador
      const teamPredDeadline = new Date('2026-06-11T23:59:59-05:00')   // 11 jun, fin del día — para campeón/sub/tercero
      const knockoutStartDeadline = new Date('2026-06-28T00:00:00-05:00') // 28 jun, inicio eliminatorias

      for (const [userId, predictions] of userPredictions.entries()) {
        let championPoints = 0
        let runnerUpPoints = 0
        let thirdPlacePoints = 0
        let mvpPoints = 0
        let topScorerPoints = 0

        predictions.forEach((pred) => {
          const predictionTime = new Date(pred.updated_at || pred.created_at)
          const beforeTeamDeadline = predictionTime < teamPredDeadline     // puntos completos campeón/sub/tercero
          const beforeKnockouts = predictionTime < knockoutStartDeadline   // mitad de puntos
          const beforeTournament = predictionTime < firstMatchDeadline     // puntos completos MVP/goleador

          if (pred.type === 'champion' && pred.value === actualResults.champion && actualResults.champion) {
            // Campeón: 20pts hasta fin del 11 jun, 10pts hasta knockouts
            championPoints = beforeTeamDeadline ? 20 : beforeKnockouts ? 10 : 0
          } else if (pred.type === 'runner_up' && pred.value === actualResults.runner_up && actualResults.runner_up) {
            // Subcampeón: 12pts hasta fin del 11 jun, 6pts hasta knockouts
            runnerUpPoints = beforeTeamDeadline ? 12 : beforeKnockouts ? 6 : 0
          } else if (pred.type === 'third_place' && pred.value === actualResults.third_place && actualResults.third_place) {
            // Tercer lugar: 12pts hasta fin del 11 jun, 6pts hasta knockouts
            thirdPlacePoints = beforeTeamDeadline ? 12 : beforeKnockouts ? 6 : 0
          } else if (pred.type === 'mvp' && actualResults.mvp_first_name && actualResults.mvp_last_name) {
            // MVP: 10pts antes del primer partido, 0 después
            if (beforeTournament) {
              try {
                const mvpPred = JSON.parse(pred.value)
                if (
                  mvpPred.first_name?.toLowerCase() === actualResults.mvp_first_name.toLowerCase() &&
                  mvpPred.last_name?.toLowerCase() === actualResults.mvp_last_name.toLowerCase() &&
                  mvpPred.country === actualResults.mvp_country
                ) {
                  mvpPoints = 10
                }
              } catch (e) {
                // Old format, skip
              }
            }
          } else if (pred.type === 'top_scorer' && actualResults.top_scorer_first_name && actualResults.top_scorer_last_name) {
            // Top scorer: 10pts before tournament only, locked after
            if (beforeTournament) {
              try {
                const scorerPred = JSON.parse(pred.value)
                if (
                  scorerPred.first_name?.toLowerCase() === actualResults.top_scorer_first_name.toLowerCase() &&
                  scorerPred.last_name?.toLowerCase() === actualResults.top_scorer_last_name.toLowerCase() &&
                  scorerPred.country === actualResults.top_scorer_country
                ) {
                  topScorerPoints = 10
                }
              } catch (e) {
                // Old format, skip
              }
            }
          }
        })

        // Update points for each prediction type
        predictions.forEach((pred) => {
          let points = 0
          if (pred.type === 'champion') points = championPoints
          else if (pred.type === 'runner_up') points = runnerUpPoints
          else if (pred.type === 'third_place') points = thirdPlacePoints
          else if (pred.type === 'mvp') points = mvpPoints
          else if (pred.type === 'top_scorer') points = topScorerPoints

          updates.push({
            id: pred.id,
            points_earned: points,
          })
        })
      }

      // Batch update all special predictions
      for (const update of updates) {
        await supabase
          .from('special_predictions')
          .update({ points_earned: update.points_earned })
          .eq('id', update.id)
      }

      // Compute group standings dynamically from completed matches
      const { data: completedGroupMatchesSP } = await supabase
        .from('matches')
        .select('group_id, home_team_id, away_team_id, home_score, away_score')
        .eq('phase', 'groups')
        .not('home_score', 'is', null)
        .not('away_score', 'is', null)

      const dynamicStandingsSP = new Map<string, Array<{team_id: number, position: number}>>()
      'ABCDEFGHIJKL'.split('').forEach(groupId => {
        const gMatches = completedGroupMatchesSP?.filter((m: any) => m.group_id === groupId) || []
        if (gMatches.length < 6) return
        const teamStats: Record<number, {pts: number, gf: number, gc: number}> = {}
        gMatches.forEach((m: any) => {
          if (!teamStats[m.home_team_id]) teamStats[m.home_team_id] = {pts: 0, gf: 0, gc: 0}
          if (!teamStats[m.away_team_id]) teamStats[m.away_team_id] = {pts: 0, gf: 0, gc: 0}
          teamStats[m.home_team_id].gf += m.home_score
          teamStats[m.home_team_id].gc += m.away_score
          teamStats[m.away_team_id].gf += m.away_score
          teamStats[m.away_team_id].gc += m.home_score
          if (m.home_score > m.away_score) teamStats[m.home_team_id].pts += 3
          else if (m.home_score < m.away_score) teamStats[m.away_team_id].pts += 3
          else { teamStats[m.home_team_id].pts += 1; teamStats[m.away_team_id].pts += 1 }
        })
        dynamicStandingsSP.set(groupId, Object.entries(teamStats)
          .map(([tid, s]) => ({team_id: Number(tid), pts: s.pts, gf: s.gf, gd: s.gf - s.gc}))
          .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
          .map((t, i) => ({team_id: t.team_id, position: i + 1})))
      })

      // Recalculate total points for all users
      const uniqueUsers = [...new Set(allPredictions.map(p => p.user_id))]
      for (const userId of uniqueUsers) {
        // Sum all match predictions
        const { data: userPreds } = await supabase
          .from('predictions')
          .select('points_earned')
          .eq('user_id', userId)

        const matchPoints = userPreds?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0

        // Sum all special predictions
        const { data: specialPreds } = await supabase
          .from('special_predictions')
          .select('points_earned')
          .eq('user_id', userId)

        const specialPoints = specialPreds?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0

        // Calculate group order bonus
        let groupOrderBonus = 0
        const { data: userPositionPredictionsSP } = await supabase
          .from('group_position_predictions')
          .select('group_id, team_id, predicted_position')
          .eq('user_id', userId)

        'ABCDEFGHIJKL'.split('').forEach((groupId) => {
          const groupStandings = dynamicStandingsSP.get(groupId)
          if (!groupStandings) return

          const groupPosPreds = userPositionPredictionsSP?.filter(
            (pp: any) => pp.group_id === groupId
          ) || []
          if (groupPosPreds.length < 4) return

          let allMatch = true
          for (let position = 1; position <= 4; position++) {
            const realTeamId = groupStandings.find(s => s.position === position)?.team_id
            const predTeamId = groupPosPreds.find((pp: any) => pp.predicted_position === position)?.team_id
            if (!realTeamId || !predTeamId || realTeamId !== predTeamId) {
              allMatch = false
              break
            }
          }
          if (allMatch) groupOrderBonus += 3
        })

        const totalPoints = matchPoints + specialPoints + groupOrderBonus

        await supabase
          .from('profiles')
          .update({ total_points: totalPoints })
          .eq('id', userId)
      }

      alert(`✅ Resultados guardados correctamente!\n\n${updates.length} predicciones actualizadas\n${uniqueUsers.length} usuarios recalculados`)

    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar los resultados: ' + (error as any).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Resultados de Predicciones Especiales</h2>
          <p className="text-slate-600 mt-1">
            Ingresa los resultados reales del torneo para calcular los puntos de las predicciones especiales
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Equipos - Campeón, Subcampeón, Tercer Puesto */}
        <div className="bg-white rounded-xl border border-red-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">🏆 Posiciones del Torneo</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🥇 Campeón
              </label>
              <select
                value={actualResults.champion}
                onChange={(e) => setActualResults({ ...actualResults, champion: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Seleccionar equipo...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.name}>
                    {team.flag_emoji} {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🥈 Subcampeón
              </label>
              <select
                value={actualResults.runner_up}
                onChange={(e) => setActualResults({ ...actualResults, runner_up: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Seleccionar equipo...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.name}>
                    {team.flag_emoji} {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🥉 Tercer Lugar
              </label>
              <select
                value={actualResults.third_place}
                onChange={(e) => setActualResults({ ...actualResults, third_place: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Seleccionar equipo...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.name}>
                    {team.flag_emoji} {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Jugadores - MVP y Goleador */}
        <div className="bg-white rounded-xl border border-red-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">⭐ Premios Individuales</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🌟 Mejor Jugador - MVP
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={actualResults.mvp_first_name}
                  onChange={(e) => setActualResults({ ...actualResults, mvp_first_name: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Nombre"
                />
                <input
                  type="text"
                  value={actualResults.mvp_last_name}
                  onChange={(e) => setActualResults({ ...actualResults, mvp_last_name: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Apellido"
                />
                <select
                  value={actualResults.mvp_country}
                  onChange={(e) => setActualResults({ ...actualResults, mvp_country: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">País...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.name}>
                      {team.flag_emoji} {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                ⚽ Máximo Goleador
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={actualResults.top_scorer_first_name}
                  onChange={(e) => setActualResults({ ...actualResults, top_scorer_first_name: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Nombre"
                />
                <input
                  type="text"
                  value={actualResults.top_scorer_last_name}
                  onChange={(e) => setActualResults({ ...actualResults, top_scorer_last_name: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Apellido"
                />
                <select
                  value={actualResults.top_scorer_country}
                  onChange={(e) => setActualResults({ ...actualResults, top_scorer_country: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">País...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.name}>
                      {team.flag_emoji} {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="bg-white rounded-xl border border-red-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-800">Guardar y Calcular Puntos</h4>
            <p className="text-sm text-slate-600 mt-1">
              Al guardar, se compararán todas las predicciones de los usuarios y se actualizarán los puntos automáticamente
            </p>
          </div>
          <button
            onClick={saveSpecialResults}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar Resultados'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ====================================
// GROUP STANDINGS TAB (AUTO-CALCULATED FROM REAL RESULTS)
// ====================================
function GroupStandingsTab() {
  const [teams, setTeams] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [standings, setStandings] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [teamsRes, matchesRes, standingsRes] = await Promise.all([
      supabase.from('teams').select('*').order('group_id'),
      supabase.from('matches').select('*').eq('phase', 'groups').order('match_number'),
      supabase.from('group_standings').select('*').order('group_id').order('position')
    ])

    if (teamsRes.data) setTeams(teamsRes.data)
    if (matchesRes.data) setMatches(matchesRes.data)
    if (standingsRes.data) setStandings(standingsRes.data)
  }

  // Calculate standings for a group based on real match results
  function calculateGroupStandings(groupId: string) {
    const groupTeams = teams.filter(t => t.group_id === groupId)
    const groupMatches = matches.filter(m => m.group_id === groupId)

    // Debug logging for Group A
    if (groupId === 'A') {
      console.log('=== DEBUG GRUPO A - ADMIN ===')
      console.log('Teams en grupo A:', groupTeams.length, groupTeams.map(t => ({ id: t.id, name: t.name })))
      console.log('Matches en grupo A:', groupMatches.length)
      console.log('Matches con scores:', groupMatches.map(m => ({
        id: m.id,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        home_score: m.home_score,
        away_score: m.away_score,
        group_id: m.group_id
      })))
    }

    const standings = groupTeams.map(team => {
      const teamMatches = groupMatches.filter(
        m => (m.home_team_id === team.id || m.away_team_id === team.id) &&
             m.home_score !== null && m.away_score !== null
      )

      if (groupId === 'A') {
        console.log(`Team ${team.name} (ID: ${team.id}): ${teamMatches.length} partidos con scores`)
      }

      let won = 0, drawn = 0, lost = 0, gf = 0, gc = 0

      teamMatches.forEach(match => {
        const isHome = match.home_team_id === team.id
        const teamScore = isHome ? match.home_score : match.away_score
        const oppScore = isHome ? match.away_score : match.home_score

        gf += teamScore
        gc += oppScore

        if (teamScore > oppScore) won++
        else if (teamScore === oppScore) drawn++
        else lost++
      })

      const points = won * 3 + drawn
      const gd = gf - gc
      const played = teamMatches.length

      if (groupId === 'A') {
        console.log(`${team.name}: PJ=${played}, G=${won}, E=${drawn}, P=${lost}, GF=${gf}, GC=${gc}, DG=${gd}, Pts=${points}`)
      }

      return { team, played, won, drawn, lost, gf, gc, gd, points }
    })

    // Sort by points, then goal difference, then goals for
    standings.sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points
      if (a.gd !== b.gd) return b.gd - a.gd
      return b.gf - a.gf
    })

    if (groupId === 'A') {
      console.log('Standings ordenados:', standings.map(s => ({ name: s.team.name, points: s.points, gd: s.gd })))
    }

    return standings
  }

  // Auto-save calculated standings to database
  async function updateGroupStandings(groupId: string) {
    setSaving(true)
    try {
      const calculatedStandings = calculateGroupStandings(groupId)

      // Get existing qualified status
      const existingStandings = standings.filter(s => s.group_id === groupId)

      // Delete all existing standings for this group
      await supabase
        .from('group_standings')
        .delete()
        .eq('group_id', groupId)

      // Insert new calculated standings (preserving qualified status if exists)
      const newStandings = calculatedStandings.map((standing, index) => {
        const existing = existingStandings.find(s => s.team_id === standing.team.id)
        return {
          group_id: groupId,
          position: index + 1,
          team_id: standing.team.id,
          qualified: existing?.qualified || false
        }
      })

      const { error } = await supabase
        .from('group_standings')
        .insert(newStandings)

      if (error) throw error

      await loadData()
      await recalculateGroupOrderBonuses()

      alert(`Tabla del Grupo ${groupId} actualizada correctamente`)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar: ' + JSON.stringify(error))
    } finally {
      setSaving(false)
    }
  }

  // Update qualified status for a team
  async function toggleQualified(groupId: string, teamId: number, currentQualified: boolean) {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('group_standings')
        .update({ qualified: !currentQualified })
        .eq('group_id', groupId)
        .eq('team_id', teamId)

      if (error) throw error

      await loadData()
      await recalculateGroupOrderBonuses()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar: ' + JSON.stringify(error))
    } finally {
      setSaving(false)
    }
  }

  async function recalculateGroupOrderBonuses() {
    try {
      const { data: completedGroupMatchesGB } = await supabase
        .from('matches')
        .select('group_id, home_team_id, away_team_id, home_score, away_score')
        .eq('phase', 'groups')
        .not('home_score', 'is', null)
        .not('away_score', 'is', null)

      const dynamicStandingsGB = new Map<string, Array<{team_id: number, position: number}>>()
      'ABCDEFGHIJKL'.split('').forEach(groupId => {
        const gMatches = completedGroupMatchesGB?.filter((m: any) => m.group_id === groupId) || []
        if (gMatches.length < 6) return
        const teamStats: Record<number, {pts: number, gf: number, gc: number}> = {}
        gMatches.forEach((m: any) => {
          if (!teamStats[m.home_team_id]) teamStats[m.home_team_id] = {pts: 0, gf: 0, gc: 0}
          if (!teamStats[m.away_team_id]) teamStats[m.away_team_id] = {pts: 0, gf: 0, gc: 0}
          teamStats[m.home_team_id].gf += m.home_score
          teamStats[m.home_team_id].gc += m.away_score
          teamStats[m.away_team_id].gf += m.away_score
          teamStats[m.away_team_id].gc += m.home_score
          if (m.home_score > m.away_score) teamStats[m.home_team_id].pts += 3
          else if (m.home_score < m.away_score) teamStats[m.away_team_id].pts += 3
          else { teamStats[m.home_team_id].pts += 1; teamStats[m.away_team_id].pts += 1 }
        })
        dynamicStandingsGB.set(groupId, Object.entries(teamStats)
          .map(([tid, s]) => ({team_id: Number(tid), pts: s.pts, gf: s.gf, gd: s.gf - s.gc}))
          .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
          .map((t, i) => ({team_id: t.team_id, position: i + 1})))
      })

      const { data: allUsers } = await supabase.from('profiles').select('id')
      if (!allUsers) return

      for (const user of allUsers) {
        const { data: userPreds } = await supabase
          .from('predictions')
          .select('points_earned')
          .eq('user_id', user.id)

        const matchPoints = userPreds?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0

        const { data: specialPreds } = await supabase
          .from('special_predictions')
          .select('points_earned')
          .eq('user_id', user.id)

        const specialPoints = specialPreds?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0

        let groupOrderBonus = 0
        const { data: userPositionPredictions } = await supabase
          .from('group_position_predictions')
          .select('group_id, team_id, predicted_position')
          .eq('user_id', user.id)

        'ABCDEFGHIJKL'.split('').forEach((groupId) => {
          const groupStandings = dynamicStandingsGB.get(groupId)
          if (!groupStandings) return

          const groupPosPreds = userPositionPredictions?.filter(
            (pp: any) => pp.group_id === groupId
          ) || []
          if (groupPosPreds.length < 4) return

          let allMatch = true
          for (let position = 1; position <= 4; position++) {
            const realTeamId = groupStandings.find(s => s.position === position)?.team_id
            const predTeamId = groupPosPreds.find((pp: any) => pp.predicted_position === position)?.team_id
            if (!realTeamId || !predTeamId || realTeamId !== predTeamId) {
              allMatch = false
              break
            }
          }
          if (allMatch) groupOrderBonus += 3
        })

        const totalPoints = matchPoints + specialPoints + groupOrderBonus

        await supabase
          .from('profiles')
          .update({ total_points: totalPoints })
          .eq('id', user.id)
      }
    } catch (error) {
      console.error('Error recalculando bonos de grupo:', error)
    }
  }

  const groupedStandings = GROUPS.reduce((acc, groupId) => {
    acc[groupId] = standings.filter(s => s.group_id === groupId)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Tablas de Grupos (Auto-calculadas)</h2>
        <p className="text-slate-600 mt-1">
          Las tablas se calculan automáticamente basándose en los resultados reales ingresados en Admin/Partidos.
          Solo puedes marcar qué equipos clasifican.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {GROUPS.map(groupId => {
          const calculatedStandings = calculateGroupStandings(groupId)
          const savedStandings = groupedStandings[groupId] || []

          return (
            <div key={groupId} className="bg-white rounded-xl border border-red-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-red-600">Grupo {groupId}</h3>
                <button
                  onClick={() => updateGroupStandings(groupId)}
                  disabled={saving || calculatedStandings.length === 0}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded disabled:opacity-50"
                >
                  Actualizar Tabla
                </button>
              </div>

              {calculatedStandings.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No hay resultados para este grupo aún</p>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-12 gap-1 text-xs font-semibold text-slate-600 border-b pb-1">
                    <div className="col-span-1">Pos</div>
                    <div className="col-span-5">Equipo</div>
                    <div className="col-span-1 text-center">PJ</div>
                    <div className="col-span-1 text-center">DG</div>
                    <div className="col-span-2 text-center">Pts</div>
                    <div className="col-span-2 text-center">Q</div>
                  </div>

                  {calculatedStandings.map((standing, idx) => {
                    const savedStanding = savedStandings.find(s => s.team_id === standing.team.id)
                    const isQualified = savedStanding?.qualified || false

                    return (
                      <div key={standing.team.id} className="grid grid-cols-12 gap-1 text-sm items-center py-1">
                        <div className="col-span-1 font-semibold text-slate-600">{idx + 1}°</div>
                        <div className="col-span-5 truncate">{standing.team.flag_emoji} {standing.team.name}</div>
                        <div className="col-span-1 text-center text-slate-600">{standing.played}</div>
                        <div className="col-span-1 text-center text-slate-600">{standing.gd > 0 ? `+${standing.gd}` : standing.gd}</div>
                        <div className="col-span-2 text-center font-bold">{standing.points}</div>
                        <div className="col-span-2 text-center">
                          <input
                            type="checkbox"
                            checked={isQualified}
                            onChange={() => toggleQualified(groupId, standing.team.id, isQualified)}
                            disabled={saving || !savedStanding}
                            className="w-4 h-4"
                            title="Clasificó a octavos"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-2 text-xs text-slate-500">
                <p>• Haz clic en "Actualizar Tabla" para guardar las posiciones actuales</p>
                <p>• Marca la casilla "Q" para indicar qué equipos clasifican</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
