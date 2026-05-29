'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Profile = {
  id: string
  display_name: string
  email: string
  role: string
  total_points: number
}

type Match = {
  id: number
  match_number: number
  phase: string
  group_id: string | null
  home_team_id: number | null
  away_team_id: number | null
  home_team_label: string | null
  away_team_label: string | null
  match_date: string
  venue: string
  city: string
  home_score: number | null
  away_score: number | null
  winner_team_id: number | null
  status: string
  home_team?: Team
  away_team?: Team
}

type Team = {
  id: number
  name: string
  flag_emoji: string
  group_id: string
  confederation: string
}

type Prediction = {
  id: number
  match_id: number
  pred_home: number
  pred_away: number
  points_earned: number
}

type SpecialPrediction = {
  id: number
  type: string
  value: string
  points_earned: number
  deadline: string
  locked: boolean
}

export default function DashboardClient({ user, profile }: { user: User, profile: Profile | null }) {
  const [activeTab, setActiveTab] = useState('predictions')
  const [currentProfile, setCurrentProfile] = useState(profile)
  const router = useRouter()
  const supabase = createClient()

  const tabs = [
    { id: 'predictions', label: 'Predicciones', icon: '⚽' },
    { id: 'calendar', label: 'Calendario', icon: '📅' },
    { id: 'groups', label: 'Grupos', icon: '🏆' },
    { id: 'bracket', label: 'Bracket', icon: '🏅' },
    { id: 'ranking', label: 'Ranking', icon: '📊' },
    { id: 'resultados', label: 'Resultados', icon: '📋' },
    { id: 'estadisticas', label: 'Estadísticas', icon: '📈' },
    { id: 'special', label: 'Especiales', icon: '⭐' },
  ]

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const refreshProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setCurrentProfile(data as Profile)
      console.log('🔄 Profile actualizado:', data.total_points, 'pts')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-red-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                <span className="mr-2">⚽</span>
                Polla Mundial 2026
              </h1>
              <p className="text-sm text-slate-600 mt-1">Bienvenido, {currentProfile?.display_name}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{currentProfile?.total_points || 0}</p>
                  <p className="text-xs text-slate-600">Puntos</p>
                </div>
                <button
                  onClick={refreshProfile}
                  className="text-slate-500 hover:text-red-600 transition-colors p-1"
                  title="Refrescar puntos"
                >
                  🔄
                </button>
              </div>
              <a
                href="/rules"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-red-600 font-medium text-sm transition-colors flex items-center gap-1"
              >
                📋 Reglas
              </a>
              {profile?.role === 'admin' && (
                <a
                  href="/admin"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  🛡️ Panel Admin
                </a>
              )}
              <button
                onClick={handleSignOut}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
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
        {activeTab === 'predictions' && <PredictionsTab userId={user.id} />}
        {activeTab === 'calendar' && <CalendarTab userId={user.id} />}
        {activeTab === 'groups' && <GroupsTab userId={user.id} />}
        {activeTab === 'bracket' && <BracketTab />}
        {activeTab === 'ranking' && <RankingTab currentUserId={user.id} />}
        {activeTab === 'resultados' && <ResultadosTab />}
        {activeTab === 'estadisticas' && <EstadisticasTab />}
        {activeTab === 'special' && <SpecialTab userId={user.id} />}
      </div>
    </div>
  )
}

// Tab 1: Predictions
function PredictionsTab({ userId }: { userId: string }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({})
  const [loading, setLoading] = useState(true)
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
      .eq('phase', 'groups')
      .order('match_date', { ascending: true })
      .limit(100)

    const { data: predictionsData } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .limit(200)

    if (matchesData) setMatches(matchesData as any)
    if (predictionsData) {
      const predMap: Record<number, Prediction> = {}
      predictionsData.forEach((p: any) => {
        predMap[p.match_id] = p
      })
      setPredictions(predMap)
    }
    setLoading(false)
  }

  async function savePrediction(matchId: number, predHome: number, predAway: number) {
    console.log('=== GUARDANDO PREDICCION ===')
    console.log('User ID:', userId)
    console.log('Match ID:', matchId)
    console.log('Predicción:', predHome, '-', predAway)

    const { data, error } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: userId,
          match_id: matchId,
          pred_home: predHome,
          pred_away: predAway,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,match_id',
        }
      )
      .select()

    if (error) {
      console.error('❌ Error al guardar predicción:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      alert('Error al guardar predicción: ' + error.message)
    } else {
      console.log('✅ Predicción guardada exitosamente:', data)
      await loadData()
    }
  }

  async function clearPrediction(matchId: number) {
    const { error} = await supabase
      .from('predictions')
      .delete()
      .eq('user_id', userId)
      .eq('match_id', matchId)

    if (!error) {
      await loadData()
    }
  }

  async function exportToPDF() {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single()

    const userName = profile?.display_name || 'Usuario'

    const doc = new jsPDF()

    // Title
    doc.setFontSize(18)
    doc.text('Polla Mundial 2026 - Mis Predicciones', 14, 20)
    doc.setFontSize(12)
    doc.text(`Participante: ${userName}`, 14, 28)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, 14, 34)

    // Prepare data
    const tableData = matches.map((match) => {
      const pred = predictions[match.id]
      const homeTeam = match.home_team?.name || 'TBD'
      const awayTeam = match.away_team?.name || 'TBD'
      const matchDate = new Date(match.match_date).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
      })
      const prediction = pred ? `${pred.pred_home} - ${pred.pred_away}` : '-'
      const result = match.home_score !== null && match.away_score !== null
        ? `${match.home_score} - ${match.away_score}`
        : '-'
      const points = pred?.points_earned || 0

      return [`#${match.match_number}`, matchDate, homeTeam, awayTeam, prediction, result, points]
    })

    autoTable(doc, {
      head: [['#', 'Fecha', 'Local', 'Visitante', 'Mi Pred.', 'Resultado', 'Pts']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [220, 38, 38] },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 22 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
        6: { cellWidth: 12 },
      },
    })

    // Save
    doc.save(`polla-predicciones-${userName.replace(/\s+/g, '-')}.pdf`)
  }

  if (loading) return <div className="text-center py-12">Cargando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Predicciones - Fase de Grupos</h2>
          <p className="text-slate-600">72 partidos. Haz tus predicciones antes de que inicie cada partido.</p>
        </div>
        <button
          onClick={exportToPDF}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
        >
          📄 Exportar PDF
        </button>
      </div>

      <div className="space-y-4">
        {matches.map((match) => (
          <MatchPredictionCard
            key={match.id}
            match={match}
            prediction={predictions[match.id]}
            onSave={savePrediction}
            onClear={clearPrediction}
          />
        ))}
      </div>
    </div>
  )
}

function MatchPredictionCard({
  match,
  prediction,
  onSave,
  onClear,
}: {
  match: Match
  prediction?: Prediction
  onSave: (matchId: number, predHome: number, predAway: number) => void
  onClear: (matchId: number) => void
}) {
  const [predHome, setPredHome] = useState(prediction?.pred_home?.toString() || '')
  const [predAway, setPredAway] = useState(prediction?.pred_away?.toString() || '')

  // Update local state when prediction changes
  useEffect(() => {
    setPredHome(prediction?.pred_home?.toString() || '')
    setPredAway(prediction?.pred_away?.toString() || '')
  }, [prediction])

  const matchDate = new Date(match.match_date)
  const colombiaTime = matchDate.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'short',
    timeStyle: 'short',
  })
  const hasStarted = new Date() >= matchDate
  const hasResult = match.home_score !== null && match.away_score !== null

  let bgColor = 'bg-white'
  let borderColor = 'border-red-100'

  if (hasResult && prediction) {
    const exactScore = prediction.pred_home === match.home_score && prediction.pred_away === match.away_score
    const correctWinner =
      (prediction.pred_home > prediction.pred_away && (match.home_score ?? 0) > (match.away_score ?? 0)) ||
      (prediction.pred_home < prediction.pred_away && (match.home_score ?? 0) < (match.away_score ?? 0)) ||
      (prediction.pred_home === prediction.pred_away && match.home_score === match.away_score)

    if (exactScore) {
      bgColor = 'bg-green-50'
      borderColor = 'border-green-300'
    } else if (correctWinner) {
      bgColor = 'bg-yellow-50'
      borderColor = 'border-yellow-300'
    } else {
      bgColor = 'bg-red-50'
      borderColor = 'border-red-300'
    }
  }

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <p className="text-xs text-slate-500 mb-2">
            Partido #{match.match_number} | Grupo {match.group_id} | {colombiaTime}
          </p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-2xl">{match.home_team?.flag_emoji}</span>
              <span className="font-semibold text-slate-800">{match.home_team?.name}</span>
            </div>
            {hasResult ? (
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs font-semibold text-slate-600">Marcador Final</p>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-slate-800">{match.home_score}</span>
                  <span className="text-slate-400">-</span>
                  <span className="text-2xl font-bold text-slate-800">{match.away_score}</span>
                </div>
              </div>
            ) : (
              <span className="text-slate-400">vs</span>
            )}
            <div className="flex items-center gap-2 flex-1 justify-end">
              <span className="font-semibold text-slate-800">{match.away_team?.name}</span>
              <span className="text-2xl">{match.away_team?.flag_emoji}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">{match.venue}, {match.city}</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-semibold text-slate-600">Predicción</p>
          <div className="flex items-center gap-4">
            {!hasStarted ? (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={predHome}
                    onChange={(e) => setPredHome(e.target.value)}
                    className="w-16 px-2 py-2 border border-slate-300 rounded text-center font-semibold"
                    placeholder="0"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={predAway}
                    onChange={(e) => setPredAway(e.target.value)}
                    className="w-16 px-2 py-2 border border-slate-300 rounded text-center font-semibold"
                    placeholder="0"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const home = parseInt(predHome) || 0
                      const away = parseInt(predAway) || 0
                      onSave(match.id, home, away)
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    {prediction ? 'Actualizar' : 'Guardar'}
                  </button>
                  {prediction && (
                    <button
                      onClick={() => {
                        if (confirm('¿Estás seguro de que quieres eliminar esta predicción?')) {
                          onClear(match.id)
                        }
                      }}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                    >
                      Anular
                    </button>
                  )}
                </div>
              </>
            ) : prediction ? (
              <div className="text-center">
                <p className="text-lg font-bold text-slate-800">
                  {prediction.pred_home} - {prediction.pred_away}
                </p>
                {hasResult && (
                  <p className="text-sm font-semibold text-red-600 mt-1">
                    {prediction.points_earned} pts
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">Sin predicción</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Tab 2: Calendar
function CalendarTab({ userId }: { userId: string }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, any>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()

    // Subscribe to realtime updates for match results
    const channel = supabase
      .channel('calendar-matches')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
        },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  async function loadData() {
    // Load matches
    const { data: matchesData } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(id, name, flag_emoji),
        away_team:teams!matches_away_team_id_fkey(id, name, flag_emoji)
      `)
      .order('match_date', { ascending: true })

    // Load user predictions with points
    const { data: predictionsData } = await supabase
      .from('predictions')
      .select('match_id, points_earned, calculated')
      .eq('user_id', userId)

    if (matchesData) setMatches(matchesData as any)

    if (predictionsData) {
      const predMap: Record<number, any> = {}
      predictionsData.forEach((pred: any) => {
        predMap[pred.match_id] = pred
      })
      setPredictions(predMap)
    }

    setLoading(false)
  }

  if (loading) return <div className="text-center py-12">Cargando...</div>

  const phases = [
    { id: 'groups', label: 'Fase de Grupos', filter: (m: Match) => m.phase === 'groups' },
    { id: 'r32', label: 'Dieciseisavos de Final', filter: (m: Match) => m.match_number >= 73 && m.match_number <= 88 },
    { id: 'r16', label: 'Octavos de Final', filter: (m: Match) => m.match_number >= 89 && m.match_number <= 96 },
    { id: 'r8', label: 'Cuartos de Final', filter: (m: Match) => m.match_number >= 97 && m.match_number <= 100 },
    { id: 'r4', label: 'Semifinales', filter: (m: Match) => m.match_number >= 101 && m.match_number <= 102 },
    { id: '3rd', label: 'Tercer Lugar', filter: (m: Match) => m.match_number === 103 },
    { id: 'final', label: 'Final', filter: (m: Match) => m.match_number === 104 },
  ]

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-slate-800">Calendario Completo</h2>

      {phases.map((phase) => {
        const phaseMatches = matches.filter(phase.filter)
        if (phaseMatches.length === 0) return null

        return (
          <div key={phase.id} className="bg-white rounded-xl border border-red-100 overflow-hidden">
            <div className="bg-red-600 text-white px-6 py-3">
              <h3 className="text-lg font-bold">{phase.label}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 text-slate-600 text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Fecha y Hora</th>
                    <th className="px-4 py-3 text-left">Equipo Local</th>
                    <th className="px-4 py-3 text-left">Equipo Visitante</th>
                    <th className="px-4 py-3 text-center">Resultado Final</th>
                    <th className="px-4 py-3 text-left">Sede</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {phaseMatches.map((match) => (
                    <CalendarMatchCard key={match.id} match={match} prediction={predictions[match.id]} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CalendarMatchCard({ match, prediction }: { match: Match; prediction?: any }) {
  const matchDate = new Date(match.match_date)
  const colombiaTime = matchDate.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'short',
    timeStyle: 'short',
  })
  const now = new Date()
  const hasStarted = now >= matchDate
  const hasEnded = match.status === 'finished'

  let statusBadge
  if (hasEnded) {
    statusBadge = <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Finalizado</span>
  } else if (hasStarted) {
    statusBadge = <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full animate-pulse">En vivo</span>
  } else {
    statusBadge = <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">Próximo</span>
  }

  const homeTeamName = match.home_team?.name || match.home_team_label
  const awayTeamName = match.away_team?.name || match.away_team_label

  // Calculate points display
  let pointsDisplay
  if (prediction && prediction.calculated && match.home_score !== null && match.away_score !== null) {
    const points = prediction.points_earned || 0
    if (points > 0) {
      pointsDisplay = (
        <span className="px-2 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full">
          +{points}
        </span>
      )
    } else {
      pointsDisplay = <span className="text-slate-400 text-sm">0</span>
    }
  } else if (match.home_score === null || match.away_score === null) {
    pointsDisplay = <span className="text-slate-400 text-sm">-</span>
  } else {
    pointsDisplay = <span className="text-slate-400 text-sm">-</span>
  }

  return (
    <tr className="hover:bg-slate-50 border-b border-slate-100">
      <td className="px-4 py-3 text-xs text-slate-600">#{match.match_number}</td>
      <td className="px-4 py-3 text-xs text-slate-600">{colombiaTime}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {match.home_team?.flag_emoji && <span className="text-lg">{match.home_team.flag_emoji}</span>}
          <span className="font-semibold text-slate-800 text-sm">{homeTeamName}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 text-sm">{awayTeamName}</span>
          {match.away_team?.flag_emoji && <span className="text-lg">{match.away_team.flag_emoji}</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        {match.home_score !== null && match.away_score !== null ? (
          <span className="text-lg font-bold text-slate-800">
            {match.home_score} - {match.away_score}
          </span>
        ) : (
          <span className="text-slate-400 text-sm">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-slate-600">{match.venue}</td>
      <td className="px-4 py-3 text-center">{statusBadge}</td>
      <td className="px-4 py-3 text-center">{pointsDisplay}</td>
    </tr>
  )
}

// Tab 3: Groups (based on user predictions)
function GroupsTab({ userId }: { userId: string }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [realStandings, setRealStandings] = useState<any[]>([])
  const [positionPredictions, setPositionPredictions] = useState<any[]>([])
  const [completedGroupMatches, setCompletedGroupMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [userId])

  async function loadData() {
    const [teamsRes, predictionsRes, standingsRes, positionPredsRes, completedMatchesRes] = await Promise.all([
      supabase.from('teams').select('*').order('group_id'),
      supabase
        .from('predictions')
        .select(`
          *,
          match:matches!inner(
            id,
            match_number,
            phase,
            group_id,
            home_team_id,
            away_team_id
          )
        `)
        .eq('user_id', userId)
        .eq('match.phase', 'groups')
        .limit(100),
      supabase
        .from('group_standings')
        .select('*')
        .order('group_id')
        .order('position'),
      supabase
        .from('group_position_predictions')
        .select('*')
        .eq('user_id', userId),
      supabase
        .from('matches')
        .select('group_id, home_score, away_score')
        .eq('phase', 'groups')
        .not('home_score', 'is', null)
        .not('away_score', 'is', null),
    ])

    if (teamsRes.data) setTeams(teamsRes.data)
    if (predictionsRes.data) {
      setPredictions(predictionsRes.data)
      console.log('=== PREDICCIONES CARGADAS (TAB GRUPOS) ===')
      console.log('Total predicciones:', predictionsRes.data.length)
      console.log('Predicciones del grupo A:', predictionsRes.data.filter((p: any) => p.match?.group_id === 'A'))
      console.log('Detalle predicciones grupo A:', predictionsRes.data
        .filter((p: any) => p.match?.group_id === 'A')
        .map((p: any) => ({
          match_id: p.match_id,
          pred_home: p.pred_home,
          pred_away: p.pred_away,
          home_team_id: p.match.home_team_id,
          away_team_id: p.match.away_team_id
        }))
      )
    }
    if (standingsRes.data) setRealStandings(standingsRes.data)
    if (positionPredsRes.data) setPositionPredictions(positionPredsRes.data)
    if (completedMatchesRes.data) {
      setCompletedGroupMatches(completedMatchesRes.data)
      console.log('=== PARTIDOS COMPLETOS CARGADOS ===')
      console.log('Total partidos con scores:', completedMatchesRes.data.length)
      console.log('Partidos del grupo A:', completedMatchesRes.data.filter((m: any) => m.group_id === 'A'))

      // DEBUG: Ver TODOS los partidos del grupo A (con y sin scores)
      const { data: allGroupAMatches } = await supabase
        .from('matches')
        .select('id, match_number, group_id, phase, home_score, away_score, home_team_id, away_team_id')
        .eq('phase', 'groups')
        .eq('group_id', 'A')

      console.log('=== TODOS LOS PARTIDOS DEL GRUPO A ===')
      console.log('Total partidos:', allGroupAMatches?.length)
      console.log('Detalle:', allGroupAMatches)
    }
    setLoading(false)
  }

  async function savePositionPrediction(groupId: string, teamId: number, position: number | null) {
    if (position === null) {
      // Delete the prediction if user selects "-"
      const { error } = await supabase
        .from('group_position_predictions')
        .delete()
        .eq('user_id', userId)
        .eq('group_id', groupId)
        .eq('team_id', teamId)

      if (error) {
        alert('Error al eliminar: ' + error.message)
      } else {
        await loadData()
      }
    } else {
      // Upsert the prediction
      const { error } = await supabase
        .from('group_position_predictions')
        .upsert({
          user_id: userId,
          group_id: groupId,
          team_id: teamId,
          predicted_position: position,
          updated_at: new Date().toISOString(),
        })

      if (error) {
        alert('Error al guardar: ' + error.message)
      } else {
        await loadData()
      }
    }
  }

  if (loading) return <div className="text-center py-12">Cargando...</div>

  const groups = 'ABCDEFGHIJKL'.split('')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Mis Tablas de Posiciones</h2>
      <p className="text-sm text-slate-600">Basado en tus predicciones. Asigna la posición final proyectada en la columna "Pos".</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <GroupTable
            key={group}
            group={group}
            teams={teams}
            predictions={predictions}
            realStandings={realStandings}
            positionPredictions={positionPredictions}
            completedGroupMatches={completedGroupMatches}
            onSavePosition={savePositionPrediction}
          />
        ))}
      </div>
    </div>
  )
}

function GroupTable({
  group,
  teams,
  predictions,
  realStandings,
  positionPredictions,
  completedGroupMatches,
  onSavePosition,
}: {
  group: string
  teams: Team[]
  predictions: any[]
  realStandings: any[]
  positionPredictions: any[]
  completedGroupMatches: any[]
  onSavePosition: (groupId: string, teamId: number, position: number | null) => void
}) {
  const groupTeams = teams.filter((t) => t.group_id === group)

  const standings = groupTeams.map((team) => {
    // Find predictions for matches where this team played
    const teamPredictions = predictions.filter(
      (p) => p.match?.group_id === group && (
        p.match.home_team_id === team.id || p.match.away_team_id === team.id
      )
    )

    let won = 0, drawn = 0, lost = 0, gf = 0, gc = 0

    teamPredictions.forEach((p) => {
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
    const played = teamPredictions.length

    // Get predicted position for this team
    const positionPred = positionPredictions.find(
      (pp) => pp.group_id === group && pp.team_id === team.id
    )

    return { team, played, won, drawn, lost, gf, gc, gd, points, predictedPosition: positionPred?.predicted_position || null }
  })

  standings.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points
    if (a.gd !== b.gd) return b.gd - a.gd
    return b.gf - a.gf
  })

  // Check deadline: 11 de junio 2026, 11pm Colombia (UTC-5)
  const deadline = new Date('2026-06-11T23:00:00-05:00')
  const isLocked = new Date() >= deadline

  // Check if user earned group order bonus (all 4 positions must match and all 6 matches complete)
  const groupRealStandings = realStandings.filter((s: any) => s.group_id === group)
  const completedMatchesInGroup = completedGroupMatches.filter((m: any) => m.group_id === group).length
  let earnedBonus = false

  // DEBUG: Log group A info
  if (group === 'A') {
    console.log('=== DEBUG GRUPO A ===')
    console.log('Partidos completos:', completedMatchesInGroup)
    console.log('Group real standings:', groupRealStandings)
    console.log('Predicted positions:', standings.map(s => ({ team: s.team.name, pos: s.predictedPosition })))
  }

  if (completedMatchesInGroup === 6 && groupRealStandings.length >= 4 && standings.length >= 4) {
    // Check if all predicted positions match real standings
    let allMatch = true
    for (let i = 0; i < 4; i++) {
      const realStanding = groupRealStandings.find((s: any) => s.position === i + 1)
      const teamWithPredictedPos = standings.find((s) => s.predictedPosition === i + 1)

      if (group === 'A') {
        console.log(`Posición ${i + 1}:`, {
          realTeam: realStanding?.team_id,
          predictedTeam: teamWithPredictedPos?.team.id,
          match: realStanding?.team_id === teamWithPredictedPos?.team.id
        })
      }

      if (!realStanding || !teamWithPredictedPos || realStanding.team_id !== teamWithPredictedPos.team.id) {
        allMatch = false
        break
      }
    }

    earnedBonus = allMatch
    if (group === 'A') {
      console.log('Bono otorgado:', earnedBonus)
    }
  } else if (group === 'A') {
    console.log('No se evalúa bono porque:', {
      completedMatchesInGroup,
      needsToBeExactly: 6,
      groupRealStandingsLength: groupRealStandings.length,
      standingsLength: standings.length
    })
  }

  return (
    <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
      <div className="bg-red-600 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Grupo {group}</h3>
          {earnedBonus && (
            <span className="bg-yellow-400 text-slate-800 text-xs font-bold px-2 py-1 rounded-full">
              +3 pts Bono Orden
            </span>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs">
            <tr>
              <th className="px-2 py-2 text-left">Pos</th>
              <th className="px-2 py-2 text-left">Equipo</th>
              <th className="px-2 py-2 text-center">PJ</th>
              <th className="px-2 py-2 text-center">G</th>
              <th className="px-2 py-2 text-center">E</th>
              <th className="px-2 py-2 text-center">P</th>
              <th className="px-2 py-2 text-center">GF</th>
              <th className="px-2 py-2 text-center">GC</th>
              <th className="px-2 py-2 text-center">DG</th>
              <th className="px-2 py-2 text-center font-bold">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {standings.map((s, idx) => {
              // Get used positions in this group (excluding current team)
              const usedPositions = standings
                .filter((st) => st.team.id !== s.team.id && st.predictedPosition !== null)
                .map((st) => st.predictedPosition)

              return (
                <tr
                  key={s.team.id}
                  className={s.team.name === 'Colombia' ? 'bg-red-50' : 'hover:bg-slate-50'}
                >
                  <td className="px-2 py-2">
                    {isLocked ? (
                      <span className="font-semibold text-slate-600">{s.predictedPosition || '-'}</span>
                    ) : (
                      <select
                        value={s.predictedPosition || ''}
                        onChange={(e) => {
                          const value = e.target.value

                          // If user selects "-", clear the position
                          if (value === '') {
                            onSavePosition(group, s.team.id, null)
                            return
                          }

                          const newPos = parseInt(value)
                          if (!usedPositions.includes(newPos)) {
                            onSavePosition(group, s.team.id, newPos)
                          } else {
                            alert('Esa posición ya está asignada a otro equipo en este grupo. Primero debes limpiar la posición del otro equipo seleccionando "-".')
                          }
                        }}
                        className="w-12 px-1 py-1 border border-slate-300 rounded text-center text-sm font-semibold"
                      >
                        <option value="">-</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                      </select>
                    )}
                  </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1">
                    <span className="text-lg">{s.team.flag_emoji}</span>
                    <span className="font-semibold text-slate-800 text-xs">{s.team.name}</span>
                  </div>
                </td>
                <td className="px-2 py-2 text-center text-slate-700">{s.played}</td>
                <td className="px-2 py-2 text-center text-slate-700">{s.won}</td>
                <td className="px-2 py-2 text-center text-slate-700">{s.drawn}</td>
                <td className="px-2 py-2 text-center text-slate-700">{s.lost}</td>
                <td className="px-2 py-2 text-center text-slate-700">{s.gf}</td>
                <td className="px-2 py-2 text-center text-slate-700">{s.gc}</td>
                <td className="px-2 py-2 text-center text-slate-700">{s.gd >= 0 ? '+' : ''}{s.gd}</td>
                <td className="px-2 py-2 text-center font-bold text-slate-800">{s.points}</td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Tab 4: Ranking
function RankingTab({ currentUserId }: { currentUserId: string }) {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadRanking()
  }, [])

  async function loadRanking() {
    // Get all profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, display_name, total_points')
      .order('total_points', { ascending: false })

    if (!profilesData) {
      setLoading(false)
      return
    }

    // Load ALL predictions from ALL users to calculate unique predictions
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

    // Load real group standings
    const { data: realStandings } = await supabase
      .from('group_standings')
      .select('*')
      .order('group_id')
      .order('position')

    // Group predictions by match_id to identify unique exact scores
    const predictionsByMatch = new Map<number, any[]>()
    allPredictions?.forEach((pred: any) => {
      const matchId = pred.match.id
      if (!predictionsByMatch.has(matchId)) {
        predictionsByMatch.set(matchId, [])
      }
      predictionsByMatch.get(matchId)!.push(pred)
    })

    // Identify unique exact score predictions (only one user got it right)
    const uniquePredictionUsers = new Map<string, number>() // userId -> count of unique predictions

    predictionsByMatch.forEach((predictions, matchId) => {
      // Find predictions with exact score for this match
      const exactScorePreds = predictions.filter(
        (p) =>
          p.match.home_score !== null &&
          p.match.away_score !== null &&
          p.pred_home === p.match.home_score &&
          p.pred_away === p.match.away_score
      )

      // If exactly one user got the exact score, it's a unique prediction
      if (exactScorePreds.length === 1) {
        const userId = exactScorePreds[0].user_id
        uniquePredictionUsers.set(userId, (uniquePredictionUsers.get(userId) || 0) + 1)
      }
    })

    // Get all teams for group standings calculation
    const { data: allTeams } = await supabase
      .from('teams')
      .select('*')
      .order('group_id')

    // For each profile, get their point breakdown
    const profilesWithBreakdown = await Promise.all(
      profilesData.map(async (profile) => {
        const userPredictions = allPredictions?.filter((p) => p.user_id === profile.id) || []

        const { data: specialPreds } = await supabase
          .from('special_predictions')
          .select('*')
          .eq('user_id', profile.id)

        // Calculate breakdown
        let exactScore = 0
        let correctResult = 0
        let correctGoal = 0
        let correctQualifier = 0
        let uniquePredictions = 0
        let groupOrderBonus = 0

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

        // Calculate unique prediction bonus (5 points per unique exact score)
        uniquePredictions = (uniquePredictionUsers.get(profile.id) || 0) * 5

        // Calculate group order bonus (3 points per group if all 4 manual positions match)
        if (realStandings && realStandings.length > 0) {
          // Get user's manual position predictions
          const { data: userPositionPredictions } = await supabase
            .from('group_position_predictions')
            .select('*')
            .eq('user_id', profile.id)

          // Get all group matches to verify completion
          const { data: groupMatches } = await supabase
            .from('matches')
            .select('group_id, home_score, away_score')
            .eq('phase', 'groups')
            .not('home_score', 'is', null)
            .not('away_score', 'is', null)

          const groups = 'ABCDEFGHIJKL'.split('')

          groups.forEach((groupId) => {
            const groupRealStandings = realStandings.filter((s: any) => s.group_id === groupId)
            const groupPositionPreds = userPositionPredictions?.filter(
              (pp: any) => pp.group_id === groupId
            ) || []

            // Count completed matches in this group
            const completedMatchesInGroup = groupMatches?.filter((m: any) => m.group_id === groupId).length || 0

            // DEBUG for group A
            if (groupId === 'A') {
              console.log('=== DEBUG RANKING - GRUPO A ===')
              console.log('User:', profile.display_name)
              console.log('Partidos completos:', completedMatchesInGroup)
              console.log('Group real standings:', groupRealStandings)
              console.log('Position predictions:', groupPositionPreds)
            }

            // Award bonus only if all 6 matches are complete and all 4 positions match exactly
            if (completedMatchesInGroup === 6 && groupRealStandings.length >= 4 && groupPositionPreds.length >= 4) {
              let allMatch = true
              for (let position = 1; position <= 4; position++) {
                const realStanding = groupRealStandings.find((s: any) => s.position === position)
                const posPred = groupPositionPreds.find((pp: any) => pp.predicted_position === position)

                if (groupId === 'A') {
                  console.log(`Pos ${position}:`, {
                    realTeamId: realStanding?.team_id,
                    predTeamId: posPred?.team_id,
                    match: realStanding?.team_id === posPred?.team_id
                  })
                }

                if (!realStanding || !posPred || realStanding.team_id !== posPred.team_id) {
                  allMatch = false
                  break
                }
              }
              if (allMatch) {
                groupOrderBonus += 3
                if (groupId === 'A') {
                  console.log('✅ Bono otorgado para grupo A')
                }
              }
            } else if (groupId === 'A') {
              console.log('❌ No se evalúa bono porque:', {
                completedMatchesInGroup,
                needsToBeExactly: 6,
                groupRealStandingsLength: groupRealStandings.length,
                groupPositionPredsLength: groupPositionPreds.length
              })
            }
          })
        }

        // Get special predictions points by type
        const champion = specialPreds?.find(sp => sp.type === 'champion')?.points_earned || 0
        const runnerUp = specialPreds?.find(sp => sp.type === 'runner_up')?.points_earned || 0
        const thirdPlace = specialPreds?.find(sp => sp.type === 'third_place')?.points_earned || 0
        const mvp = specialPreds?.find(sp => sp.type === 'mvp')?.points_earned || 0
        const topScorer = specialPreds?.find(sp => sp.type === 'top_scorer')?.points_earned || 0

        // DEBUG: Log final groupOrderBonus
        console.log(`Total groupOrderBonus para ${profile.display_name}:`, groupOrderBonus)

        // Calculate total points by summing all categories
        const totalCalculated =
          exactScore +
          correctResult +
          correctGoal +
          correctQualifier +
          uniquePredictions +
          groupOrderBonus +
          champion +
          runnerUp +
          thirdPlace +
          mvp +
          topScorer

        console.log(`=== COMPARACIÓN PUNTOS: ${profile.display_name} ===`)
        console.log('Puntos en BD:', profile.total_points)
        console.log('Puntos calculados:', totalCalculated)
        console.log('Desglose:', {
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
          topScorer
        })

        return {
          ...profile,
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
          total_points: totalCalculated, // Override with calculated total
        }
      })
    )

    // Sort by total_points descending
    profilesWithBreakdown.sort((a, b) => b.total_points - a.total_points)

    setProfiles(profilesWithBreakdown)
    setLoading(false)
  }

  if (loading) return <div className="text-center py-12">Cargando...</div>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Tabla de Posiciones</h2>

      <div className="bg-white rounded-xl border border-red-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-red-600 text-white">
            <tr>
              <th className="px-3 py-3 text-left sticky left-0 bg-red-600 z-10">Pos</th>
              <th className="px-3 py-3 text-left sticky left-12 bg-red-600 z-10">Nombre</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Marcador Exacto</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Ganador Acertado</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Gol Acertado</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Predicción Única</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Bono Orden Grupo</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Clasificado Acertado</th>
              <th className="px-3 py-3 text-center">Campeón</th>
              <th className="px-3 py-3 text-center">Subcampeón</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">3er Lugar</th>
              <th className="px-3 py-3 text-center">MVP</th>
              <th className="px-3 py-3 text-center">Goleador</th>
              <th className="px-3 py-3 text-center bg-red-700 font-bold">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {profiles.map((profile, idx) => (
              <tr
                key={profile.id}
                className={profile.id === currentUserId ? 'bg-red-50 font-semibold' : 'hover:bg-slate-50'}
              >
                <td className="px-3 py-3 sticky left-0 bg-white">
                  <span className="text-xl">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-800 sticky left-12 bg-white">
                  {profile.display_name}
                  {profile.id === currentUserId && (
                    <span className="ml-1 text-xs text-red-600">(Tú)</span>
                  )}
                </td>
                <td className="px-3 py-3 text-center text-slate-700">{profile.exactScore}</td>
                <td className="px-3 py-3 text-center text-slate-700">{profile.correctResult}</td>
                <td className="px-3 py-3 text-center text-slate-700">{profile.correctGoal}</td>
                <td className="px-3 py-3 text-center text-slate-700">{profile.uniquePredictions}</td>
                <td className="px-3 py-3 text-center text-slate-700">{profile.groupOrderBonus}</td>
                <td className="px-3 py-3 text-center text-slate-700">{profile.correctQualifier}</td>
                <td className="px-3 py-3 text-center text-slate-700">{profile.champion}</td>
                <td className="px-3 py-3 text-center text-slate-700">{profile.runnerUp}</td>
                <td className="px-3 py-3 text-center text-slate-700">{profile.thirdPlace}</td>
                <td className="px-3 py-3 text-center text-slate-700">{profile.mvp}</td>
                <td className="px-3 py-3 text-center text-slate-700">{profile.topScorer}</td>
                <td className="px-3 py-3 text-center bg-red-50">
                  <span className="text-lg font-bold text-red-600">{profile.total_points}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Tab 4.5: Bracket with Predictions
function BracketTab() {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, any>>({})
  const [loading, setLoading] = useState(true)
  const [showPredictions, setShowPredictions] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadData()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('bracket-matches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: 'phase=neq.groups',
        },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()

    const [matchesRes, predsRes] = await Promise.all([
      supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, flag_emoji),
          away_team:teams!matches_away_team_id_fkey(id, name, flag_emoji)
        `)
        .gte('match_number', 73)
        .order('match_number', { ascending: true }),
      user ? supabase.from('predictions').select('*').eq('user_id', user.id) : Promise.resolve({ data: [] })
    ])

    if (matchesRes.data) setMatches(matchesRes.data as any)
    if (predsRes.data) {
      const predMap: Record<number, any> = {}
      predsRes.data.forEach((p: any) => {
        predMap[p.match_id] = p
      })
      setPredictions(predMap)
    }
    setLoading(false)
  }

  async function savePrediction(matchId: number, predHome: number, predAway: number) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: user.id,
          match_id: matchId,
          pred_home: predHome,
          pred_away: predAway,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,match_id',
        }
      )

    if (error) {
      console.error('Error guardando predicción en Llaves:', error)
      alert('Error al guardar predicción: ' + error.message)
    } else {
      await loadData()
    }
  }

  async function exportToPDF() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const userName = profile?.display_name || 'Usuario'

    const doc = new jsPDF()

    // Title
    doc.setFontSize(18)
    doc.text('Polla Mundial 2026 - Bracket Eliminatorio', 14, 20)
    doc.setFontSize(12)
    doc.text(`Participante: ${userName}`, 14, 28)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, 14, 34)

    // Prepare data
    const tableData = matches.map((match) => {
      const pred = predictions[match.id]
      const homeTeam = match.home_team?.name || match.home_team_label || 'TBD'
      const awayTeam = match.away_team?.name || match.away_team_label || 'TBD'
      const matchDate = new Date(match.match_date).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
      })

      // For elimination rounds, show predicted qualifier
      let prediction = '-'
      if (pred) {
        const predictedWinner = pred.pred_home > pred.pred_away ? homeTeam : awayTeam
        prediction = `${predictedWinner} (${pred.pred_home}-${pred.pred_away})`
      }

      const result = match.home_score !== null && match.away_score !== null
        ? `${match.home_score} - ${match.away_score}`
        : '-'
      const points = pred?.points_earned || 0

      // Phase name
      let phaseName = ''
      if (match.match_number >= 73 && match.match_number <= 88) phaseName = 'R32'
      else if (match.match_number >= 89 && match.match_number <= 96) phaseName = 'R16'
      else if (match.match_number >= 97 && match.match_number <= 100) phaseName = 'R8'
      else if (match.match_number >= 101 && match.match_number <= 102) phaseName = 'SF'
      else if (match.match_number === 103) phaseName = '3rd'
      else if (match.match_number === 104) phaseName = 'Final'

      return [phaseName, `#${match.match_number}`, matchDate, homeTeam, awayTeam, prediction, result, points]
    })

    autoTable(doc, {
      head: [['Fase', '#', 'Fecha', 'Local', 'Visitante', 'Clasificado', 'Resultado', 'Pts']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [220, 38, 38] },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 12 },
        2: { cellWidth: 18 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 },
        5: { cellWidth: 30 },
        6: { cellWidth: 18 },
        7: { cellWidth: 12 },
      },
    })

    // Save
    doc.save(`polla-bracket-${userName.replace(/\s+/g, '-')}.pdf`)
  }

  if (loading) return <div className="text-center py-12">Cargando bracket...</div>

  // Organize matches by phase
  const r32Matches = matches.filter((m) => m.match_number >= 73 && m.match_number <= 88).sort((a, b) => a.match_number - b.match_number)
  const r16Matches = matches.filter((m) => m.match_number >= 89 && m.match_number <= 96).sort((a, b) => a.match_number - b.match_number)
  const quarterMatches = matches.filter((m) => m.match_number >= 97 && m.match_number <= 100).sort((a, b) => a.match_number - b.match_number)
  const semiMatches = matches.filter((m) => m.match_number >= 101 && m.match_number <= 102).sort((a, b) => a.match_number - b.match_number)
  const thirdPlaceMatch = matches.find((m) => m.match_number === 103)
  const finalMatch = matches.find((m) => m.match_number === 104)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Bracket Eliminatorio</h2>
          <p className="text-slate-600">Desde Dieciseisavos de Final hasta la Final</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
          >
            📄 Exportar PDF
          </button>
          <button
            onClick={() => setShowPredictions(!showPredictions)}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              showPredictions
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
            }`}
          >
            {showPredictions ? 'Ver Resultados' : 'Hacer Predicciones'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="inline-flex gap-8 min-w-full">
          {/* Round of 32 (Dieciseisavos) */}
          <div className="flex-shrink-0" style={{ width: '200px' }}>
            <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">Dieciseisavos</h3>
            <div className="space-y-3">
              {r32Matches.map((match) => (
                <BracketMatchCard
                  key={match.id}
                  match={match}
                  borderColor="border-red-100"
                  prediction={predictions[match.id]}
                  showPredictionMode={showPredictions}
                  onSavePrediction={savePrediction}
                />
              ))}
            </div>
          </div>

          {/* Round of 16 (Octavos) */}
          <div className="flex-shrink-0" style={{ width: '200px' }}>
            <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">Octavos de Final</h3>
            <div className="space-y-3" style={{ paddingTop: '30px' }}>
              {r16Matches.map((match, idx) => (
                <div key={match.id} style={{ marginBottom: idx < r16Matches.length - 1 ? '60px' : '0' }}>
                  <BracketMatchCard
                    match={match}
                    borderColor="border-red-200"
                    prediction={predictions[match.id]}
                    showPredictionMode={showPredictions}
                    onSavePrediction={savePrediction}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quarters */}
          <div className="flex-shrink-0" style={{ width: '200px' }}>
            <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">Cuartos de Final</h3>
            <div className="space-y-3" style={{ paddingTop: '60px' }}>
              {quarterMatches.map((match) => (
                <div key={match.id} style={{ marginBottom: '120px' }}>
                  <BracketMatchCard
                    match={match}
                    borderColor="border-red-600"
                    prediction={predictions[match.id]}
                    showPredictionMode={showPredictions}
                    onSavePrediction={savePrediction}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Semis */}
          <div className="flex-shrink-0" style={{ width: '200px' }}>
            <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">Semifinales</h3>
            <div className="space-y-3" style={{ paddingTop: '180px' }}>
              {semiMatches.map((match) => (
                <div key={match.id} style={{ marginBottom: '280px' }}>
                  <BracketMatchCard
                    match={match}
                    borderColor="border-slate-800"
                    prediction={predictions[match.id]}
                    showPredictionMode={showPredictions}
                    onSavePrediction={savePrediction}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Third Place */}
          <div className="flex-shrink-0" style={{ width: '220px' }}>
            <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">Tercer Puesto</h3>
            <div style={{ paddingTop: '360px' }}>
              {thirdPlaceMatch && (
                <BracketMatchCard
                  match={thirdPlaceMatch}
                  borderColor="border-amber-600"
                  prediction={predictions[thirdPlaceMatch.id]}
                  showPredictionMode={showPredictions}
                  onSavePrediction={savePrediction}
                />
              )}
            </div>
          </div>

          {/* Final */}
          <div className="flex-shrink-0" style={{ width: '220px' }}>
            <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">Final</h3>
            <div style={{ paddingTop: '360px' }}>
              {finalMatch && (
                <BracketMatchCard
                  match={finalMatch}
                  borderColor="border-slate-800"
                  special
                  prediction={predictions[finalMatch.id]}
                  showPredictionMode={showPredictions}
                  onSavePrediction={savePrediction}
                />
              )}
            </div>
          </div>

          {/* Champion */}
          <div className="flex-shrink-0" style={{ width: '180px' }}>
            <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">Campeón</h3>
            <div style={{ paddingTop: '360px' }}>
              {finalMatch && finalMatch.home_score !== null && finalMatch.away_score !== null && (
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-400 rounded-lg p-4 text-center shadow-lg">
                  <div className="text-4xl mb-2">🏆</div>
                  <p className="text-xs text-slate-600 mb-2">Campeón Mundial 2026</p>
                  {finalMatch.winner_team_id ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">
                        {finalMatch.winner_team_id === finalMatch.home_team_id
                          ? finalMatch.home_team?.flag_emoji
                          : finalMatch.away_team?.flag_emoji}
                      </span>
                      <span className="font-bold text-lg text-slate-800">
                        {finalMatch.winner_team_id === finalMatch.home_team_id
                          ? finalMatch.home_team?.name
                          : finalMatch.away_team?.name}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">Por definir</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BracketMatchCard({
  match,
  borderColor,
  special = false,
  prediction,
  showPredictionMode = false,
  onSavePrediction,
}: {
  match: Match
  borderColor: string
  special?: boolean
  prediction?: any
  showPredictionMode?: boolean
  onSavePrediction?: (matchId: number, predHome: number, predAway: number) => void
}) {
  const [predHome, setPredHome] = useState(prediction?.pred_home?.toString() || '')
  const [predAway, setPredAway] = useState(prediction?.pred_away?.toString() || '')

  // Update local state when prediction changes
  useEffect(() => {
    setPredHome(prediction?.pred_home?.toString() || '')
    setPredAway(prediction?.pred_away?.toString() || '')
  }, [prediction])

  const hasResult = match.home_score !== null && match.away_score !== null
  const matchDate = new Date(match.match_date)

  // Block predictions 15 minutes before match starts
  const fifteenMinutesBeforeMatch = new Date(matchDate.getTime() - 15 * 60 * 1000)
  const isPredictionLocked = new Date() >= fifteenMinutesBeforeMatch

  const homeTeamName = match.home_team?.name || match.home_team_label
  const awayTeamName = match.away_team?.name || match.away_team_label
  const homeFlag = match.home_team?.flag_emoji
  const awayFlag = match.away_team?.flag_emoji

  const homeIsWinner = hasResult && match.winner_team_id === match.home_team_id
  const awayIsWinner = hasResult && match.winner_team_id === match.away_team_id

  const bgColor = special ? 'bg-gradient-to-br from-yellow-50 to-amber-50' : 'bg-white'

  // Check if teams are assigned
  const teamsAssigned = match.home_team_id && match.away_team_id

  // Show prediction mode if enabled, match isn't locked, and teams are assigned
  const canPredict = showPredictionMode && !isPredictionLocked && teamsAssigned

  // Determine if prediction is correct (for visual feedback)
  let predictionCorrect = false
  let exactScore = false
  if (hasResult && prediction) {
    exactScore = prediction.pred_home === match.home_score && prediction.pred_away === match.away_score
    const correctWinner =
      (prediction.pred_home > prediction.pred_away && (match.home_score ?? 0) > (match.away_score ?? 0)) ||
      (prediction.pred_home < prediction.pred_away && (match.home_score ?? 0) < (match.away_score ?? 0)) ||
      (prediction.pred_home === prediction.pred_away && match.home_score === match.away_score)
    predictionCorrect = correctWinner
  }

  return (
    <div className={`${bgColor} border-2 ${borderColor} rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow`}>
      <p className="text-xs text-slate-500 mb-2 text-center">#{match.match_number}</p>

      {!teamsAssigned && showPredictionMode ? (
        // Teams not assigned yet
        <div className="py-4 text-center">
          <p className="text-xs text-slate-500">Equipos por definir</p>
          <p className="text-xs text-slate-400 mt-1">Esperando resultados anteriores</p>
        </div>
      ) : showPredictionMode && isPredictionLocked && teamsAssigned ? (
        // Prediction locked (less than 15 minutes before match)
        <div className="py-4 text-center">
          <p className="text-xs text-amber-600 font-semibold">🔒 Predicciones cerradas</p>
          <p className="text-xs text-slate-500 mt-1">
            {matchDate.toLocaleDateString('es-CO', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          {prediction && (
            <p className="text-xs text-slate-600 mt-2">
              Tu predicción: <span className="font-semibold">{prediction.pred_home} - {prediction.pred_away}</span>
            </p>
          )}
        </div>
      ) : canPredict ? (
        // Prediction Mode - Score Input
        <div className="space-y-2">
          {/* Match Date */}
          <p className="text-xs text-slate-500 text-center mb-2">
            {matchDate.toLocaleDateString('es-CO', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>

          {/* Home Team */}
          <div className="flex items-center gap-2">
            {homeFlag && <span className="text-lg">{homeFlag}</span>}
            <span className="text-xs text-slate-700 flex-1 truncate">{homeTeamName}</span>
            <input
              type="number"
              min="0"
              max="20"
              value={predHome}
              onChange={(e) => setPredHome(e.target.value)}
              className="w-12 px-1 py-1 border border-slate-300 rounded text-center text-sm font-semibold"
              placeholder="0"
            />
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-2">
            {awayFlag && <span className="text-lg">{awayFlag}</span>}
            <span className="text-xs text-slate-700 flex-1 truncate">{awayTeamName}</span>
            <input
              type="number"
              min="0"
              max="20"
              value={predAway}
              onChange={(e) => setPredAway(e.target.value)}
              className="w-12 px-1 py-1 border border-slate-300 rounded text-center text-sm font-semibold"
              placeholder="0"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={() => {
              const home = parseInt(predHome) || 0
              const away = parseInt(predAway) || 0
              onSavePrediction?.(match.id, home, away)
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-2 py-1.5 rounded text-xs font-semibold transition-colors"
          >
            {prediction ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      ) : (
        // Result/View Mode
        <>
          {/* Match Date */}
          <p className="text-xs text-slate-500 text-center mb-2">
            {matchDate.toLocaleDateString('es-CO', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>

          {/* Home Team */}
          <div className={`flex items-center justify-between mb-2 ${homeIsWinner ? 'font-bold' : ''}`}>
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {homeFlag && <span className="text-lg flex-shrink-0">{homeFlag}</span>}
              <span className={`text-xs truncate ${homeIsWinner ? 'text-red-600' : 'text-slate-700'}`}>
                {homeTeamName}
              </span>
            </div>
            {hasResult && (
              <span className={`text-sm font-bold ml-2 ${homeIsWinner ? 'text-red-600' : 'text-slate-600'}`}>
                {match.home_score}
              </span>
            )}
          </div>

          {/* Away Team */}
          <div className={`flex items-center justify-between ${awayIsWinner ? 'font-bold' : ''}`}>
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {awayFlag && <span className="text-lg flex-shrink-0">{awayFlag}</span>}
              <span className={`text-xs truncate ${awayIsWinner ? 'text-red-600' : 'text-slate-700'}`}>
                {awayTeamName}
              </span>
            </div>
            {hasResult && (
              <span className={`text-sm font-bold ml-2 ${awayIsWinner ? 'text-red-600' : 'text-slate-600'}`}>
                {match.away_score}
              </span>
            )}
          </div>

          {/* Show prediction indicator */}
          {prediction && (
            <div className="mt-2 pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                Tu predicción:{' '}
                <span className={`font-semibold ${exactScore ? 'text-green-600' : predictionCorrect ? 'text-yellow-600' : hasResult ? 'text-red-600' : 'text-slate-700'}`}>
                  {prediction.pred_home} - {prediction.pred_away}
                </span>
                {hasResult && exactScore && <span className="ml-1">🎯</span>}
                {hasResult && predictionCorrect && !exactScore && <span className="ml-1">✓</span>}
              </p>
            </div>
          )}

          {/* Show points earned if match finished */}
          {hasResult && prediction && (
            <div className="mt-2 pt-2 border-t border-slate-200">
              <p className="text-xs text-center font-semibold text-red-600">
                {prediction.points_earned} pts
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Tab 5: Special Predictions
function SpecialTab({ userId }: { userId: string }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [predictions, setPredictions] = useState<Record<string, SpecialPrediction>>({})
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    champion: '',
    runner_up: '',
    third_place: '',
    top_scorer_first_name: '',
    top_scorer_last_name: '',
    top_scorer_country: '',
    mvp_first_name: '',
    mvp_last_name: '',
    mvp_country: '',
  })
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [teamsRes, predsRes] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('special_predictions').select('*').eq('user_id', userId),
    ])

    if (teamsRes.data) setTeams(teamsRes.data)
    if (predsRes.data) {
      const predMap: Record<string, SpecialPrediction> = {}
      predsRes.data.forEach((p: any) => {
        predMap[p.type] = p
      })
      setPredictions(predMap)

      // Parse player predictions (stored as JSON)
      let topScorerData = { first_name: '', last_name: '', country: '' }
      let mvpData = { first_name: '', last_name: '', country: '' }

      try {
        if (predMap.top_scorer?.value) {
          topScorerData = JSON.parse(predMap.top_scorer.value)
        }
      } catch (e) {
        // If not JSON, assume it's old format (single field)
        topScorerData = { first_name: predMap.top_scorer?.value || '', last_name: '', country: '' }
      }

      try {
        if (predMap.mvp?.value) {
          mvpData = JSON.parse(predMap.mvp.value)
        }
      } catch (e) {
        // If not JSON, assume it's old format (single field)
        mvpData = { first_name: predMap.mvp?.value || '', last_name: '', country: '' }
      }

      setFormData({
        champion: predMap.champion?.value || '',
        runner_up: predMap.runner_up?.value || '',
        third_place: predMap.third_place?.value || '',
        top_scorer_first_name: topScorerData.first_name || '',
        top_scorer_last_name: topScorerData.last_name || '',
        top_scorer_country: topScorerData.country || '',
        mvp_first_name: mvpData.first_name || '',
        mvp_last_name: mvpData.last_name || '',
        mvp_country: mvpData.country || '',
      })
    }
    setLoading(false)
  }

  async function savePrediction(type: string, value: string, deadline: string) {
    const { error } = await supabase
      .from('special_predictions')
      .upsert(
        {
          user_id: userId,
          type,
          value,
          deadline,
          locked: false,
          updated_at: new Date().toISOString(),
        },
        {
          ignoreDuplicates: false,
        }
      )

    if (error) {
      console.error('Error guardando predicción especial:', error)
      alert('Error al guardar predicción: ' + error.message)
    } else {
      await loadData()
    }
  }

  if (loading) return <div className="text-center py-12">Cargando...</div>

  // Deadlines en Colombia timezone
  const firstMatchDeadline = new Date('2026-06-11T14:00:00-05:00') // 11 junio, 2pm Colombia
  const knockoutStartDeadline = new Date('2026-06-28T00:00:00-05:00') // 28 junio, inicio ronda de 32

  const now = new Date()
  const firstMatchPassed = now >= firstMatchDeadline
  const knockoutStarted = now >= knockoutStartDeadline

  // Progressive points values based on when prediction is made
  // Before tournament (before 11 jun 2pm): Full points
  // Before knockouts (11 jun - 28 jun): Reduced podium points, scorer/MVP locked
  // After knockouts (after 28 jun): All locked
  const championPoints = !firstMatchPassed ? 20 : !knockoutStarted ? 10 : 0
  const runnerUpPoints = !firstMatchPassed ? 12 : !knockoutStarted ? 6 : 0
  const thirdPlacePoints = !firstMatchPassed ? 12 : !knockoutStarted ? 6 : 0
  const scorerPoints = !firstMatchPassed ? 10 : 0 // Locked after tournament starts
  const mvpPoints = !firstMatchPassed ? 10 : 0 // Locked after tournament starts

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Predicciones Especiales</h2>

      {/* Información de deadlines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Información Importante</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Antes del 11 de junio, 2pm:</strong> Todos los puntos completos (Campeón 20pts, Subcampeón 12pts, 3er lugar 12pts, Goleador 10pts, MVP 10pts)</li>
          <li>• <strong>Del 11 al 28 de junio:</strong> Solo podio con puntos reducidos (Campeón 10pts, Subcampeón 6pts, 3er lugar 6pts). Goleador y MVP bloqueados.</li>
          <li>• <strong>Después del 28 de junio:</strong> Todas las predicciones bloqueadas</li>
        </ul>
      </div>

      <div className="grid gap-6">
        {/* Predicciones de Podio */}
        <div className="bg-white rounded-xl border border-red-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Predicciones del Podio</h3>
          <p className="text-sm text-slate-600 mb-4">
            {knockoutStarted
              ? '🔒 Predicciones bloqueadas (dieciseisavos iniciados)'
              : firstMatchPassed
                ? `⏰ Puntos reducidos - Bloqueo: 28 de junio`
                : `⏰ Puntos completos - Primera reducción: 11 de junio, 3pm`}
          </p>

          <div className="grid gap-4">
            <SpecialPredictionField
              label={`🥇 Campeón (${championPoints} pts)`}
              type="champion"
              value={formData.champion}
              onChange={(v) => setFormData({ ...formData, champion: v })}
              onSave={() => savePrediction('champion', formData.champion, knockoutStartDeadline.toISOString())}
              teams={teams}
              locked={knockoutStarted}
            />
            <SpecialPredictionField
              label={`🥈 Subcampeón (${runnerUpPoints} pts)`}
              type="runner_up"
              value={formData.runner_up}
              onChange={(v) => setFormData({ ...formData, runner_up: v })}
              onSave={() => savePrediction('runner_up', formData.runner_up, knockoutStartDeadline.toISOString())}
              teams={teams}
              locked={knockoutStarted}
            />
            <SpecialPredictionField
              label={`🥉 Tercer Lugar (${thirdPlacePoints} pts)`}
              type="third_place"
              value={formData.third_place}
              onChange={(v) => setFormData({ ...formData, third_place: v })}
              onSave={() => savePrediction('third_place', formData.third_place, knockoutStartDeadline.toISOString())}
              teams={teams}
              locked={knockoutStarted}
            />
          </div>
        </div>

        {/* Predicciones de Jugadores */}
        <div className="bg-white rounded-xl border border-red-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Predicciones de Jugadores</h3>
          <p className="text-sm text-slate-600 mb-4">
            {firstMatchPassed
              ? '🔒 Predicciones bloqueadas (primer partido iniciado)'
              : `⏰ Deadline: 11 de junio, 3pm (inicio del torneo)`}
          </p>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                ⚽ Máximo Goleador ({scorerPoints} pts)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <input
                  type="text"
                  value={formData.top_scorer_first_name}
                  onChange={(e) => setFormData({ ...formData, top_scorer_first_name: e.target.value })}
                  disabled={firstMatchPassed}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  placeholder="Nombre"
                />
                <input
                  type="text"
                  value={formData.top_scorer_last_name}
                  onChange={(e) => setFormData({ ...formData, top_scorer_last_name: e.target.value })}
                  disabled={firstMatchPassed}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  placeholder="Apellido"
                />
                <select
                  value={formData.top_scorer_country}
                  onChange={(e) => setFormData({ ...formData, top_scorer_country: e.target.value })}
                  disabled={firstMatchPassed}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                >
                  <option value="">Seleccionar país...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.name}>
                      {team.flag_emoji} {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  const playerData = JSON.stringify({
                    first_name: formData.top_scorer_first_name,
                    last_name: formData.top_scorer_last_name,
                    country: formData.top_scorer_country
                  })
                  savePrediction('top_scorer', playerData, firstMatchDeadline.toISOString())
                }}
                disabled={firstMatchPassed || !formData.top_scorer_first_name || !formData.top_scorer_last_name || !formData.top_scorer_country}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🌟 Mejor Jugador - MVP ({mvpPoints} pts)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <input
                  type="text"
                  value={formData.mvp_first_name}
                  onChange={(e) => setFormData({ ...formData, mvp_first_name: e.target.value })}
                  disabled={firstMatchPassed}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  placeholder="Nombre"
                />
                <input
                  type="text"
                  value={formData.mvp_last_name}
                  onChange={(e) => setFormData({ ...formData, mvp_last_name: e.target.value })}
                  disabled={firstMatchPassed}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  placeholder="Apellido"
                />
                <select
                  value={formData.mvp_country}
                  onChange={(e) => setFormData({ ...formData, mvp_country: e.target.value })}
                  disabled={firstMatchPassed}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                >
                  <option value="">Seleccionar país...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.name}>
                      {team.flag_emoji} {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  const playerData = JSON.stringify({
                    first_name: formData.mvp_first_name,
                    last_name: formData.mvp_last_name,
                    country: formData.mvp_country
                  })
                  savePrediction('mvp', playerData, firstMatchDeadline.toISOString())
                }}
                disabled={firstMatchPassed || !formData.mvp_first_name || !formData.mvp_last_name || !formData.mvp_country}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SpecialPredictionField({
  label,
  type,
  value,
  onChange,
  onSave,
  teams,
  locked,
}: {
  label: string
  type: string
  value: string
  onChange: (value: string) => void
  onSave: () => void
  teams: Team[]
  locked: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={locked}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
        >
          <option value="">Seleccionar equipo...</option>
          {teams.map((team) => (
            <option key={team.id} value={team.name}>
              {team.flag_emoji} {team.name}
            </option>
          ))}
        </select>
        <button
          onClick={onSave}
          disabled={locked || !value}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Guardar
        </button>
      </div>
      {locked && (
        <p className="text-xs text-red-600 mt-1">Predicción bloqueada (deadline pasado)</p>
      )}
    </div>
  )
}

// ====================================
// RESULTADOS TAB
// ====================================
function ResultadosTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadResultados()
  }, [])

  async function loadResultados() {
    try {
      // Load all users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, display_name')
        .order('display_name')

      // Load all matches with results
      const { data: matches } = await supabase
        .from('matches')
        .select(`
          id,
          match_number,
          phase,
          group_id,
          match_date,
          home_score,
          away_score,
          home_team_label,
          away_team_label,
          home_team:teams!matches_home_team_id_fkey(name, flag_emoji),
          away_team:teams!matches_away_team_id_fkey(name, flag_emoji)
        `)
        .order('match_date')
        .order('match_number')

      // Load all predictions
      const { data: predictions } = await supabase
        .from('predictions')
        .select('user_id, match_id, pred_home, pred_away, points_earned')

      if (!users || !matches || !predictions) {
        setLoading(false)
        return
      }

      // Group matches by date
      const matchesByDate: Record<string, any[]> = {}
      matches.forEach((match: any) => {
        const date = new Date(match.match_date).toLocaleDateString('es-CO', {
          timeZone: 'America/Bogota',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        if (!matchesByDate[date]) {
          matchesByDate[date] = []
        }
        matchesByDate[date].push(match)
      })

      // Organize predictions by user and match
      const predsByUserAndMatch: Record<string, Record<number, any>> = {}
      predictions.forEach((pred: any) => {
        if (!predsByUserAndMatch[pred.user_id]) {
          predsByUserAndMatch[pred.user_id] = {}
        }
        predsByUserAndMatch[pred.user_id][pred.match_id] = pred
      })

      setData({
        users,
        matchesByDate,
        predsByUserAndMatch
      })
    } catch (error) {
      console.error('Error loading resultados:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-12">Cargando...</div>
  if (!data) return <div className="text-center py-12">No hay datos disponibles</div>

  const { users, matchesByDate, predsByUserAndMatch } = data

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Tabla de Resultados por Participante</h2>
      <p className="text-sm text-slate-600">
        Los marcadores se revelan 15 minutos antes del inicio de cada partido
      </p>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {Object.entries(matchesByDate).map(([date, dateMatches]: [string, any]) => {
            // Calculate subtotal by user for this date
            const dateSubtotals: Record<string, number> = {}
            users.forEach((user: any) => {
              dateSubtotals[user.id] = dateMatches.reduce((sum: number, match: any) => {
                const pred = predsByUserAndMatch[user.id]?.[match.id]
                return sum + (pred?.points_earned || 0)
              }, 0)
            })

            return (
              <div key={date} className="mb-8">
                <h3 className="text-lg font-bold text-red-600 mb-3 sticky left-0 bg-white">
                  📅 {date}
                </h3>

                <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-red-600 text-white text-xs">
                      <th className="px-3 py-2 text-left sticky left-0 bg-red-600 z-10 min-w-[200px]">
                        Partido
                      </th>
                      {users.map((user: any) => (
                        <th key={user.id} colSpan={2} className="px-2 py-2 text-center border-l border-red-500">
                          <div className="font-semibold truncate">{user.display_name}</div>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center border-l-2 border-white">
                        Resultado Real
                      </th>
                    </tr>
                    <tr className="bg-red-500 text-white text-xs">
                      <th className="px-3 py-1 sticky left-0 bg-red-500 z-10"></th>
                      {users.map((user: any) => (
                        <React.Fragment key={user.id}>
                          <th className="px-1 py-1 text-center border-l border-red-400">Pred</th>
                          <th className="px-1 py-1 text-center">Pts</th>
                        </React.Fragment>
                      ))}
                      <th className="px-3 py-1 border-l-2 border-white"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateMatches.map((match: any, idx: number) => {
                      const matchDate = new Date(match.match_date)
                      const fifteenMinBefore = new Date(matchDate.getTime() - 15 * 60 * 1000)
                      const isPredictionVisible = new Date() >= fifteenMinBefore
                      const hasResult = match.home_score !== null && match.away_score !== null

                      const homeTeamDisplay = match.home_team?.name || match.home_team_label || 'TBD'
                      const awayTeamDisplay = match.away_team?.name || match.away_team_label || 'TBD'
                      const phaseLabels: Record<string, string> = {
                        groups: 'Grupos',
                        r16: 'Octavos',
                        r8: 'Cuartos',
                        r4: 'Semifinal',
                        '3rd': '3er Lugar',
                        final: 'Final'
                      }

                      return (
                        <tr key={match.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-3 py-2 text-sm sticky left-0 bg-inherit z-10 border-r">
                            <div className="font-medium">
                              {match.home_team?.flag_emoji} {homeTeamDisplay} vs{' '}
                              {match.away_team?.flag_emoji} {awayTeamDisplay}
                            </div>
                            <div className="text-xs text-slate-500">
                              #{match.match_number} • {phaseLabels[match.phase] || match.phase}
                              {match.group_id && ` • Grupo ${match.group_id}`}
                            </div>
                          </td>

                          {users.map((user: any) => {
                            const pred = predsByUserAndMatch[user.id]?.[match.id]

                            return (
                              <React.Fragment key={user.id}>
                                <td className="px-1 py-2 text-center text-sm border-l">
                                  {pred && isPredictionVisible ? (
                                    <span className="font-mono">{pred.pred_home}-{pred.pred_away}</span>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                                <td className="px-1 py-2 text-center text-sm">
                                  {pred?.points_earned > 0 ? (
                                    <span className="font-semibold text-green-600">
                                      +{pred.points_earned}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">0</span>
                                  )}
                                </td>
                              </React.Fragment>
                            )
                          })}

                          <td className="px-3 py-2 text-center text-sm font-bold border-l-2">
                            {hasResult ? (
                              <span className="text-red-600 font-mono">
                                {match.home_score}-{match.away_score}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}

                    {/* Subtotal Row */}
                    <tr className="bg-slate-100 font-bold">
                      <td className="px-3 py-2 text-sm sticky left-0 bg-slate-100 z-10 border-r">
                        Subtotal {date}
                      </td>
                      {users.map((user: any) => (
                        <React.Fragment key={user.id}>
                          <td className="px-1 py-2 text-center border-l"></td>
                          <td className="px-1 py-2 text-center text-sm text-red-600">
                            {dateSubtotals[user.id]}
                          </td>
                        </React.Fragment>
                      ))}
                      <td className="px-3 py-2 border-l-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })}

          {/* Grand Total Row */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden mt-4">
            <table className="w-full">
              <tbody>
                <tr className="bg-red-600 text-white font-bold">
                  <td className="px-3 py-3 text-sm sticky left-0 bg-red-600 z-10 min-w-[200px]">
                    TOTAL GENERAL
                  </td>
                  {users.map((user: any) => {
                    const totalPoints = Object.values(predsByUserAndMatch[user.id] || {}).reduce(
                      (sum: number, pred: any) => sum + (pred.points_earned || 0),
                      0
                    )

                    return (
                      <React.Fragment key={user.id}>
                        <td className="px-1 py-3 text-center border-l border-red-500"></td>
                        <td className="px-1 py-3 text-center text-base">
                          {totalPoints}
                        </td>
                      </React.Fragment>
                    )
                  })}
                  <td className="px-3 py-3 border-l-2 border-white"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// ESTADÍSTICAS TAB
// ============================================

function EstadisticasTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadEstadisticas()
  }, [])

  async function loadEstadisticas() {
    try {
      // Load special predictions grouped by type
      // Get all predictions with their IDs and updated_at to filter latest per user-type
      const { data: specialPreds } = await supabase
        .from('special_predictions')
        .select('id, type, value, user_id, updated_at')
        .order('updated_at', { ascending: false })

      // Load all predictions with match info to get most picked scores
      // Order by updated_at to get latest predictions per user-match
      const { data: predictions } = await supabase
        .from('predictions')
        .select(`
          pred_home,
          pred_away,
          match_id,
          points_earned,
          user_id,
          updated_at,
          match:matches!inner(
            match_number,
            phase,
            match_date,
            home_team_label,
            away_team_label,
            home_team:teams!matches_home_team_id_fkey(name, flag_emoji),
            away_team:teams!matches_away_team_id_fkey(name, flag_emoji)
          )
        `)
        .order('updated_at', { ascending: false })

      // Load top 10 users by points
      const { data: users } = await supabase
        .from('profiles')
        .select('display_name, total_points')
        .order('total_points', { ascending: false })
        .limit(10)

      // Calculate current streaks
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('id, display_name')

      const { data: allPredictions } = await supabase
        .from('predictions')
        .select(`
          user_id,
          points_earned,
          match_id,
          match:matches!inner(match_number, status)
        `)
        .eq('match:matches.status', 'finished')
        .order('match:matches.match_number', { ascending: false })

      // Calculate streaks
      const streaks: any[] = []
      allUsers?.forEach((user: any) => {
        const userPreds = allPredictions?.filter((p: any) => p.user_id === user.id) || []
        let currentStreak = 0
        for (const pred of userPreds) {
          if (pred.points_earned > 0) {
            currentStreak++
          } else {
            break
          }
        }
        if (currentStreak > 0) {
          streaks.push({ display_name: user.display_name, streak: currentStreak })
        }
      })
      streaks.sort((a, b) => b.streak - a.streak)

      setData({ specialPreds, predictions, users, streaks })
    } catch (error) {
      console.error('Error loading estadísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-white">Cargando estadísticas...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-white">
        No hay datos de estadísticas disponibles
      </div>
    )
  }

  // Group special predictions by type - only count latest prediction per user per type
  const latestPredsByUserAndType: Record<string, any> = {}

  // First, get only the latest prediction for each user-type combination
  // Data is already ordered by updated_at desc, so first occurrence is the latest
  data.specialPreds?.forEach((pred: any) => {
    const key = `${pred.user_id}-${pred.type}`
    if (!latestPredsByUserAndType[key]) {
      latestPredsByUserAndType[key] = pred
    }
  })

  // Now group by type with unique predictions
  const specialByType: Record<string, Record<string, number>> = {}
  Object.values(latestPredsByUserAndType).forEach((pred: any) => {
    if (!specialByType[pred.type]) {
      specialByType[pred.type] = {}
    }

    // Parse JSON values for MVP and top_scorer (they contain first_name/last_name)
    let displayValue = pred.value
    if (pred.type === 'mvp' || pred.type === 'top_scorer') {
      try {
        const parsed = typeof pred.value === 'string' ? JSON.parse(pred.value) : pred.value
        if (parsed.first_name && parsed.last_name) {
          displayValue = `${parsed.first_name} ${parsed.last_name}`
        }
      } catch (e) {
        // If parsing fails, use value as is
        displayValue = pred.value
      }
    }

    if (!specialByType[pred.type][displayValue]) {
      specialByType[pred.type][displayValue] = 0
    }
    specialByType[pred.type][displayValue]++
  })

  // Group predictions by match to find most picked scores
  // First, filter to get only latest prediction per user-match
  const latestPredsByUserAndMatch: Record<string, any> = {}
  data.predictions?.forEach((pred: any) => {
    const key = `${pred.user_id}-${pred.match_id}`
    if (!latestPredsByUserAndMatch[key]) {
      latestPredsByUserAndMatch[key] = pred
    }
  })

  // Now count scores by match with unique predictions only
  const predsByMatch: Record<number, Record<string, number>> = {}
  Object.values(latestPredsByUserAndMatch).forEach((pred: any) => {
    const matchId = pred.match_id
    const score = `${pred.pred_home}-${pred.pred_away}`
    if (!predsByMatch[matchId]) {
      predsByMatch[matchId] = {}
    }
    if (!predsByMatch[matchId][score]) {
      predsByMatch[matchId][score] = 0
    }
    predsByMatch[matchId][score]++
  })

  const COLORS = ['#dc2626', '#ca8a04', '#65a30d', '#0891b2', '#4f46e5', '#9333ea', '#db2777']

  const typeLabels: Record<string, string> = {
    champion: 'Campeón',
    runner_up: 'Subcampeón',
    third_place: 'Tercer Lugar',
    top_scorer: 'Goleador',
    mvp: 'MVP'
  }

  return (
    <div className="space-y-8">
      {/* Special Predictions Distribution */}
      <div className="bg-white rounded-lg border border-red-100 p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">📊 Distribución de Predicciones Especiales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(specialByType).map(([type, values]) => {
            const chartData = Object.entries(values).map(([value, count]) => ({
              name: value,
              value: count
            }))

            return (
              <div key={type} className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-3 text-center">
                  {typeLabels[type] || type}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => {
                        const pct = ((percent || 0) * 100).toFixed(0)
                        // Truncate name if too long
                        const displayName = name && name.length > 10 ? name.substring(0, 10) + '...' : (name || '')
                        return `${displayName} ${pct}%`
                      }}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      style={{ fontSize: '11px', fontWeight: '600' }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )
          })}
        </div>
      </div>

      {/* General Ranking Chart */}
      <div className="bg-white rounded-lg border border-red-100 p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">🏆 Ranking General (Top 10)</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data.users} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="display_name" type="category" width={150} style={{ fontSize: '12px' }} />
            <Tooltip />
            <Bar dataKey="total_points" fill="#dc2626" name="Puntos">
              {data.users.map((entry: any, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    index === 0
                      ? '#ca8a04' // Gold for 1st
                      : index === 1
                      ? '#9ca3af' // Silver for 2nd
                      : index === 2
                      ? '#c2410c' // Bronze for 3rd
                      : '#dc2626' // Red for rest
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Current Streaks */}
      <div className="bg-white rounded-lg border border-red-100 p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">🔥 Rachas Actuales</h2>
        {data.streaks.length === 0 ? (
          <p className="text-slate-600 text-center py-4">No hay rachas activas</p>
        ) : (
          <div className="space-y-3">
            {data.streaks.slice(0, 5).map((streak: any, index: number) => (
              <div
                key={index}
                className="bg-slate-50 rounded-lg p-4 flex justify-between items-center"
              >
                <span className="text-slate-800 font-medium">{streak.display_name}</span>
                <span className="text-yellow-600 font-bold text-lg">
                  {streak.streak} {streak.streak === 1 ? 'partido' : 'partidos'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Most Picked Scores by Match */}
      <div className="bg-white rounded-lg border border-red-100 p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">🎯 Marcadores Más Escogidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(predsByMatch)
            .map(([matchId, scores]) => {
              const matchInfo = data.predictions.find((p: any) => p.match_id === parseInt(matchId))
              return {
                matchId,
                scores,
                matchNumber: matchInfo?.match?.match_number || 999,
                homeTeam: matchInfo?.match?.home_team,
                awayTeam: matchInfo?.match?.away_team,
                homeLabel: matchInfo?.match?.home_team_label,
                awayLabel: matchInfo?.match?.away_team_label
              }
            })
            .sort((a, b) => a.matchNumber - b.matchNumber)
            .map(({ matchId, scores, matchNumber, homeTeam, awayTeam, homeLabel, awayLabel }) => {
              // Prepare chart data sorted by count descending
              const chartData = Object.entries(scores)
                .map(([score, count]) => ({
                  score,
                  count
                }))
                .sort((a, b) => b.count - a.count)

              const homeDisplay = homeTeam?.name || homeLabel || 'TBD'
              const awayDisplay = awayTeam?.name || awayLabel || 'TBD'

              return (
                <div key={matchId} className="bg-slate-50 rounded-lg p-4">
                  <div className="mb-4">
                    <h3 className="text-slate-800 font-semibold text-center mb-2">
                      Partido #{matchNumber === 999 ? matchId : matchNumber}
                    </h3>
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                      <span>{homeTeam?.flag_emoji || '🏴'}</span>
                      <span className="font-medium">{homeDisplay}</span>
                      <span>vs</span>
                      <span className="font-medium">{awayDisplay}</span>
                      <span>{awayTeam?.flag_emoji || '🏴'}</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="score"
                        style={{ fontSize: '11px' }}
                        tick={(props) => {
                          const { x, y, payload } = props
                          const [home, away] = payload.value.split('-')
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text
                                x={0}
                                y={0}
                                dy={10}
                                textAnchor="middle"
                                fill="#475569"
                                fontSize="11"
                              >
                                {homeTeam?.flag_emoji || '🏴'} {home}-{away} {awayTeam?.flag_emoji || '🏴'}
                              </text>
                            </g>
                          )
                        }}
                        height={40}
                      />
                      <YAxis style={{ fontSize: '11px' }} allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-2 border border-slate-200 rounded shadow-sm">
                                <p className="text-sm font-semibold">{payload[0].payload.score}</p>
                                <p className="text-sm text-slate-600">
                                  {payload[0].value} {payload[0].value === 1 ? 'voto' : 'votos'}
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="count" fill="#dc2626" name="Votos" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
