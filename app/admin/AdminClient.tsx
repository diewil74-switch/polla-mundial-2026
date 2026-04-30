'use client'

import { useState, useEffect, Fragment } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateMatchPoints } from '@/lib/scoring'
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

  const tabs = [
    { id: 'results', label: 'Resultados', icon: '⚽' },
    { id: 'bracket', label: 'Bracket', icon: '🏆' },
    { id: 'groups', label: 'Grupos', icon: '📋' },
    { id: 'specials', label: 'Especiales', icon: '🌟' },
    { id: 'users', label: 'Usuarios', icon: '👥' },
    { id: 'ranking', label: 'Ranking', icon: '📊' },
  ]

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
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  Salir
                </button>
              </form>
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

      // Recalculate predictions (set points to 0)
      const { error: predError } = await supabase
        .from('predictions')
        .update({ points_earned: 0, calculated: false })
        .eq('match_id', matchId)

      if (predError) {
        console.error('Error al recalcular predicciones:', predError)
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
        .select('user_id, pred_home, pred_away')
        .eq('match_id', matchId)

      if (predError) {
        console.error('Error al cargar predicciones:', predError)
        alert('Resultado guardado pero hubo un error al recalcular puntos')
        setSaving(null)
        loadMatches()
        return
      }

      if (predictions && predictions.length > 0) {
        for (const pred of predictions) {
          const points = calculateMatchPoints(
            { ...match, home_score: homeScore, away_score: awayScore, winner_team_id: winnerId },
            { pred_home: pred.pred_home, pred_away: pred.pred_away }
          )

          await supabase
            .from('predictions')
            .update({ points_earned: points, calculated: true })
            .eq('match_id', matchId)
            .eq('user_id', pred.user_id)
        }

        // Load real group standings and teams for group order bonus calculation
        const { data: realStandings } = await supabase
          .from('group_standings')
          .select('*')
          .order('group_id')
          .order('position')

        const { data: allTeams } = await supabase
          .from('teams')
          .select('*')
          .order('group_id')

        // Recalculate total points for each user
        const uniqueUsers = [...new Set(predictions.map(p => p.user_id))]
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
          if (realStandings && realStandings.length > 0 && allTeams) {
            const { data: userGroupPredictions } = await supabase
              .from('predictions')
              .select(`
                *,
                match:matches!inner(
                  id,
                  phase,
                  group_id,
                  home_team_id,
                  away_team_id
                )
              `)
              .eq('user_id', userId)
              .eq('match.phase', 'groups')

            const groups = 'ABCDEFGHIJKL'.split('')

            groups.forEach((groupId) => {
              const groupTeams = allTeams.filter((t: any) => t.group_id === groupId)
              const groupPredictions = userGroupPredictions?.filter(
                (p: any) => p.match?.group_id === groupId
              ) || []

              const predictedStandings = groupTeams.map((team: any) => {
                const teamPreds = groupPredictions.filter(
                  (p: any) => p.match.home_team_id === team.id || p.match.away_team_id === team.id
                )

                let won = 0, drawn = 0, lost = 0, gf = 0, gc = 0

                teamPreds.forEach((p: any) => {
                  const isHome = p.match.home_team_id === team.id
                  const teamScore = isHome ? p.pred_home : p.pred_away
                  const oppScore = isHome ? p.pred_away : p.pred_home

                  gf += teamScore
                  gc += oppScore

                  if (teamScore > oppScore) won++
                  else if (teamScore === oppScore) drawn++
                  else lost++
                })

                const points = won * 3 + drawn
                const gd = gf - gc

                return { teamId: team.id, points, gd, gf }
              })

              predictedStandings.sort((a, b) => {
                if (a.points !== b.points) return b.points - a.points
                if (a.gd !== b.gd) return b.gd - a.gd
                return b.gf - a.gf
              })

              const groupRealStandings = realStandings.filter((s: any) => s.group_id === groupId)

              if (groupRealStandings.length >= 2 && predictedStandings.length >= 2) {
                const realFirst = groupRealStandings.find((s: any) => s.position === 1)
                const realSecond = groupRealStandings.find((s: any) => s.position === 2)

                const predFirst = predictedStandings[0]?.teamId
                const predSecond = predictedStandings[1]?.teamId

                if (
                  realFirst &&
                  realSecond &&
                  predFirst === realFirst.team_id &&
                  predSecond === realSecond.team_id
                ) {
                  groupOrderBonus += 5
                }
              }
            })
          }

          const totalPoints = matchPoints + specialPoints + groupOrderBonus

          await supabase
            .from('profiles')
            .update({ total_points: totalPoints })
            .eq('id', userId)
        }

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

      if (!matchesWithResults || matchesWithResults.length === 0) {
        alert('No hay partidos con resultados para recalcular')
        setRecalculating(false)
        return
      }

      let totalPredictionsRecalculated = 0

      // Recalculate each match
      for (const match of matchesWithResults) {
        const { data: predictions } = await supabase
          .from('predictions')
          .select('user_id, pred_home, pred_away')
          .eq('match_id', match.id)

        if (predictions && predictions.length > 0) {
          for (const pred of predictions) {
            const points = calculateMatchPoints(match, {
              pred_home: pred.pred_home,
              pred_away: pred.pred_away,
            })

            await supabase
              .from('predictions')
              .update({ points_earned: points, calculated: true })
              .eq('match_id', match.id)
              .eq('user_id', pred.user_id)
          }
          totalPredictionsRecalculated += predictions.length
        }
      }

      // Load real group standings and teams for group order bonus calculation
      const { data: realStandings } = await supabase
        .from('group_standings')
        .select('*')
        .order('group_id')
        .order('position')

      const { data: allTeams } = await supabase
        .from('teams')
        .select('*')
        .order('group_id')

      // Recalculate total points for all users
      const { data: allUsers } = await supabase.from('profiles').select('id')

      if (allUsers) {
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

          // Calculate group order bonus
          let groupOrderBonus = 0
          if (realStandings && realStandings.length > 0 && allTeams) {
            const { data: userGroupPredictions } = await supabase
              .from('predictions')
              .select(`
                *,
                match:matches!inner(
                  id,
                  phase,
                  group_id,
                  home_team_id,
                  away_team_id
                )
              `)
              .eq('user_id', user.id)
              .eq('match.phase', 'groups')

            const groups = 'ABCDEFGHIJKL'.split('')

            groups.forEach((groupId) => {
              const groupTeams = allTeams.filter((t: any) => t.group_id === groupId)
              const groupPredictions = userGroupPredictions?.filter(
                (p: any) => p.match?.group_id === groupId
              ) || []

              const predictedStandings = groupTeams.map((team: any) => {
                const teamPreds = groupPredictions.filter(
                  (p: any) => p.match.home_team_id === team.id || p.match.away_team_id === team.id
                )

                let won = 0, drawn = 0, lost = 0, gf = 0, gc = 0

                teamPreds.forEach((p: any) => {
                  const isHome = p.match.home_team_id === team.id
                  const teamScore = isHome ? p.pred_home : p.pred_away
                  const oppScore = isHome ? p.pred_away : p.pred_home

                  gf += teamScore
                  gc += oppScore

                  if (teamScore > oppScore) won++
                  else if (teamScore === oppScore) drawn++
                  else lost++
                })

                const points = won * 3 + drawn
                const gd = gf - gc

                return { teamId: team.id, points, gd, gf }
              })

              predictedStandings.sort((a, b) => {
                if (a.points !== b.points) return b.points - a.points
                if (a.gd !== b.gd) return b.gd - a.gd
                return b.gf - a.gf
              })

              const groupRealStandings = realStandings.filter((s: any) => s.group_id === groupId)

              if (groupRealStandings.length >= 2 && predictedStandings.length >= 2) {
                const realFirst = groupRealStandings.find((s: any) => s.position === 1)
                const realSecond = groupRealStandings.find((s: any) => s.position === 2)

                const predFirst = predictedStandings[0]?.teamId
                const predSecond = predictedStandings[1]?.teamId

                if (
                  realFirst &&
                  realSecond &&
                  predFirst === realFirst.team_id &&
                  predSecond === realSecond.team_id
                ) {
                  groupOrderBonus += 5
                }
              }
            })
          }

          await supabase
            .from('profiles')
            .update({ total_points: matchPoints + specialPoints + groupOrderBonus })
            .eq('id', user.id)
        }
      }

      alert(`✅ Recálculo completado!\n\n${matchesWithResults.length} partidos\n${totalPredictionsRecalculated} predicciones\n${allUsers?.length || 0} usuarios actualizados`)
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
    await supabase
      .from('matches')
      .update({ winner_team_id: winnerId })
      .eq('id', matchId)

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

  // Determine which match number comes next in bracket
  function getNextMatchNumber(currentMatchNumber: number): number | null {
    // Dieciseisavos/R32 (73-88) → Octavos/R16 (89-96)
    if (currentMatchNumber >= 73 && currentMatchNumber <= 88) {
      return 89 + Math.floor((currentMatchNumber - 73) / 2)
    }
    // Octavos/R16 (89-96) → Cuartos/R8 (97-100)
    if (currentMatchNumber >= 89 && currentMatchNumber <= 96) {
      return 97 + Math.floor((currentMatchNumber - 89) / 2)
    }
    // Cuartos/R8 (97-100) → Semis (101-102)
    if (currentMatchNumber >= 97 && currentMatchNumber <= 100) {
      return 101 + Math.floor((currentMatchNumber - 97) / 2)
    }
    // Semis (101-102) → Final (104)
    if (currentMatchNumber >= 101 && currentMatchNumber <= 102) {
      return 104
    }
    // Final (104) has no next match
    if (currentMatchNumber === 104) {
      return null
    }
    // Tercer puesto (103) has no next match
    if (currentMatchNumber === 103) {
      return null
    }
    return null
  }

  // Determine if winner goes to home or away position in next match
  function getPositionInNextMatch(currentMatchNumber: number): 'home' | 'away' {
    // Odd match numbers go to home, even go to away
    return currentMatchNumber % 2 === 1 ? 'home' : 'away'
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
              {teams.map((team: any) => (
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
              {teams.map((team: any) => (
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

    // Delete user's predictions first
    await supabase
      .from('predictions')
      .delete()
      .eq('user_id', userId)

    // Delete user's special predictions
    await supabase
      .from('special_predictions')
      .delete()
      .eq('user_id', userId)

    // Delete profile
    await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

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

  async function toggleUserBreakdown(userId: string) {
    if (expandedUser === userId) {
      setExpandedUser(null)
      setUserBreakdown(null)
      return
    }

    setExpandedUser(userId)

    // Load all predictions to calculate unique predictions
    const { data: allPredictions } = await supabase
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

    // Load real group standings and teams for group order bonus
    const { data: realStandings } = await supabase
      .from('group_standings')
      .select('*')
      .order('group_id')
      .order('position')

    const { data: allTeams } = await supabase
      .from('teams')
      .select('*')
      .order('group_id')

    // Load breakdown for this user
    const userPredictions = allPredictions?.filter(p => p.user_id === userId) || []

    const { data: specialPreds } = await supabase
      .from('special_predictions')
      .select('*')
      .eq('user_id', userId)

    // Group predictions by match_id to identify unique exact scores
    const predictionsByMatch = new Map<number, any[]>()
    allPredictions?.forEach((pred) => {
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

    userPredictions.forEach((pred) => {
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

    // Calculate group order bonus
    let groupOrderBonus = 0
    if (realStandings && realStandings.length > 0 && allTeams) {
      const groups = 'ABCDEFGHIJKL'.split('')

      groups.forEach((groupId) => {
        // Get user's predicted standings for this group
        const groupTeams = allTeams.filter((t: any) => t.group_id === groupId)
        const groupPredictions = userPredictions.filter(
          (p) => p.match?.phase === 'groups' && p.match?.group_id === groupId
        )

        // Calculate predicted standings
        const predictedStandings = groupTeams.map((team: any) => {
          const teamPreds = groupPredictions.filter(
            (p) => p.match.home_team_id === team.id || p.match.away_team_id === team.id
          )

          let won = 0, drawn = 0, lost = 0, gf = 0, gc = 0

          teamPreds.forEach((p) => {
            const isHome = p.match.home_team_id === team.id
            const teamScore = isHome ? p.pred_home : p.pred_away
            const oppScore = isHome ? p.pred_away : p.pred_home

            gf += teamScore
            gc += oppScore

            if (teamScore > oppScore) won++
            else if (teamScore === oppScore) drawn++
            else lost++
          })

          const points = won * 3 + drawn
          const gd = gf - gc

          return { teamId: team.id, points, gd, gf }
        })

        // Sort by points, then goal difference, then goals for
        predictedStandings.sort((a, b) => {
          if (a.points !== b.points) return b.points - a.points
          if (a.gd !== b.gd) return b.gd - a.gd
          return b.gf - a.gf
        })

        // Get real standings for this group
        const groupRealStandings = realStandings.filter((s: any) => s.group_id === groupId)

        if (groupRealStandings.length >= 2 && predictedStandings.length >= 2) {
          // Get 1st and 2nd place from real standings
          const realFirst = groupRealStandings.find((s: any) => s.position === 1)
          const realSecond = groupRealStandings.find((s: any) => s.position === 2)

          // Check if user's prediction matches
          const predFirst = predictedStandings[0]?.teamId
          const predSecond = predictedStandings[1]?.teamId

          // Award bonus if 1st and 2nd positions match exactly
          if (
            realFirst &&
            realSecond &&
            predFirst === realFirst.team_id &&
            predSecond === realSecond.team_id
          ) {
            groupOrderBonus += 5
          }
        }
      })
    }

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
      <h2 className="text-2xl font-bold text-slate-800">Ranking Global</h2>

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
      const firstMatchDeadline = new Date('2026-06-11T14:00:00-05:00') // 11 jun, 2pm Colombia
      const knockoutStartDeadline = new Date('2026-06-28T00:00:00-05:00') // 28 jun, inicio ronda de 32

      for (const [userId, predictions] of userPredictions.entries()) {
        let championPoints = 0
        let runnerUpPoints = 0
        let thirdPlacePoints = 0
        let mvpPoints = 0
        let topScorerPoints = 0

        predictions.forEach((pred) => {
          // Determine points based on when prediction was created
          const predictionTime = new Date(pred.created_at)
          const beforeTournament = predictionTime < firstMatchDeadline
          const beforeKnockouts = predictionTime < knockoutStartDeadline

          if (pred.type === 'champion' && pred.value === actualResults.champion && actualResults.champion) {
            // Champion: 20pts before tournament, 10pts before knockouts
            championPoints = beforeTournament ? 20 : beforeKnockouts ? 10 : 0
          } else if (pred.type === 'runner_up' && pred.value === actualResults.runner_up && actualResults.runner_up) {
            // Runner-up: 12pts before tournament, 6pts before knockouts
            runnerUpPoints = beforeTournament ? 12 : beforeKnockouts ? 6 : 0
          } else if (pred.type === 'third_place' && pred.value === actualResults.third_place && actualResults.third_place) {
            // Third place: 12pts before tournament, 6pts before knockouts
            thirdPlacePoints = beforeTournament ? 12 : beforeKnockouts ? 6 : 0
          } else if (pred.type === 'mvp' && actualResults.mvp_first_name && actualResults.mvp_last_name) {
            // MVP: 10pts before tournament only, locked after
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

      // Load real group standings and teams for group order bonus calculation
      const { data: realStandings } = await supabase
        .from('group_standings')
        .select('*')
        .order('group_id')
        .order('position')

      const { data: allTeams } = await supabase
        .from('teams')
        .select('*')
        .order('group_id')

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
        if (realStandings && realStandings.length > 0 && allTeams) {
          const { data: userGroupPredictions } = await supabase
            .from('predictions')
            .select(`
              *,
              match:matches!inner(
                id,
                phase,
                group_id,
                home_team_id,
                away_team_id
              )
            `)
            .eq('user_id', userId)
            .eq('match.phase', 'groups')

          const groups = 'ABCDEFGHIJKL'.split('')

          groups.forEach((groupId) => {
            const groupTeams = allTeams.filter((t: any) => t.group_id === groupId)
            const groupPredictions = userGroupPredictions?.filter(
              (p: any) => p.match?.group_id === groupId
            ) || []

            const predictedStandings = groupTeams.map((team: any) => {
              const teamPreds = groupPredictions.filter(
                (p: any) => p.match.home_team_id === team.id || p.match.away_team_id === team.id
              )

              let won = 0, drawn = 0, lost = 0, gf = 0, gc = 0

              teamPreds.forEach((p: any) => {
                const isHome = p.match.home_team_id === team.id
                const teamScore = isHome ? p.pred_home : p.pred_away
                const oppScore = isHome ? p.pred_away : p.pred_home

                gf += teamScore
                gc += oppScore

                if (teamScore > oppScore) won++
                else if (teamScore === oppScore) drawn++
                else lost++
              })

              const points = won * 3 + drawn
              const gd = gf - gc

              return { teamId: team.id, points, gd, gf }
            })

            predictedStandings.sort((a, b) => {
              if (a.points !== b.points) return b.points - a.points
              if (a.gd !== b.gd) return b.gd - a.gd
              return b.gf - a.gf
            })

            const groupRealStandings = realStandings.filter((s: any) => s.group_id === groupId)

            if (groupRealStandings.length >= 2 && predictedStandings.length >= 2) {
              const realFirst = groupRealStandings.find((s: any) => s.position === 1)
              const realSecond = groupRealStandings.find((s: any) => s.position === 2)

              const predFirst = predictedStandings[0]?.teamId
              const predSecond = predictedStandings[1]?.teamId

              if (
                realFirst &&
                realSecond &&
                predFirst === realFirst.team_id &&
                predSecond === realSecond.team_id
              ) {
                groupOrderBonus += 5
              }
            }
          })
        }

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
// GROUP STANDINGS TAB
// ====================================
function GroupStandingsTab() {
  const [teams, setTeams] = useState<any[]>([])
  const [standings, setStandings] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const supabase = createClient()

  const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .order('name')

    const { data: standingsData } = await supabase
      .from('group_standings')
      .select('*')
      .order('group_id')
      .order('position')

    if (teamsData) setTeams(teamsData)
    if (standingsData) setStandings(standingsData)
  }

  async function saveGroupStanding(groupId: string, position: number, teamId: number, qualified: boolean) {
    const key = `${groupId}-${position}`
    setSaving(true)

    try {
      // Primero eliminar cualquier registro existente en esta posición
      await supabase
        .from('group_standings')
        .delete()
        .eq('group_id', groupId)
        .eq('position', position)

      // Luego insertar el nuevo registro
      const { error } = await supabase
        .from('group_standings')
        .insert({
          group_id: groupId,
          position,
          team_id: teamId,
          qualified,
        })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Recargar datos inmediatamente
      await loadData()

      // Recalcular puntos de todos los usuarios (bono de grupo puede haber cambiado)
      await recalculateGroupOrderBonuses()

      // Mostrar indicador de éxito temporal
      setSavedKey(key)
      setTimeout(() => setSavedKey(null), 1500)
    } catch (error) {
      console.error('Error al guardar:', error)
      alert('Error al guardar: ' + JSON.stringify(error))
    } finally {
      setSaving(false)
    }
  }

  async function recalculateGroupOrderBonuses() {
    try {
      // Load real group standings and teams
      const { data: realStandings } = await supabase
        .from('group_standings')
        .select('*')
        .order('group_id')
        .order('position')

      const { data: allTeams } = await supabase
        .from('teams')
        .select('*')
        .order('group_id')

      // Get all users
      const { data: allUsers } = await supabase.from('profiles').select('id')

      if (!allUsers || !realStandings || !allTeams) return

      // Recalculate for each user
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

        // Calculate group order bonus
        let groupOrderBonus = 0
        const { data: userGroupPredictions } = await supabase
          .from('predictions')
          .select(`
            *,
            match:matches!inner(
              id,
              phase,
              group_id,
              home_team_id,
              away_team_id
            )
          `)
          .eq('user_id', user.id)
          .eq('match.phase', 'groups')

        const groups = 'ABCDEFGHIJKL'.split('')

        groups.forEach((groupId) => {
          const groupTeams = allTeams.filter((t: any) => t.group_id === groupId)
          const groupPredictions = userGroupPredictions?.filter(
            (p: any) => p.match?.group_id === groupId
          ) || []

          const predictedStandings = groupTeams.map((team: any) => {
            const teamPreds = groupPredictions.filter(
              (p: any) => p.match.home_team_id === team.id || p.match.away_team_id === team.id
            )

            let won = 0, drawn = 0, lost = 0, gf = 0, gc = 0

            teamPreds.forEach((p: any) => {
              const isHome = p.match.home_team_id === team.id
              const teamScore = isHome ? p.pred_home : p.pred_away
              const oppScore = isHome ? p.pred_away : p.pred_home

              gf += teamScore
              gc += oppScore

              if (teamScore > oppScore) won++
              else if (teamScore === oppScore) drawn++
              else lost++
            })

            const points = won * 3 + drawn
            const gd = gf - gc

            return { teamId: team.id, points, gd, gf }
          })

          predictedStandings.sort((a, b) => {
            if (a.points !== b.points) return b.points - a.points
            if (a.gd !== b.gd) return b.gd - a.gd
            return b.gf - a.gf
          })

          const groupRealStandings = realStandings.filter((s: any) => s.group_id === groupId)

          if (groupRealStandings.length >= 2 && predictedStandings.length >= 2) {
            const realFirst = groupRealStandings.find((s: any) => s.position === 1)
            const realSecond = groupRealStandings.find((s: any) => s.position === 2)

            const predFirst = predictedStandings[0]?.teamId
            const predSecond = predictedStandings[1]?.teamId

            if (
              realFirst &&
              realSecond &&
              predFirst === realFirst.team_id &&
              predSecond === realSecond.team_id
            ) {
              groupOrderBonus += 5
            }
          }
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

  async function clearGroupStanding(groupId: string, position: number) {
    if (!confirm(`¿Estás seguro de que quieres borrar la posición ${position}° del Grupo ${groupId}?`)) {
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('group_standings')
        .delete()
        .eq('group_id', groupId)
        .eq('position', position)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Recargar datos
      await loadData()

      // Recalcular bonos
      await recalculateGroupOrderBonuses()
    } catch (error) {
      console.error('Error al borrar:', error)
      alert('Error al borrar: ' + JSON.stringify(error))
    } finally {
      setSaving(false)
    }
  }

  async function clearEntireGroup(groupId: string) {
    if (!confirm(`¿Estás seguro de que quieres borrar TODAS las posiciones del Grupo ${groupId}?`)) {
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('group_standings')
        .delete()
        .eq('group_id', groupId)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Recargar datos
      await loadData()

      // Recalcular bonos
      await recalculateGroupOrderBonuses()
    } catch (error) {
      console.error('Error al borrar:', error)
      alert('Error al borrar: ' + JSON.stringify(error))
    } finally {
      setSaving(false)
    }
  }

  const groupedStandings = GROUPS.reduce((acc, groupId) => {
    acc[groupId] = standings.filter(s => s.group_id === groupId)
    return acc
  }, {} as Record<string, any[]>)

  const groupTeams = GROUPS.reduce((acc, groupId) => {
    acc[groupId] = teams.filter(t => t.group_id === groupId)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Orden Real de Grupos</h2>
        <p className="text-slate-600 mt-1">
          Define el orden final real de cada grupo para calcular el bono por orden exacto (+5 pts)
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {GROUPS.map(groupId => {
          const groupStandings = groupedStandings[groupId] || []
          const groupTeamsList = groupTeams[groupId] || []

          return (
            <div key={groupId} className="bg-white rounded-xl border border-red-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-red-600">Grupo {groupId}</h3>
                {groupStandings.length > 0 && (
                  <button
                    onClick={() => clearEntireGroup(groupId)}
                    disabled={saving}
                    className="text-xs text-red-600 hover:text-red-800 underline disabled:opacity-50"
                  >
                    Limpiar grupo
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {[1, 2, 3, 4].map(position => {
                  const standing = groupStandings.find(s => s.position === position)
                  const key = `${groupId}-${position}`
                  const justSaved = savedKey === key

                  return (
                    <div key={position} className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-600 w-6">{position}°</span>
                      <select
                        value={standing?.team_id || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            const qualified = position <= 2 || (position === 3 && groupStandings.filter(s => s.qualified).length < 3)
                            saveGroupStanding(groupId, position, parseInt(e.target.value), qualified)
                          }
                        }}
                        disabled={saving}
                        className={`flex-1 px-3 py-2 border rounded-lg text-sm transition-colors disabled:opacity-50 ${
                          justSaved ? 'border-green-500 bg-green-50' : 'border-slate-300'
                        }`}
                      >
                        <option value="">Seleccionar equipo...</option>
                        {groupTeamsList.map((team: any) => (
                          <option key={team.id} value={team.id}>
                            {team.flag_emoji} {team.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="checkbox"
                        checked={standing?.qualified || false}
                        onChange={(e) => {
                          if (standing) {
                            saveGroupStanding(groupId, position, standing.team_id, e.target.checked)
                          }
                        }}
                        disabled={!standing || saving}
                        className="w-5 h-5"
                        title="Clasificó"
                      />
                      {standing ? (
                        <button
                          onClick={() => clearGroupStanding(groupId, position)}
                          disabled={saving}
                          className="text-red-600 hover:text-red-800 font-bold text-lg disabled:opacity-50"
                          title="Borrar esta posición"
                        >
                          ×
                        </button>
                      ) : justSaved ? (
                        <span className="text-green-600 font-bold w-6">✓</span>
                      ) : (
                        <span className="text-xs text-slate-400 w-6"></span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
