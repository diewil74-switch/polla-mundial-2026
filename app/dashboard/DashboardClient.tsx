'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Flag } from '@/components/ui/Flag'
import { ScoreStepper } from '@/components/ui/ScoreStepper'
import { PtsBadge } from '@/components/ui/PtsBadge'

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
  const [activeTab, setActiveTab] = useState('inicio')
  const [currentProfile, setCurrentProfile] = useState(profile)
  const [inicioReloadKey, setInicioReloadKey] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: '🏠' },
    { id: 'predictions', label: 'Predicciones', icon: '⚽' },
    { id: 'calendar', label: 'Calendario', icon: '📅' },
    { id: 'groups', label: 'Grupos', icon: '🏆' },
    { id: 'bracket', label: 'Bracket', icon: '🏅' },
    { id: 'special', label: 'Especiales', icon: '⭐' },
    { id: 'ranking', label: 'Ranking', icon: '📊' },
    { id: 'resultados', label: 'Resultados', icon: '📋' },
    { id: 'estadisticas', label: 'Estadísticas', icon: '📈' },
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
    <div>
      <header className="topbar">
        <div className="brand">
          <span className="crest">
            <img
              src="/tournaments_fifa-world-cup-2026_3000x3000.football-logos.cc.png"
              alt="FIFA World Cup 2026"
              style={{ width: '52px', height: '52px', objectFit: 'contain' }}
            />
          </span>
          <div className="titles">
            <div className="name">Polla <b>Mundial</b></div>
          </div>
        </div>
        <nav className="nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => {
                if (tab.id === 'inicio') {
                  setInicioReloadKey(prev => prev + 1)
                }
                setActiveTab(tab.id)
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="topbar-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {profile?.role === 'admin' && (
            <a href="/admin" className="btn-ghost">
              🛡️ Admin
            </a>
          )}
          <a href="/rules" target="_blank" rel="noopener noreferrer" className="btn-ghost">
            📋 Reglas
          </a>
          <button onClick={handleSignOut} className="btn-ghost" title="Cerrar sesión">
            🚪
          </button>
        </div>
      </header>

      <main className="app">
        {activeTab === 'inicio' && <InicioTab key={inicioReloadKey} userId={user.id} currentProfile={currentProfile} profile={profile} onNavigate={setActiveTab} />}
        {activeTab === 'predictions' && <PredictionsTab userId={user.id} currentProfile={currentProfile} />}
        {activeTab === 'calendar' && <CalendarTab userId={user.id} />}
        {activeTab === 'groups' && <GroupsTab userId={user.id} />}
        {activeTab === 'bracket' && <BracketTab userId={user.id} />}
        {activeTab === 'special' && <SpecialTab userId={user.id} />}
        {activeTab === 'ranking' && <RankingTab currentUserId={user.id} />}
        {activeTab === 'resultados' && <ResultadosTab currentUserId={user.id} />}
        {activeTab === 'estadisticas' && <EstadisticasTab />}
      </main>
    </div>
  )
}

// Tab: Inicio/Home
function InicioTab({
  userId,
  currentProfile,
  profile,
  onNavigate
}: {
  userId: string
  currentProfile: Profile | null
  profile: Profile | null
  onNavigate: (tab: string) => void
}) {
  const [matches, setMatches] = useState<Match[]>([])
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({})
  const [specialPredictions, setSpecialPredictions] = useState<SpecialPrediction[]>([])
  const [ranking, setRanking] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    console.log('[InicioTab v2] 🔄 Cargando datos para userId:', userId)

    // Load upcoming matches
    const { data: matchesData } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      `)
      .is('home_score', null)
      .order('match_date', { ascending: true })
      .limit(4)

    // Load all matches to count
    const { data: allMatchesData } = await supabase
      .from('matches')
      .select('*')

    // Load user predictions
    const { data: predsData } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId)

    // Load special predictions
    const { data: specialData, error: specialError } = await supabase
      .from('special_predictions')
      .select('*')
      .eq('user_id', userId)

    console.log('[InicioTab] 📊 Special predictions cargadas:', specialData)
    console.log('[InicioTab] 🔍 Filtrando para userId:', userId)
    console.log('[InicioTab] 🔍 user_ids en los datos:', specialData?.map(s => s.user_id))
    if (specialError) console.error('[InicioTab] ❌ Error:', specialError)

    // Load full ranking
    const { data: allProfilesData } = await supabase
      .from('profiles')
      .select('*')

    if (matchesData) setMatches(matchesData as Match[])
    if (allMatchesData) setAllMatches(allMatchesData as Match[])
    if (predsData) {
      const predMap: Record<number, Prediction> = {}
      predsData.forEach((p: any) => { predMap[p.match_id] = p })
      setPredictions(predMap)
    }
    if (specialData) setSpecialPredictions(specialData as SpecialPrediction[])
    if (allProfilesData) {
      const ranked = [...allProfilesData].sort((a: any, b: any) => b.total_points - a.total_points)
      setRanking(ranked as Profile[])
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="section-loading">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    )
  }

  const totalMatches = allMatches.length
  const completedPredictions = Object.keys(predictions).length
  const groupMatches = allMatches.filter(m => m.phase === 'groups')
  const knockoutMatches = allMatches.filter(m => m.phase !== 'groups')
  const groupPredictions = Object.keys(predictions).filter(
    matchId => {
      const match = allMatches.find(m => m.id === parseInt(matchId))
      return match && match.phase === 'groups'
    }
  ).length
  const knockoutPredictions = completedPredictions - groupPredictions
  const userRank = ranking.findIndex(p => p.id === userId) + 1

  const totalPrizePool = ranking.length * 100_000
  const formatCOP = (n: number) => '$' + n.toLocaleString('es-CO')
  const prize1st = Math.round(totalPrizePool * 0.60)
  const prize2nd = Math.round(totalPrizePool * 0.25)
  const prize3rd = Math.round(totalPrizePool * 0.15)

  // Get special predictions
  const championPred = specialPredictions.find(sp => sp.type === 'champion')
  const runnerupPred = specialPredictions.find(sp => sp.type === 'runner_up')
  const thirdPred = specialPredictions.find(sp => sp.type === 'third_place')
  const scorerPred = specialPredictions.find(sp => sp.type === 'top_scorer')
  const mvpPred = specialPredictions.find(sp => sp.type === 'mvp')

  const specialsCompleted = [championPred, runnerupPred, thirdPred, scorerPred, mvpPred].filter(p => p?.value).length

  // Helper para mostrar el valor de las predicciones especiales
  const getSpecialValue = (pred: SpecialPrediction | undefined, type: string) => {
    if (!pred?.value) return '—'

    console.log(`[${type}] Raw value:`, pred.value)

    // Verificar si ya es un string simple (no JSON)
    if (!pred.value.startsWith('{') && !pred.value.startsWith('[')) {
      console.log(`[${type}] Simple string, returning:`, pred.value)
      return pred.value
    }

    try {
      const parsed = JSON.parse(pred.value)
      console.log(`[${type}] Parsed JSON:`, parsed)

      // Si es un array, tomar el primer elemento
      if (Array.isArray(parsed) && parsed.length > 0) {
        const item = parsed[0]
        if (typeof item === 'string') {
          console.log(`[${type}] Array string, returning:`, item)
          return item
        }
        if (item && typeof item === 'object' && item.name) {
          console.log(`[${type}] Array object with name, returning:`, item.name)
          return item.name
        }
      }

      // Si es un objeto con name, devolver solo el name
      if (parsed && typeof parsed === 'object') {
        // Caso especial: first_name y last_name separados
        if (parsed.first_name && parsed.last_name) {
          const fullName = `${parsed.first_name.trim()} ${parsed.last_name.trim()}`
          console.log(`[${type}] Object with first_name + last_name, returning:`, fullName)
          return fullName
        }
        if (parsed.name) {
          console.log(`[${type}] Object with name, returning:`, parsed.name)
          return parsed.name
        }
        if (parsed.label) {
          console.log(`[${type}] Object with label, returning:`, parsed.label)
          return parsed.label
        }
        if (parsed.value) {
          console.log(`[${type}] Object with value, returning:`, parsed.value)
          return parsed.value
        }
      }

      console.log(`[${type}] No match, returning original:`, pred.value)
      return pred.value
    } catch (error) {
      console.error(`[${type}] Error parsing:`, error, pred.value)
      return pred.value
    }
  }

  return (
    <div>
      <div className="section-head">
        <div className="h-left">
          <h1>
            Hola, <span className="accent">{currentProfile?.display_name}</span> 👋
          </h1>
          <p>Tu resumen de la Polla Mundial 2026. Mantén tus predicciones actualizadas para ganar puntos.</p>
        </div>
      </div>

      <div className="home-grid">
        {/* Tarjeta principal de puesto */}
        <div className="card home-rank">
          <div className="hr-left">
            <div className="hr-rank">
              <span className="hr-hash">#</span>
              <span className="hr-n num">{userRank || '—'}</span>
            </div>
            <div className="hr-info">
              <div className="hr-pts num">{ranking.find(p => p.id === userId)?.total_points || 0}<small> pts</small></div>
              <div className="hr-sub">{completedPredictions}/{totalMatches} predicciones cargadas</div>
            </div>
            <button className="btn-ghost" onClick={() => onNavigate('ranking')}>
              Ver tabla completa →
            </button>
          </div>
          <div className="hr-prize">
            <div className="hr-prize-pool">
              <span className="hr-prize-label">Bote</span>
              <span className="hr-prize-total">{formatCOP(totalPrizePool)}</span>
            </div>
            <div className="hr-prize-rows">
              <div className="hr-prize-row"><span>🥇 60%</span><span>{formatCOP(prize1st)}</span></div>
              <div className="hr-prize-row"><span>🥈 25%</span><span>{formatCOP(prize2nd)}</span></div>
              <div className="hr-prize-row"><span>🥉 15%</span><span>{formatCOP(prize3rd)}</span></div>
            </div>
          </div>
        </div>

        {/* KPIs rápidos */}
        <div className="card home-kpi" onClick={() => onNavigate('predictions')} role="button">
          <div className="hk-icon">⚽</div>
          <div className="hk-t">Predicciones Cargadas</div>
          <div className="hk-n num">{groupPredictions}</div>
          <div className="hk-l">fase de grupos ({groupMatches.length} partidos)</div>
        </div>

        <div className="card home-kpi" onClick={() => onNavigate('bracket')} role="button">
          <div className="hk-icon">🏅</div>
          <div className="hk-t">Predicciones Cargadas</div>
          <div className="hk-n num">{knockoutPredictions}</div>
          <div className="hk-l">fase eliminatoria ({knockoutMatches.length} partidos)</div>
        </div>

        {/* Próximos partidos */}
        <div className="card home-next">
          <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', paddingRight: 18 }}>
            <div>
              <div className="ct">⏱️ Próximos partidos</div>
              <div className="cs">Aún puedes editar tu marcador</div>
            </div>
            <button className="btn-ghost sm" onClick={() => onNavigate('predictions')}>
              Predecir →
            </button>
          </div>
          <div className="hn-list">
            {matches.slice(0, 4).map((m) => {
              const pred = predictions[m.id]
              return (
                <div className="hn-row" key={m.id}>
                  <span className="hn-team r">
                    <span className="cf-name">{m.home_team?.name || m.home_team_label || '—'}</span>
                    <span className="flag" style={{ fontSize: 20, lineHeight: 1 }}>
                      {m.home_team?.flag_emoji || '🏴'}
                    </span>
                  </span>
                  <span className="hn-pred num">
                    {pred ? `${pred.pred_home}–${pred.pred_away}` : '—'}
                  </span>
                  <span className="hn-team l">
                    <span className="flag" style={{ fontSize: 20, lineHeight: 1 }}>
                      {m.away_team?.flag_emoji || '🏴'}
                    </span>
                    <span className="cf-name">{m.away_team?.name || m.away_team_label || '—'}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Predicciones Especiales */}
        <div className="card home-mini">
          <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', paddingRight: 18 }}>
            <div>
              <div className="ct">⭐ Predicciones Especiales</div>
              <div className="cs">{specialsCompleted}/5 completadas</div>
            </div>
            <button className="btn-ghost sm" onClick={() => onNavigate('special')}>
              Editar →
            </button>
          </div>
          <div className="hm-list">
            <div className="hm-row" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
              <span className="hm-av">🏆</span>
              <span className="hm-name" style={{ overflow: 'visible', textOverflow: 'clip' }}>Campeón</span>
              <span className="hm-pts">{getSpecialValue(championPred, 'champion')}</span>
            </div>
            <div className="hm-row" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
              <span className="hm-av">🥈</span>
              <span className="hm-name" style={{ overflow: 'visible', textOverflow: 'clip' }}>Subcampeón</span>
              <span className="hm-pts">{getSpecialValue(runnerupPred, 'runner_up')}</span>
            </div>
            <div className="hm-row" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
              <span className="hm-av">🥉</span>
              <span className="hm-name" style={{ overflow: 'visible', textOverflow: 'clip' }}>Tercer Lugar</span>
              <span className="hm-pts">{getSpecialValue(thirdPred, 'third_place')}</span>
            </div>
            <div className="hm-row" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
              <span className="hm-av">⚽</span>
              <span className="hm-name" style={{ overflow: 'visible', textOverflow: 'clip' }}>Goleador</span>
              <span className="hm-pts">{getSpecialValue(scorerPred, 'top_scorer')}</span>
            </div>
            <div className="hm-row" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
              <span className="hm-av">🌟</span>
              <span className="hm-name" style={{ overflow: 'visible', textOverflow: 'clip' }}>MVP del Mundial</span>
              <span className="hm-pts">{getSpecialValue(mvpPred, 'mvp')}</span>
            </div>
          </div>
        </div>

        {/* Mini ranking */}
        <div className="card home-mini">
          <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', paddingRight: 18 }}>
            <div>
              <div className="ct">🏆 Ranking general</div>
            </div>
            <button className="btn-ghost sm" onClick={() => onNavigate('ranking')}>
              Ranking →
            </button>
          </div>
          <div className="hm-list">
            {ranking.slice(0, 5).map((p, idx) => {
              const initials = p.display_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div className={`hm-row${p.id === userId ? ' me' : ''}`} key={p.id}>
                  <span className="hm-rank num">{idx + 1}</span>
                  <span className="hm-av">{initials}</span>
                  <span className="hm-name">
                    {p.display_name}{p.id === userId ? ' (tú)' : ''}
                  </span>
                  <span className="hm-pts num">{p.total_points}<small> pts</small></span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Tab 1: Predictions
function PredictionsTab({ userId, currentProfile }: { userId: string; currentProfile: Profile | null }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'played'>('all')
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
      return false
    } else {
      console.log('✅ Predicción guardada exitosamente:', data)
      await loadData()
      return true
    }
  }

  async function exportToPDF() {
    const userName = currentProfile?.display_name || 'Usuario'

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

  // Group matches by day
  const dayGroups = matches.reduce((acc, match) => {
    const matchDate = new Date(match.match_date)
    const dateKey = matchDate.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    if (!acc[dateKey]) {
      acc[dateKey] = {
        label: matchDate.toLocaleDateString('es-CO', { weekday: 'long' }),
        date: matchDate.toLocaleDateString('es-CO', {
          day: 'numeric',
          month: 'long'
        }),
        matches: [],
        played: new Date() > matchDate
      }
    }
    acc[dateKey].matches.push(match)
    return acc
  }, {} as Record<string, { label: string; date: string; matches: Match[]; played: boolean }>)

  // Calculate stats
  const totalMatches = matches.length
  const completedCount = Object.keys(predictions).length
  const pendingCount = matches.filter(m => new Date() < new Date(m.match_date)).length

  return (
    <div>
      <div className="section-head">
        <div className="h-left">
          <h1>Mis <span className="accent">predicciones</span></h1>
          <p>Ingresa tu marcador para cada partido de la fase de grupos. Puedes editar el marcador hasta 15 min antes del inicio de cada partido.</p>
        </div>
        <button
          onClick={exportToPDF}
          className="btn-ghost"
          style={{ fontSize: '0.9rem' }}
        >
          📄 Exportar PDF
        </button>
      </div>

      <div className="pred-toolbar">
        <div className="pred-stats">
          <div className="ps-item">
            <span className="ps-n num">{completedCount}</span>
            <span className="ps-l">de {totalMatches} cargadas</span>
          </div>
          <div className="ps-div"></div>
          <div className="ps-item">
            <span className="ps-n num">{totalMatches - completedCount}</span>
            <span className="ps-l">te faltan</span>
          </div>
          <div className="ps-div"></div>
          <div className="ps-item">
            <span className="ps-n">{currentProfile?.display_name || 'Usuario'}</span>
            <span className="ps-l">tu cuenta</span>
          </div>
        </div>
        <div className="pred-filters">
          <button
            className={`pill${filter === 'all' ? ' on' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todos
          </button>
          <button
            className={`pill${filter === 'pending' ? ' on' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Por jugar
          </button>
          <button
            className={`pill${filter === 'played' ? ' on' : ''}`}
            onClick={() => setFilter('played')}
          >
            Jugados
          </button>
        </div>
      </div>

      {Object.entries(dayGroups).map(([dateKey, day]) => {
        let filteredMatches = day.matches
        if (filter === 'pending') {
          filteredMatches = filteredMatches.filter(m => new Date() < new Date(m.match_date))
        }
        if (filter === 'played') {
          filteredMatches = filteredMatches.filter(m => new Date() >= new Date(m.match_date))
        }
        if (filteredMatches.length === 0) return null

        return (
          <div className="pred-day" key={dateKey}>
            <div className="pred-day-head">
              <span className="pdh-label">{day.label}</span>
              <span className="pdh-date">{day.date}</span>
              <span className={`day-tag ${day.played ? 'live' : 'soon'}`}>
                {day.played ? 'Jugada · cerrada' : 'Abierta'}
              </span>
            </div>
            <div className="pred-list">
              {filteredMatches.map((match) => {
                const prediction = predictions[match.id]
                const fifteenMinBefore = new Date(new Date(match.match_date).getTime() - 15 * 60 * 1000)
                const hasResult = match.home_score !== null && match.away_score !== null
                const canEdit = new Date() < fifteenMinBefore
                const pts = prediction?.points_earned || 0

                return (
                  <MatchPredictionCard
                    key={match.id}
                    match={match}
                    prediction={prediction}
                    canEdit={canEdit}
                    hasResult={hasResult}
                    pts={pts}
                    onSave={savePrediction}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="save-hint">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        Haz clic en "Guardar" para confirmar tus predicciones
      </div>
    </div>
  )
}

function MatchPredictionCard({
  match,
  prediction,
  canEdit,
  hasResult,
  pts,
  onSave,
}: {
  match: Match
  prediction?: Prediction
  canEdit: boolean
  hasResult: boolean
  pts: number
  onSave: (matchId: number, predHome: number, predAway: number) => Promise<boolean>
}) {
  const [predHome, setPredHome] = useState(prediction?.pred_home ?? 0)
  const [predAway, setPredAway] = useState(prediction?.pred_away ?? 0)
  const [saving, setSaving] = useState(false)

  // Update local state when prediction changes
  useEffect(() => {
    setPredHome(prediction?.pred_home ?? 0)
    setPredAway(prediction?.pred_away ?? 0)
  }, [prediction])

  const matchDate = new Date(match.match_date)
  const kickoffTime = matchDate.toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
  })

  const hasChanges = !prediction || predHome !== prediction.pred_home || predAway !== prediction.pred_away

  const handleSave = async () => {
    setSaving(true)
    await onSave(match.id, predHome, predAway)
    setSaving(false)
  }

  return (
    <div className={`pred-card${canEdit ? ' open' : ' locked'}`}>
      <div className="pc-team home">
        <Flag emoji={match.home_team?.flag_emoji || ''} name={match.home_team?.name} size={26} />
        <span className="pc-tn">{match.home_team?.name}</span>
      </div>
      <div className="pc-center">
        <ScoreStepper
          value={predHome}
          disabled={!canEdit}
          onChange={setPredHome}
        />
        <span className="pc-x">:</span>
        <ScoreStepper
          value={predAway}
          disabled={!canEdit}
          onChange={setPredAway}
        />
      </div>
      <div className="pc-team away">
        <span className="pc-tn">{match.away_team?.name}</span>
        <Flag emoji={match.away_team?.flag_emoji || ''} name={match.away_team?.name} size={26} />
      </div>
      <div className="pc-result">
        {hasResult ? (
          <>
            <span className="pc-real num">Real {match.home_score}–{match.away_score}</span>
            <PtsBadge pts={pts} />
          </>
        ) : canEdit && hasChanges ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-save-pred"
          >
            {saving ? 'Guardando…' : '💾 Guardar'}
          </button>
        ) : (
          <span className="pc-time">🕑 {kickoffTime}</span>
        )}
      </div>
    </div>
  )
}

// Tab 2: Calendar
function CalendarTab({ userId }: { userId: string }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, Prediction>>({})
  const [loading, setLoading] = useState(true)
  const [openFilter, setOpenFilter] = useState<string>('all')
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

    // Load user predictions
    const { data: predsData } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId)

    if (matchesData) setMatches(matchesData as any)

    if (predsData) {
      const predMap: Record<number, Prediction> = {}
      predsData.forEach((p: any) => {
        predMap[p.match_id] = p
      })
      setPredictions(predMap)
    }

    setLoading(false)
  }

  if (loading) return <div className="text-center py-12">Cargando...</div>

  // Group matches by matchday (jornada) for groups phase
  const groupMatches = matches.filter(m => m.phase === 'groups')

  // Sort by match number to determine matchdays
  const sortedGroupMatches = [...groupMatches].sort((a, b) => a.match_number - b.match_number)

  // Each group has 12 teams, so 6 matches per matchday per group
  // With 12 groups, that's 24 matches per jornada
  const matchdaySize = 24
  const matchdays: { id: string; kind: 'group' | 'ko'; label: string; date: string; matches: Match[]; played: boolean }[] = []

  for (let i = 0; i < 3; i++) {
    const start = i * matchdaySize
    const end = (i + 1) * matchdaySize
    const jornadaMatches = sortedGroupMatches.slice(start, end)

    if (jornadaMatches.length > 0) {
      const firstMatch = jornadaMatches[0]
      const lastMatch = jornadaMatches[jornadaMatches.length - 1]
      const firstDate = new Date(firstMatch.match_date)
      const lastDate = new Date(lastMatch.match_date)

      const dateRange = `${firstDate.toLocaleDateString('es-CO', { day: 'numeric' })}–${lastDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`

      matchdays.push({
        id: `md${i + 1}`,
        kind: 'group',
        label: `Jornada ${i + 1}`,
        date: dateRange,
        matches: jornadaMatches,
        played: new Date() > lastDate
      })
    }
  }

  // Knockout rounds
  const koRounds = [
    { id: 'r32', label: 'Dieciseisavos', filter: (m: Match) => m.match_number >= 73 && m.match_number <= 88 },
    { id: 'r16', label: 'Octavos', filter: (m: Match) => m.match_number >= 89 && m.match_number <= 96 },
    { id: 'r8', label: 'Cuartos', filter: (m: Match) => m.match_number >= 97 && m.match_number <= 100 },
    { id: 'r4', label: 'Semifinales', filter: (m: Match) => m.match_number >= 101 && m.match_number <= 102 },
    { id: '3rd', label: 'Tercer Lugar', filter: (m: Match) => m.match_number === 103 },
    { id: 'final', label: 'Final', filter: (m: Match) => m.match_number === 104 },
  ].map(round => {
    const roundMatches = matches.filter(round.filter)
    if (roundMatches.length === 0) return null

    const firstMatch = roundMatches[0]
    const lastMatch = roundMatches[roundMatches.length - 1]
    const firstDate = new Date(firstMatch.match_date)
    const lastDate = new Date(lastMatch.match_date)

    const dateRange = firstDate.getDate() === lastDate.getDate()
      ? firstDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
      : `${firstDate.toLocaleDateString('es-CO', { day: 'numeric' })}–${lastDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`

    return {
      id: round.id,
      kind: 'ko' as const,
      label: round.label,
      date: dateRange,
      matches: roundMatches,
      played: false
    }
  }).filter(Boolean) as typeof matchdays[0][]

  const allSections = [...matchdays, ...koRounds]
  const shownSections = allSections.filter(section => {
    if (openFilter === 'all') return true
    if (openFilter === 'ko') return section.kind === 'ko'
    return section.id === openFilter
  })

  return (
    <div>
      <div className="section-head">
        <div className="h-left">
          <h1><span className="accent">Calendario</span></h1>
          <p>Los 104 partidos del Mundial: fase de grupos y eliminatorias. En las eliminatorias verás el cruce (p. ej. <b>1º Grupo A</b>) y el nombre de los países aparecerá automáticamente a medida que se complete el bracket.</p>
        </div>
        <div className="h-right" style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, fontWeight: 600 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block' }}></span>
            <span>Marcador real</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }}></span>
            <span>Tu marcador</span>
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          className={`pill${openFilter === 'all' ? ' on' : ''}`}
          onClick={() => setOpenFilter('all')}
        >
          Todas
        </button>
        {matchdays.map((md) => (
          <button
            key={md.id}
            className={`pill${openFilter === md.id ? ' on' : ''}`}
            onClick={() => setOpenFilter(md.id)}
          >
            {md.label}
          </button>
        ))}
        <button
          className={`pill${openFilter === 'ko' ? ' on' : ''}`}
          onClick={() => setOpenFilter('ko')}
        >
          Eliminatorias
        </button>
      </div>

      <div className="cal-grid">
        {shownSections.map((section) => (
          <div
            key={section.id}
            className={`cal-day card${section.kind === 'ko' ? ' ko-day' : ''}`}
          >
            <div className="cal-day-head">
              <div>
                <div className="cdh-date">{section.date}</div>
                <div className="cdh-label">{section.label}</div>
              </div>
              <span className={`day-tag ${section.kind === 'ko' ? 'ko' : section.played ? 'live' : 'soon'}`}>
                {section.kind === 'ko' ? 'Eliminatoria' : section.played ? 'Jugada' : 'Abierta'}
              </span>
            </div>
            <div className="cal-matches">
              {section.matches.map((match) => {
                const matchDate = new Date(match.match_date)
                const kickoffTime = matchDate.toLocaleTimeString('es-CO', {
                  timeZone: 'America/Bogota',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const hasRealScore = match.home_score !== null && match.away_score !== null
                const homeTeamName = match.home_team?.name || match.home_team_label
                const awayTeamName = match.away_team?.name || match.away_team_label
                const prediction = predictions[match.id]
                const hasPrediction = prediction && prediction.pred_home !== null && prediction.pred_away !== null
                const isKO = section.kind === 'ko'

                if (isKO) {
                  return (
                    <div className="cal-row" key={match.id}>
                      <span className="cal-time num">{kickoffTime}</span>
                      <div className="cal-fixture">
                        <span className="cf-team right">
                          <span className="cf-name">{homeTeamName || '—'}</span>
                          {match.home_team?.flag_emoji && (
                            <Flag emoji={match.home_team.flag_emoji} name={homeTeamName} size={20} />
                          )}
                        </span>
                        <span className="cal-score">
                          {hasRealScore ? (
                            <span className="cs-real num">{match.home_score}–{match.away_score}</span>
                          ) : (
                            <span className="cs-vs">vs</span>
                          )}
                        </span>
                        <span className="cf-team left">
                          {match.away_team?.flag_emoji && (
                            <Flag emoji={match.away_team.flag_emoji} name={awayTeamName} size={20} />
                          )}
                          <span className="cf-name">{awayTeamName || '—'}</span>
                        </span>
                      </div>
                      {hasPrediction && (
                        <span className="cal-pred-score">
                          <span className="cs-pred num">{prediction.pred_home}–{prediction.pred_away}</span>
                        </span>
                      )}
                    </div>
                  )
                }

                return (
                  <div className="cal-row" key={match.id}>
                    <span className="cal-time num">{kickoffTime}</span>
                    <div className="cal-fixture">
                      <span className="cf-team right">
                        <span className="cf-name">{homeTeamName}</span>
                        <Flag emoji={match.home_team?.flag_emoji || ''} name={homeTeamName} size={20} />
                      </span>
                      <span className="cal-score">
                        {hasRealScore ? (
                          <span className="cs-real num">{match.home_score}–{match.away_score}</span>
                        ) : (
                          <span className="cs-vs">vs</span>
                        )}
                      </span>
                      <span className="cf-team left">
                        <Flag emoji={match.away_team?.flag_emoji || ''} name={awayTeamName} size={20} />
                        <span className="cf-name">{awayTeamName}</span>
                      </span>
                    </div>
                    {hasPrediction && (
                      <span className="cal-pred-score">
                        <span className="cs-pred num">{prediction.pred_home}–{prediction.pred_away}</span>
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Tab 3: Groups (based on user predictions)
function GroupsTab({ userId }: { userId: string }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [realStandings, setRealStandings] = useState<any[]>([])
  const [positionPredictions, setPositionPredictions] = useState<any[]>([])
  const [completedGroupMatches, setCompletedGroupMatches] = useState<any[]>([])
  const [groupFirstMatchDates, setGroupFirstMatchDates] = useState<Record<string, Date>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [userId])

  async function loadData() {
    const [teamsRes, predictionsRes, standingsRes, positionPredsRes, completedMatchesRes, firstMatchesRes] = await Promise.all([
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
      supabase
        .from('matches')
        .select('group_id, match_date')
        .eq('phase', 'groups')
        .order('match_date', { ascending: true }),
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
    if (firstMatchesRes.data) {
      const firstDates: Record<string, Date> = {}
      firstMatchesRes.data.forEach((m: any) => {
        if (m.group_id && !firstDates[m.group_id]) {
          firstDates[m.group_id] = new Date(m.match_date)
        }
      })
      setGroupFirstMatchDates(firstDates)
    }

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
    <div>
      <div className="section-head">
        <div className="h-left">
          <h1><span className="accent">Grupos</span></h1>
          <p>Posiciones de siembra por ranking FIFA. En la columna <b>Pos</b> proyecta el orden final (1–4): si aciertas las 4 posiciones ganas <b>+3 pts</b> de bono. Las demás cifras (PJ, puntos, GF/GC) se calculan automáticamente con las predicciones de cada partido, así que el orden de los equipos puede cambiar cada vez que ajustes un marcador. Tu columna <b>Pos</b> queda <b>congelada</b> al arrancar el primer partido del grupo.</p>
        </div>
        <div className="legend">
          <div className="li"><span className="dot" style={{ background: "var(--accent)" }}></span> Tu proyección (Pos)</div>
          <div className="li">Cierre: 11 Jun 2026, 11:00 PM</div>
        </div>
      </div>

      <div className="groups-grid">
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
            firstMatchDate={groupFirstMatchDates[group]}
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
  firstMatchDate,
}: {
  group: string
  teams: Team[]
  predictions: any[]
  realStandings: any[]
  positionPredictions: any[]
  completedGroupMatches: any[]
  onSavePosition: (groupId: string, teamId: number, position: number | null) => void
  firstMatchDate?: Date
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

  // Lock when first match of this group starts
  const isLocked = firstMatchDate ? new Date() >= new Date(firstMatchDate.getTime() - 15 * 60 * 1000) : false

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

  // Check if all 4 positions are filled
  const filledPositions = standings.filter(s => s.predictedPosition !== null).length
  const isComplete = filledPositions === 4

  return (
    <div className="card group-card">
      <div className="group-head">
        <span className="group-letter">{group}</span>
        <span className="group-title">Grupo {group}</span>
        <span className={`group-proj${isComplete ? ' done' : ''}`}>
          {earnedBonus ? '✓ Proyección lista (+3)' : isComplete ? '✓ Proyección lista (+3)' : 'Asigna 1–4'}
        </span>
      </div>
      <table className="group-table">
        <thead>
          <tr>
            <th className="gt-pos">Pos</th>
            <th className="gt-team">Equipo</th>
            <th>PJ</th>
            <th>DG</th>
            <th className="gt-pts">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, idx) => {
            // Get used positions in this group (excluding current team)
            const usedPositions = standings
              .filter((st) => st.team.id !== s.team.id && st.predictedPosition !== null)
              .map((st) => st.predictedPosition)

            return (
              <tr key={s.team.id} className={idx < 2 ? 'qualifies' : ''}>
                <td className="gt-pos">
                  {isLocked ? (
                    <span className="font-semibold text-slate-600">{s.predictedPosition || '·'}</span>
                  ) : (
                    <select
                      className="pos-select"
                      value={s.predictedPosition || ''}
                      onChange={(e) => {
                        const value = e.target.value

                        // If user selects "·", clear the position
                        if (value === '') {
                          onSavePosition(group, s.team.id, null)
                          return
                        }

                        const newPos = parseInt(value)
                        if (!usedPositions.includes(newPos)) {
                          onSavePosition(group, s.team.id, newPos)
                        } else {
                          alert('Esa posición ya está asignada a otro equipo en este grupo. Primero debes limpiar la posición del otro equipo seleccionando "·".')
                        }
                      }}
                    >
                      <option value="">·</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                  )}
                </td>
                <td className="gt-team">
                  <span className="team">
                    <Flag emoji={s.team.flag_emoji} name={s.team.name} size={18} />
                    <span className="tname">{s.team.name}</span>
                  </span>
                </td>
                <td className="num">{s.played}</td>
                <td className={`num${s.gd > 0 ? ' pos' : s.gd < 0 ? ' neg' : ''}`}>
                  {s.gd > 0 ? '+' : ''}{s.gd}
                </td>
                <td className="gt-pts num">{s.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
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

    // Load ALL calculated predictions paginando (Supabase limita 1000/página)
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
    const { data: completedGroupMatches } = await supabase
      .from('matches')
      .select('group_id, home_team_id, away_team_id, home_score, away_score')
      .eq('phase', 'groups')
      .not('home_score', 'is', null)
      .not('away_score', 'is', null)

    const dynamicStandings = new Map<string, Array<{team_id: number, position: number}>>()
    'ABCDEFGHIJKL'.split('').forEach(groupId => {
      const gMatches = completedGroupMatches?.filter((m: any) => m.group_id === groupId) || []
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
      dynamicStandings.set(groupId, Object.entries(teamStats)
        .map(([tid, s]) => ({team_id: Number(tid), pts: s.pts, gf: s.gf, gd: s.gf - s.gc}))
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
        .map((t, i) => ({team_id: t.team_id, position: i + 1})))
    })

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
            if (pred.match.home_score !== null && pred.pred_home === pred.match.home_score) {
              correctGoal += 1
            }
            if (pred.match.away_score !== null && pred.pred_away === pred.match.away_score) {
              correctGoal += 1
            }
          }
        })

        // Calculate unique prediction bonus (5 points per unique exact score)
        uniquePredictions = (uniquePredictionUsers.get(profile.id) || 0) * 5

        // Calculate group order bonus (3 pts per group if all 4 manual positions match real standings)
        const { data: userPositionPredictions } = await supabase
          .from('group_position_predictions')
          .select('group_id, team_id, predicted_position')
          .eq('user_id', profile.id)

        'ABCDEFGHIJKL'.split('').forEach((groupId) => {
          const groupStandings = dynamicStandings.get(groupId)
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

        // Get special predictions points by type
        const champion = specialPreds?.find(sp => sp.type === 'champion')?.points_earned || 0
        const runnerUp = specialPreds?.find(sp => sp.type === 'runner_up')?.points_earned || 0
        const thirdPlace = specialPreds?.find(sp => sp.type === 'third_place')?.points_earned || 0
        const mvp = specialPreds?.find(sp => sp.type === 'mvp')?.points_earned || 0
        const topScorer = specialPreds?.find(sp => sp.type === 'top_scorer')?.points_earned || 0

        // Calcular total directamente desde pts_earned (más confiable que profiles.total_points)
        const matchPointsTotal = userPredictions.reduce((s: number, p: any) => s + (p.points_earned || 0), 0)
        const specialTotal = (champion + runnerUp + thirdPlace + mvp + topScorer)
        const computedTotal = matchPointsTotal + specialTotal + groupOrderBonus

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
          total_points: computedTotal,
        }
      })
    )

    // Sort by computed total descending
    profilesWithBreakdown.sort((a, b) => b.total_points - a.total_points)

    setProfiles(profilesWithBreakdown)
    setLoading(false)
  }

  if (loading) return <div className="text-center py-12">Cargando...</div>

  const avatarColors = [
    'bg-amber-100 text-amber-800',
    'bg-blue-100 text-blue-800',
    'bg-purple-100 text-purple-800',
    'bg-slate-100 text-slate-800',
    'bg-indigo-100 text-indigo-800',
    'bg-pink-100 text-pink-800',
    'bg-green-100 text-green-800',
    'bg-orange-100 text-orange-800',
    'bg-cyan-100 text-cyan-800',
    'bg-rose-100 text-rose-800',
  ]

  const getUserInitials = (name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div>
      <div className="section-head">
        <div className="h-left">
          <h1>Ranking <span className="accent">general</span></h1>
          <p>Puntaje acumulado y de dónde sale cada punto · {profiles.length} participantes</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-red-100 overflow-x-auto" style={{ marginTop: '1.5rem' }}>
        <table className="w-full text-sm">
          <thead className="bg-red-600 text-white">
            <tr>
              <th className="px-3 py-3 text-left sticky left-0 bg-red-600 z-10">Pos</th>
              <th className="px-3 py-3 text-left">Nombre</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Marcador exacto</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Ganador/Empate</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Gol acertado</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Predicción única</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Bono grupo</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Clasificado</th>
              <th className="px-3 py-3 text-center">Campeón</th>
              <th className="px-3 py-3 text-center">Subcampeón</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Tercer puesto</th>
              <th className="px-3 py-3 text-center">Goleador</th>
              <th className="px-3 py-3 text-center">MVP</th>
              <th className="px-3 py-3 text-center bg-red-700 font-bold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {profiles.map((profile, idx) => {
              const isCurrentUser = profile.id === currentUserId
              const rowBgClass = isCurrentUser ? 'bg-red-50' : 'hover:bg-slate-50'

              return (
                <tr key={profile.id} className={rowBgClass}>
                  <td className="px-3 py-3 sticky left-0 bg-inherit z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${avatarColors[idx % avatarColors.length]}`}>
                        {getUserInitials(profile.display_name)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{profile.display_name}</div>
                        {isCurrentUser && (
                          <div className="text-xs text-red-600">(tú)</div>
                        )}
                      </div>
                    </div>
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
                  <td className="px-3 py-3 text-center text-slate-700">{profile.topScorer}</td>
                  <td className="px-3 py-3 text-center text-slate-700">{profile.mvp}</td>
                  <td className="px-3 py-3 text-center bg-red-50">
                    <span className="text-lg font-bold text-red-600">{profile.total_points}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Tab 4.5: Bracket with Predictions
function BracketTab({ userId }: { userId: string }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<number, any>>({})
  const [loading, setLoading] = useState(true)
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
      supabase.from('predictions').select('*').eq('user_id', userId)
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
    const { error } = await supabase
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

    if (error) {
      console.error('Error guardando predicción en Llaves:', error)
      return false
    } else {
      await loadData()
      return true
    }
  }

  if (loading) return <div className="text-center py-12">Cargando bracket...</div>

  // Organize matches by phase
  const r32Matches = matches.filter((m) => m.match_number >= 73 && m.match_number <= 88).sort((a, b) => a.match_number - b.match_number)
  const r16Matches = matches.filter((m) => m.match_number >= 89 && m.match_number <= 96).sort((a, b) => a.match_number - b.match_number)
  const quarterMatches = matches.filter((m) => m.match_number >= 97 && m.match_number <= 100).sort((a, b) => a.match_number - b.match_number)
  const semiMatches = matches.filter((m) => m.match_number >= 101 && m.match_number <= 102).sort((a, b) => a.match_number - b.match_number)
  const thirdPlaceMatch = matches.find((m) => m.match_number === 103)
  const finalMatch = matches.find((m) => m.match_number === 104)

  const rounds = [
    { key: 'r32', label: 'Dieciseisavos', matches: r32Matches },
    { key: 'r16', label: 'Octavos', matches: r16Matches },
    { key: 'r8', label: 'Cuartos', matches: quarterMatches },
    { key: 'r4', label: 'Semifinales', matches: semiMatches },
    { key: 'r3', label: 'Tercer Lugar', matches: thirdPlaceMatch ? [thirdPlaceMatch] : [] },
    { key: 'r1', label: 'Final', matches: finalMatch ? [finalMatch] : [] }
  ]

  return (
    <div>
      <div className="section-head">
        <div className="h-left">
          <h1><span className="accent">Eliminatorias</span></h1>
          <p>El cuadro completo desde Dieciseisavos hasta la Final. Los cruces se rellenan automáticamente cuando termine la fase de grupos (28 jun).</p>
        </div>
        <div className="legend">
          <div className="li"><span className="dot" style={{ background: "var(--accent)" }}></span> Equipos por definir</div>
        </div>
      </div>

      <div className="bracket-scroll">
        <div className="bracket">
          {rounds.map((r) => (
            <div className={`br-col br-${r.key}`} key={r.key}>
              <div className="br-col-head">{r.label} <span className="brc-n">{r.matches.length}</span></div>
              <div className="br-col-body">
                {r.matches.map((match) => (
                  <BracketMatchCard
                    key={match.id}
                    match={match}
                    prediction={predictions[match.id]}
                    onSavePrediction={savePrediction}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BracketMatchCard({
  match,
  prediction,
  onSavePrediction,
}: {
  match: Match
  prediction?: any
  onSavePrediction?: (matchId: number, predHome: number, predAway: number) => Promise<boolean>
}) {
  const [predHome, setPredHome] = useState(prediction?.pred_home ?? 0)
  const [predAway, setPredAway] = useState(prediction?.pred_away ?? 0)
  const [saving, setSaving] = useState(false)

  // Update local state when prediction changes
  useEffect(() => {
    setPredHome(prediction?.pred_home ?? 0)
    setPredAway(prediction?.pred_away ?? 0)
  }, [prediction])

  const hasResult = match.home_score !== null && match.away_score !== null
  const matchDate = new Date(match.match_date)

  // Block predictions 15 minutes before match starts
  const fifteenMinutesBeforeMatch = new Date(matchDate.getTime() - 15 * 60 * 1000)
  const canEdit = new Date() < fifteenMinutesBeforeMatch

  const homeTeamName = match.home_team?.name || match.home_team_label || 'TBD'
  const awayTeamName = match.away_team?.name || match.away_team_label || 'TBD'
  const homeFlag = match.home_team?.flag_emoji
  const awayFlag = match.away_team?.flag_emoji
  const teamsAssigned = match.home_team_id && match.away_team_id

  const dateStr = matchDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  const cityStr = match.venue || match.city || ''

  const hasChanges = !prediction || predHome !== prediction.pred_home || predAway !== prediction.pred_away

  const handleSave = async () => {
    if (!onSavePrediction) return
    setSaving(true)
    await onSavePrediction(match.id, predHome, predAway)
    setSaving(false)
  }

  const pts = prediction?.points_earned || 0

  return (
    <div className={`br-match${teamsAssigned ? '' : ' ko'}`}>
      <div className={`br-slot${teamsAssigned ? '' : ' empty'}`}>
        {homeFlag && <Flag emoji={homeFlag} size={16} />}
        <span className={`br-name${teamsAssigned ? '' : ' muted'}`}>{homeTeamName}</span>
        {teamsAssigned && canEdit && (
          <ScoreStepper value={predHome} onChange={setPredHome} disabled={!canEdit} />
        )}
        {hasResult && <span className="br-score num">{match.home_score}</span>}
      </div>
      <div className={`br-slot${teamsAssigned ? '' : ' empty'}`}>
        {awayFlag && <Flag emoji={awayFlag} size={16} />}
        <span className={`br-name${teamsAssigned ? '' : ' muted'}`}>{awayTeamName}</span>
        {teamsAssigned && canEdit && (
          <ScoreStepper value={predAway} onChange={setPredAway} disabled={!canEdit} />
        )}
        {hasResult && <span className="br-score num">{match.away_score}</span>}
      </div>
      <div className="br-meta">
        P{match.match_number} · {dateStr} · {cityStr}
        {hasResult && pts > 0 && <PtsBadge pts={pts} />}
        {teamsAssigned && canEdit && hasChanges && (
          <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ marginLeft: 8, padding: '4px 12px', fontSize: '11px' }}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        )}
      </div>
    </div>
  )
}

// Tab 5: Special Predictions
function SpecialTab({ userId }: { userId: string }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [predictions, setPredictions] = useState<Record<string, SpecialPrediction>>({})
  const [popularPicks, setPopularPicks] = useState<{ topScorer: any[], mvp: any[], champion: any[], runnerUp: any[], thirdPlace: any[] }>({ topScorer: [], mvp: [], champion: [], runnerUp: [], thirdPlace: [] })
  const [loading, setLoading] = useState(true)
  const [savingType, setSavingType] = useState<string | null>(null)
  const [savedType, setSavedType] = useState<string | null>(null)
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
    const [teamsRes, predsRes, allPredsRes] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('special_predictions').select('*').eq('user_id', userId),
      supabase.from('special_predictions').select('*').in('type', ['top_scorer', 'mvp', 'champion', 'runner_up', 'third_place']),
    ])

    if (teamsRes.data) setTeams(teamsRes.data)

    // Load popular picks
    if (allPredsRes.data) {
      console.log('[SpecialTab] 📊 Total predictions loaded:', allPredsRes.data.length)

      const scorerPicks: any = {}
      const mvpPicks: any = {}
      const championPicks: any = {}
      const runnerUpPicks: any = {}
      const thirdPlacePicks: any = {}
      const scorerUsersByPlayer: any = {}
      const mvpUsersByPlayer: any = {}
      const championUsersByTeam: any = {}
      const runnerUpUsersByTeam: any = {}
      const thirdPlaceUsersByTeam: any = {}

      allPredsRes.data.forEach((pred: any) => {
        if (!pred.value) return

        const addToPicks = (picks: any, usersByKey: any, key: string) => {
          if (!usersByKey[key]) usersByKey[key] = new Set()
          usersByKey[key].add(pred.user_id)
          picks[key] = usersByKey[key].size
        }

        if (pred.type === 'top_scorer') {
          try {
            const player = JSON.parse(pred.value)
            const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()
            const key = `${normalize(player.first_name)} ${normalize(player.last_name)}|${player.country.trim()}`
            addToPicks(scorerPicks, scorerUsersByPlayer, key)
          } catch (e) {}
        } else if (pred.type === 'mvp') {
          try {
            const player = JSON.parse(pred.value)
            const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()
            const key = `${normalize(player.first_name)} ${normalize(player.last_name)}|${player.country.trim()}`
            addToPicks(mvpPicks, mvpUsersByPlayer, key)
          } catch (e) {}
        } else if (pred.type === 'champion') {
          addToPicks(championPicks, championUsersByTeam, pred.value.trim())
        } else if (pred.type === 'runner_up') {
          addToPicks(runnerUpPicks, runnerUpUsersByTeam, pred.value.trim())
        } else if (pred.type === 'third_place') {
          addToPicks(thirdPlacePicks, thirdPlaceUsersByTeam, pred.value.trim())
        }
      })

      const capitalize = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase())
      const toPlayerList = (picks: any) =>
        Object.entries(picks).sort(([, a]: any, [, b]: any) => b - a)
          .map(([key, count]) => { const [name, country] = key.split('|'); return { name: capitalize(name), country, count } })
      const toTeamList = (picks: any) =>
        Object.entries(picks).sort(([, a]: any, [, b]: any) => b - a)
          .map(([name, count]) => ({ name, count }))

      setPopularPicks({
        topScorer: toPlayerList(scorerPicks),
        mvp: toPlayerList(mvpPicks),
        champion: toTeamList(championPicks),
        runnerUp: toTeamList(runnerUpPicks),
        thirdPlace: toTeamList(thirdPlacePicks),
      })
    }

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
    setSavingType(type)
    setSavedType(null)

    // First, check if prediction exists
    const { data: existing, error: checkError } = await supabase
      .from('special_predictions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', type)
      .maybeSingle()

    let result
    if (existing && !checkError) {
      // Update existing
      result = await supabase
        .from('special_predictions')
        .update({
          value,
          deadline,
          locked: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('type', type)
        .select()
    } else {
      // Insert new
      result = await supabase
        .from('special_predictions')
        .insert({
          user_id: userId,
          type,
          value,
          deadline,
          locked: false,
          updated_at: new Date().toISOString(),
        })
        .select()
    }

    setSavingType(null)
    if (result.error) {
      alert('Error al guardar predicción: ' + result.error.message)
    } else {
      setSavedType(type)
      setTimeout(() => setSavedType(null), 2000)
      await loadData()
    }
  }

  if (loading) return <div className="text-center py-12">Cargando...</div>

  // Deadlines en Colombia timezone
  const firstMatchDeadline = new Date('2026-06-11T14:00:00-05:00') // 11 jun, 2pm — MVP y goleador
  const teamPredDeadline = new Date('2026-06-11T23:59:59-05:00')   // 11 jun, fin del día — campeón/sub/tercero
  const knockoutStartDeadline = new Date('2026-06-28T00:00:00-05:00') // 28 jun, inicio eliminatorias

  const now = new Date()
  // Goleador y MVP: bloquear 15 min antes del primer partido
  const firstMatchPassed = now >= new Date(firstMatchDeadline.getTime() - 15 * 60 * 1000)
  // Campeón/Sub/Tercero: puntos completos hasta fin del 11 jun
  const teamPredPassed = now >= teamPredDeadline
  const knockoutStarted = now >= knockoutStartDeadline

  const championPoints = !teamPredPassed ? 20 : !knockoutStarted ? 10 : 0
  const runnerUpPoints = !teamPredPassed ? 12 : !knockoutStarted ? 6 : 0
  const thirdPlacePoints = !teamPredPassed ? 12 : !knockoutStarted ? 6 : 0
  const scorerPoints = !firstMatchPassed ? 10 : 0
  const mvpPoints = !firstMatchPassed ? 10 : 0

  return (
    <div>
      {/* Header */}
      <div className="section-head">
        <div className="h-left">
          <h1>Predicciones <span className="accent">especiales</span></h1>
          <p>Campeón, subcampeón, tercer lugar, máximo goleador y MVP del Mundial. Con puntos extra al acertar. Recuerda que el plazo límite es el 11 de junio a las 2pm.</p>
        </div>
      </div>

      {/* Información de deadlines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" style={{ marginTop: '1.5rem' }}>
        <h3 className="font-semibold text-blue-900 mb-2">Información Importante</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Antes del 11 de junio, 2pm:</strong> Todos los puntos completos (Campeón 20pts, Subcampeón 12pts, 3er lugar 12pts, Goleador 10pts, MVP 10pts)</li>
          <li>• <strong>Del 11 al 28 de junio:</strong> Solo podio con puntos reducidos (Campeón 10pts, Subcampeón 6pts, 3er lugar 6pts). Goleador y MVP bloqueados.</li>
          <li>• <strong>Después del 28 de junio:</strong> Todas las predicciones bloqueadas</li>
        </ul>
      </div>

      <div className="space-y-6">
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
              popularPicks={popularPicks.champion}
              onPickSelect={(name) => setFormData({ ...formData, champion: name })}
              saving={savingType === 'champion'}
              saved={savedType === 'champion'}
            />
            <SpecialPredictionField
              label={`🥈 Subcampeón (${runnerUpPoints} pts)`}
              type="runner_up"
              value={formData.runner_up}
              onChange={(v) => setFormData({ ...formData, runner_up: v })}
              onSave={() => savePrediction('runner_up', formData.runner_up, knockoutStartDeadline.toISOString())}
              teams={teams}
              locked={knockoutStarted}
              popularPicks={popularPicks.runnerUp}
              onPickSelect={(name) => setFormData({ ...formData, runner_up: name })}
              saving={savingType === 'runner_up'}
              saved={savedType === 'runner_up'}
            />
            <SpecialPredictionField
              label={`🥉 Tercer Lugar (${thirdPlacePoints} pts)`}
              type="third_place"
              value={formData.third_place}
              onChange={(v) => setFormData({ ...formData, third_place: v })}
              onSave={() => savePrediction('third_place', formData.third_place, knockoutStartDeadline.toISOString())}
              teams={teams}
              locked={knockoutStarted}
              popularPicks={popularPicks.thirdPlace}
              onPickSelect={(name) => setFormData({ ...formData, third_place: name })}
              saving={savingType === 'third_place'}
              saved={savedType === 'third_place'}
            />
          </div>
        </div>

        {/* Goleador y MVP lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Máximo Goleador */}
          <div className="bg-white rounded-xl border border-red-100 p-6">
            <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">⚽</span>
                <h3 className="text-lg font-bold text-slate-800">Máximo goleador</h3>
              </div>
              <p className="text-sm text-slate-500">Bota de Oro · nombre, apellido y país</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-red-600">{scorerPoints}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">PTS</div>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-4">
            {firstMatchPassed
              ? '🔒 Cierre: 11 jun 2026, 2:00 PM'
              : `Cierre: 11 jun 2026, 2:00 PM`}
          </p>

          {popularPicks.topScorer.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Sugeridos por la polla</p>
              <div className="flex flex-wrap gap-2">
                {popularPicks.topScorer.map((pick, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const [firstName, ...lastNameParts] = pick.name.split(' ')
                      setFormData({
                        ...formData,
                        top_scorer_first_name: firstName,
                        top_scorer_last_name: lastNameParts.join(' '),
                        top_scorer_country: pick.country
                      })
                    }}
                    disabled={firstMatchPassed}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="font-semibold text-slate-800">{pick.name}</span>
                    <span className="text-slate-500 ml-1">{pick.country}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
              <input
                type="text"
                value={formData.top_scorer_first_name}
                onChange={(e) => setFormData({ ...formData, top_scorer_first_name: e.target.value })}
                disabled={firstMatchPassed}
                className="px-4 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                placeholder="Ej. Kylian"
              />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Apellido</label>
                <input
                  type="text"
                  value={formData.top_scorer_last_name}
                  onChange={(e) => setFormData({ ...formData, top_scorer_last_name: e.target.value })}
                  disabled={firstMatchPassed}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  placeholder="Ej. Mbappé"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">País</label>
              <select
                value={formData.top_scorer_country}
                onChange={(e) => setFormData({ ...formData, top_scorer_country: e.target.value })}
                disabled={firstMatchPassed}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
              >
                <option value="">Ej. Francia</option>
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
              disabled={firstMatchPassed || !formData.top_scorer_first_name || !formData.top_scorer_last_name || !formData.top_scorer_country || savingType === 'top_scorer'}
              style={{
                width: '100%', border: 'none', padding: '8px 16px', borderRadius: 8,
                fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.3s',
                background: savedType === 'top_scorer' ? '#16a34a' : '#dc2626', color: '#fff',
                opacity: firstMatchPassed || !formData.top_scorer_first_name || !formData.top_scorer_last_name || !formData.top_scorer_country ? 0.5 : 1,
              }}
            >
              {savingType === 'top_scorer' ? '⏳ Guardando…' : savedType === 'top_scorer' ? '✅ Guardado' : 'Guardar Goleador'}
            </button>
          </div>
        </div>

        {/* Mejor Jugador MVP */}
        <div className="bg-white rounded-xl border border-red-100 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🌟</span>
                <h3 className="text-lg font-bold text-slate-800">Mejor jugador (MVP)</h3>
              </div>
              <p className="text-sm text-slate-500">Balón de Oro · nombre, apellido y país</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-red-600">{mvpPoints}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">PTS</div>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-4">
            {firstMatchPassed
              ? '🔒 Cierre: 11 jun 2026, 2:00 PM'
              : `Cierre: 11 jun 2026, 2:00 PM`}
          </p>
          {popularPicks.mvp.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Sugeridos por la polla</p>
              <div className="flex flex-wrap gap-2">
                {popularPicks.mvp.map((pick, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const [firstName, ...lastNameParts] = pick.name.split(' ')
                      setFormData({
                        ...formData,
                        mvp_first_name: firstName,
                        mvp_last_name: lastNameParts.join(' '),
                        mvp_country: pick.country
                      })
                    }}
                    disabled={firstMatchPassed}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="font-semibold text-slate-800">{pick.name}</span>
                    <span className="text-slate-500 ml-1">{pick.country}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
              <input
                type="text"
                value={formData.mvp_first_name}
                onChange={(e) => setFormData({ ...formData, mvp_first_name: e.target.value })}
                disabled={firstMatchPassed}
                className="px-4 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                placeholder="Ej. Kylian"
              />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Apellido</label>
                <input
                  type="text"
                  value={formData.mvp_last_name}
                  onChange={(e) => setFormData({ ...formData, mvp_last_name: e.target.value })}
                  disabled={firstMatchPassed}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                  placeholder="Ej. Mbappé"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">País</label>
              <select
                value={formData.mvp_country}
                onChange={(e) => setFormData({ ...formData, mvp_country: e.target.value })}
                disabled={firstMatchPassed}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
              >
                <option value="">Ej. Francia</option>
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
              disabled={firstMatchPassed || !formData.mvp_first_name || !formData.mvp_last_name || !formData.mvp_country || savingType === 'mvp'}
              style={{
                width: '100%', border: 'none', padding: '8px 16px', borderRadius: 8,
                fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.3s',
                background: savedType === 'mvp' ? '#16a34a' : '#dc2626', color: '#fff',
                opacity: firstMatchPassed || !formData.mvp_first_name || !formData.mvp_last_name || !formData.mvp_country ? 0.5 : 1,
              }}
            >
              {savingType === 'mvp' ? '⏳ Guardando…' : savedType === 'mvp' ? '✅ Guardado' : 'Guardar MVP'}
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
  popularPicks = [],
  onPickSelect,
  saving = false,
  saved = false,
}: {
  label: string
  type: string
  value: string
  onChange: (value: string) => void
  onSave: () => void
  teams: Team[]
  locked: boolean
  popularPicks?: { name: string; count: number }[]
  onPickSelect?: (name: string) => void
  saving?: boolean
  saved?: boolean
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
          disabled={locked || !value || saving}
          style={{
            background: saved ? '#16a34a' : '#dc2626',
            color: '#fff',
            border: 'none',
            padding: '8px 20px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: locked || !value || saving ? 'not-allowed' : 'pointer',
            minWidth: 100,
            transition: 'background 0.3s',
            opacity: locked || !value ? 0.5 : 1,
          }}
        >
          {saving ? '⏳ Guardando…' : saved ? '✅ Guardado' : 'Guardar'}
        </button>
      </div>
      {popularPicks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {popularPicks.map((pick, idx) => (
            <button
              key={idx}
              onClick={() => onPickSelect?.(pick.name)}
              disabled={locked}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="font-semibold text-slate-800">{pick.name}</span>
              <span className="text-slate-400 ml-1">·{pick.count}</span>
            </button>
          ))}
        </div>
      )}
      {locked && (
        <p className="text-xs text-red-600 mt-1">Predicción bloqueada (deadline pasado)</p>
      )}
    </div>
  )
}

// ====================================
// RESULTADOS TAB
// ====================================
function ResultadosTab({ currentUserId }: { currentUserId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState<'rank' | 'alpha'>('rank')
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'j1' | 'j2' | 'j3' | 'eliminatorias'>('all')
  const supabase = createClient()

  useEffect(() => {
    loadResultados()
  }, [])

  async function loadResultados() {
    try {
      // Load all users with total points
      const { data: users } = await supabase
        .from('profiles')
        .select('id, display_name, total_points')
        .order('total_points', { ascending: false })

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
        .order('match_number')

      // Paginar predicciones (Supabase limita a 1000 por página)
      // ORDER BY requerido para que .range() sea consistente entre páginas
      let predictions: any[] = []
      for (let page = 0; page < 10; page++) {
        const { data: batch } = await supabase
          .from('predictions')
          .select('user_id, match_id, pred_home, pred_away, points_earned')
          .order('match_id', { ascending: true })
          .order('user_id', { ascending: true })
          .range(page * 1000, (page + 1) * 1000 - 1)
        if (!batch || batch.length === 0) break
        predictions = predictions.concat(batch)
        if (batch.length < 1000) break
      }

      if (!users || !matches || !predictions) {
        setLoading(false)
        return
      }

      // Group matches by jornada/phase
      const groupMatches = matches.filter((m: any) => m.phase === 'groups')
      const knockoutMatches = matches.filter((m: any) => m.phase !== 'groups')

      const matchesByPhase: Array<{ label: string; matches: any[]; key: string }> = []

      // Group phase: 24 matches per jornada (3 jornadas = 72 matches)
      const matchdaySize = 24
      for (let i = 0; i < 3; i++) {
        const start = i * matchdaySize
        const end = (i + 1) * matchdaySize
        const jornadaMatches = groupMatches.slice(start, end)

        if (jornadaMatches.length > 0) {
          const firstDate = new Date(jornadaMatches[0].match_date).toLocaleDateString('es-CO', {
            timeZone: 'America/Bogota',
            day: 'numeric',
            month: 'short'
          })
          const lastDate = new Date(jornadaMatches[jornadaMatches.length - 1].match_date).toLocaleDateString('es-CO', {
            timeZone: 'America/Bogota',
            day: 'numeric',
            month: 'short'
          })

          matchesByPhase.push({
            label: `Jornada ${i + 1} · Fase de grupos`,
            matches: jornadaMatches,
            key: `jornada-${i + 1}`,
          })
        }
      }

      // Knockout phase: group by round
      const knockoutRounds: Record<string, { label: string; matches: any[] }> = {
        r16: { label: 'Octavos de final', matches: [] },
        r8: { label: 'Cuartos de final', matches: [] },
        r4: { label: 'Semifinales', matches: [] },
        '3rd': { label: 'Tercer puesto', matches: [] },
        final: { label: 'Final', matches: [] },
      }

      knockoutMatches.forEach((match: any) => {
        if (knockoutRounds[match.phase]) {
          knockoutRounds[match.phase].matches.push(match)
        }
      })

      Object.entries(knockoutRounds).forEach(([phase, data]) => {
        if (data.matches.length > 0) {
          matchesByPhase.push({
            label: data.label,
            matches: data.matches,
            key: phase,
          })
        }
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
        matchesByPhase,
        predsByUserAndMatch,
        totalMatches: matches.length
      })
    } catch (error) {
      console.error('Error loading resultados:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-12">Cargando...</div>
  if (!data) return <div className="text-center py-12">No hay datos disponibles</div>

  const { users, matchesByPhase, predsByUserAndMatch, totalMatches } = data

  // Calculate rankings and add rank to each user
  const usersWithRank = users.map((user: any, index: number) => ({
    ...user,
    rank: index + 1
  }))

  // Sort users based on selected order
  const sortedUsers = sortOrder === 'rank'
    ? usersWithRank
    : [...usersWithRank].sort((a: any, b: any) => a.display_name.localeCompare(b.display_name))

  // Filter phases based on selected filter
  const filteredPhases = matchesByPhase.filter((phase: any) => {
    if (phaseFilter === 'all') return true
    if (phaseFilter === 'j1') return phase.key === 'jornada-1'
    if (phaseFilter === 'j2') return phase.key === 'jornada-2'
    if (phaseFilter === 'j3') return phase.key === 'jornada-3'
    if (phaseFilter === 'eliminatorias') return ['r16', 'r8', 'r4', '3rd', 'final'].includes(phase.key)
    return true
  })

  // Generate avatar colors
  const avatarColors = [
    'bg-amber-100 text-amber-800',
    'bg-blue-100 text-blue-800',
    'bg-purple-100 text-purple-800',
    'bg-slate-100 text-slate-800',
    'bg-indigo-100 text-indigo-800',
    'bg-pink-100 text-pink-800',
    'bg-green-100 text-green-800',
    'bg-orange-100 text-orange-800',
    'bg-cyan-100 text-cyan-800',
    'bg-rose-100 text-rose-800',
  ]

  const getUserInitials = (name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div>
      {/* Header */}
      <div className="section-head">
        <div className="h-left">
          <h1>Tabla de <span className="accent">predicciones</span></h1>
          <p>El marcador que cada participante pronosticó, partido por partido — los 104 del Mundial, grupos y eliminatorias. En las eliminatorias se muestra el cruce y los países aparecen al completarse el bracket. El torneo aún no empieza: los puntos se calcularán cuando haya resultados.</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
            <span className="text-slate-600">Exacto / único</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <span className="text-slate-600">Resultado o goles</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Sin puntos</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3" style={{ marginTop: '1.5rem' }}>
        <span className="text-sm font-medium text-slate-600">Ordenar:</span>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setSortOrder('rank')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              sortOrder === 'rank'
                ? 'bg-red-100 text-red-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Por puesto
          </button>
          <button
            onClick={() => setSortOrder('alpha')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              sortOrder === 'alpha'
                ? 'bg-red-100 text-red-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Alfabético
          </button>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setPhaseFilter('all')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              phaseFilter === 'all'
                ? 'bg-red-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setPhaseFilter('j1')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              phaseFilter === 'j1'
                ? 'bg-red-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Jornada 1
          </button>
          <button
            onClick={() => setPhaseFilter('j2')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              phaseFilter === 'j2'
                ? 'bg-red-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Jornada 2
          </button>
          <button
            onClick={() => setPhaseFilter('j3')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              phaseFilter === 'j3'
                ? 'bg-red-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Jornada 3
          </button>
          <button
            onClick={() => setPhaseFilter('eliminatorias')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              phaseFilter === 'eliminatorias'
                ? 'bg-red-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Eliminatorias
          </button>
        </div>
      </div>

      {/* Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3" style={{ marginTop: '1.5rem' }}>
        <span className="text-lg">🔒</span>
        <div className="flex-1">
          <p className="text-sm text-amber-900">
            Las predicciones de cada participante se <span className="font-semibold">revelan 15 min antes</span> del inicio del partido (al cerrarse la edición).
            Hasta entonces ves el fixture, pero no los marcadores ajenos. Reveladas: <span className="font-semibold">0</span> de 72.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200" style={{ marginTop: '1.5rem' }}>
        <table className="w-full">
          <thead className="sticky top-0 z-20">
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="res-th-match px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide sticky left-0 bg-slate-50 z-30">
                Partido
              </th>
              {sortedUsers.map((user: any, idx: number) => {
                const isMe = user.id === currentUserId
                return (
                  <th key={user.id} colSpan={2} className={`px-2 py-3 border-l ${isMe ? 'bg-red-50 border-red-200' : 'border-slate-100'}`}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${isMe ? 'ring-2 ring-red-500 ring-offset-1' : ''} ${avatarColors[idx % avatarColors.length]}`}>
                        {getUserInitials(user.display_name)}
                      </div>
                      <div className={`text-xs font-semibold ${isMe ? 'text-red-700' : 'text-slate-700'}`}>{user.display_name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">#{user.rank}</div>
                    </div>
                  </th>
                )
              })}
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="res-th-match px-4 py-1.5 sticky left-0 bg-slate-50 z-30"></th>
              {sortedUsers.map((user: any) => {
                const isMe = user.id === currentUserId
                return (
                  <React.Fragment key={user.id}>
                    <th className={`px-1 py-1.5 text-center border-l text-[10px] font-semibold uppercase ${isMe ? 'bg-red-50 border-red-200 text-red-500' : 'border-slate-100 text-slate-500'}`}>MARC.</th>
                    <th className={`px-1 py-1.5 text-center text-[10px] font-semibold uppercase ${isMe ? 'bg-red-50 text-red-500' : 'text-slate-500'}`}>PTS</th>
                  </React.Fragment>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {filteredPhases.map((phase: any) => {
            const phaseMatches = phase.matches

            // Calculate subtotals for this phase
            const phaseSubtotals: Record<string, number> = {}
            sortedUsers.forEach((user: any) => {
              phaseSubtotals[user.id] = phaseMatches.reduce((sum: number, match: any) => {
                const pred = predsByUserAndMatch[user.id]?.[match.id]
                return sum + (pred?.points_earned || 0)
              }, 0)
            })

            // Get date range
            const firstDate = phaseMatches[0] ? new Date(phaseMatches[0].match_date).toLocaleDateString('es-CO', {
              timeZone: 'America/Bogota',
              day: 'numeric',
              month: 'short'
            }) : ''
            const lastDate = phaseMatches[phaseMatches.length - 1] ? new Date(phaseMatches[phaseMatches.length - 1].match_date).toLocaleDateString('es-CO', {
              timeZone: 'America/Bogota',
              day: 'numeric',
              month: 'short'
            }) : ''
            const dateRange = firstDate === lastDate ? firstDate : `${firstDate} - ${lastDate}`

            return (
              <React.Fragment key={phase.key}>
                {/* Phase Header */}
                <tr className="bg-slate-100 border-y border-slate-200">
                  <td colSpan={100} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">{phase.label}</h3>
                      <span className="text-xs text-slate-500">{dateRange}</span>
                    </div>
                  </td>
                </tr>

                {/* Matches */}
                {phaseMatches.map((match: any, idx: number) => {
                  const matchDate = new Date(match.match_date)
                  const fifteenMinBefore = new Date(matchDate.getTime() - 15 * 60 * 1000)
                  const isPredictionVisible = new Date() >= fifteenMinBefore
                  const hasResult = match.home_score !== null && match.away_score !== null

                  const homeTeamDisplay = match.home_team?.name || match.home_team_label || '?'
                  const awayTeamDisplay = match.away_team?.name || match.away_team_label || '?'
                  const homeFlagEmoji = match.home_team?.flag_emoji || '?'
                  const awayFlagEmoji = match.away_team?.flag_emoji || '?'

                  const matchTime = matchDate.toLocaleTimeString('es-CO', {
                    timeZone: 'America/Bogota',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })

                  return (
                    <tr key={match.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="res-td-match px-4 py-3 sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-2">
                          <div className="res-match-time text-xs text-slate-400 font-mono">{matchTime}</div>
                          <div className="flex items-center gap-1">
                            <span className="text-base">{homeFlagEmoji}</span>
                            <span className="res-match-name font-medium text-sm text-slate-700">{homeTeamDisplay}</span>
                          </div>
                          <div className="text-xs text-slate-400">vs</div>
                          <div className="flex items-center gap-1">
                            <span className="text-base">{awayFlagEmoji}</span>
                            <span className="res-match-name font-medium text-sm text-slate-700">{awayTeamDisplay}</span>
                          </div>
                        </div>
                      </td>

                      {sortedUsers.map((user: any) => {
                        const pred = predsByUserAndMatch[user.id]?.[match.id]
                        const isMe = user.id === currentUserId

                        return (
                          <React.Fragment key={user.id}>
                            <td className={`px-1 py-3 text-center border-l ${isMe ? 'bg-red-50 border-red-200' : 'border-slate-100'}`}>
                              {isPredictionVisible ? (
                                pred ? (
                                  <span className={`text-xs font-mono ${isMe ? 'text-red-700 font-bold' : 'text-slate-600'}`}>{pred.pred_home}-{pred.pred_away}</span>
                                ) : (
                                  <span className="text-xs text-slate-300">—</span>
                                )
                              ) : (
                                <span className="text-slate-300 text-sm">🔒</span>
                              )}
                            </td>
                            <td className={`px-1 py-3 text-center ${isMe ? 'bg-red-50' : ''}`}>
                              {pred?.points_earned > 0 ? (
                                <span className={`text-xs font-semibold ${isMe ? 'text-red-700' : 'text-slate-600'}`}>{pred.points_earned}</span>
                              ) : (
                                <span className="text-xs text-slate-300">·</span>
                              )}
                            </td>
                          </React.Fragment>
                        )
                      })}
                    </tr>
                  )
                })}

                {/* Subtotal Row */}
                <tr className="bg-slate-100 border-y border-slate-200">
                  <td className="px-4 py-2 text-xs font-bold text-slate-600 uppercase sticky left-0 bg-slate-100 z-10">
                    Subtotal {phase.label}
                  </td>
                  {sortedUsers.map((user: any) => {
                    const isMe = user.id === currentUserId
                    return (
                      <React.Fragment key={user.id}>
                        <td className={`px-1 py-2 text-center border-l ${isMe ? 'bg-red-100 border-red-300' : 'border-slate-200'}`}></td>
                        <td className={`px-1 py-2 text-center text-xs font-bold ${isMe ? 'bg-red-100 text-red-700' : 'text-red-600'}`}>
                          {phaseSubtotals[user.id] || '·'}
                        </td>
                      </React.Fragment>
                    )
                  })}
                </tr>
              </React.Fragment>
            )
          })}

          {/* Grand Total Row */}
          <tr className="bg-slate-900 text-white">
            <td className="px-4 py-4 text-sm font-bold uppercase sticky left-0 bg-slate-900 z-10">
              Total general
            </td>
            {sortedUsers.map((user: any) => {
              const totalPoints = Object.values(predsByUserAndMatch[user.id] || {}).reduce(
                (sum: number, pred: any) => sum + (pred.points_earned || 0),
                0
              )
              const isMe = user.id === currentUserId

              return (
                <React.Fragment key={user.id}>
                  <td className={`px-1 py-4 text-center border-l ${isMe ? 'bg-red-900 border-red-700' : 'border-slate-700'}`}></td>
                  <td className={`px-1 py-4 text-center text-base font-bold ${isMe ? 'bg-red-900 text-red-200' : ''}`}>
                    {totalPoints}
                  </td>
                </React.Fragment>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>

      {/* Footer with stats */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4" style={{ marginTop: '1.5rem' }}>
        <p className="text-sm text-amber-900">
          <span className="font-bold">chatas1</span> va al día con <span className="font-semibold">72/72 predicciones</span> · 14 participantes · 104 partidos (72 de grupos + 32 eliminatorias) · 0 jugados
        </p>
      </div>
    </div>
  )
}

// ============================================
// ESTADÍSTICAS TAB
// ============================================

const LINE_COLORS = ['#dc2626','#2563eb','#16a34a','#d97706','#7c3aed','#db2777','#0891b2','#65a30d',
  '#ea580c','#4f46e5','#0d9488','#c026d3','#ca8a04','#9333ea','#e11d48','#0284c7',
  '#15803d','#b45309','#6d28d9','#be185d','#0369a1','#047857','#92400e','#5b21b6']

function EvolutionChart({ allUsers, latestPreds }: { allUsers: any[], latestPreds: Record<string, any> }) {
  const [hoveredValue, setHoveredValue] = React.useState<number | null>(null)

  const flatPreds = Object.values(latestPreds)
  const dateMap: Record<string, any[]> = {}
  flatPreds.forEach((p: any) => {
    if (!p.match?.match_date || !p.calculated) return
    const dateKey = new Date(p.match.match_date).toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota', day: 'numeric', month: 'short'
    })
    if (!dateMap[dateKey]) dateMap[dateKey] = []
    dateMap[dateKey].push(p)
  })

  const sortedDates = Object.keys(dateMap).sort((a, b) =>
    new Date(dateMap[a][0].match.match_date).getTime() - new Date(dateMap[b][0].match.match_date).getTime()
  )

  const cumulative: Record<string, number> = {}
  allUsers.forEach((u: any) => { cumulative[u.display_name] = 0 })

  const evolutionData = sortedDates.map(dateKey => {
    const row: any = { fecha: dateKey }
    allUsers.forEach((user: any) => {
      const pts = dateMap[dateKey]
        .filter((p: any) => p.user_id === user.id)
        .reduce((sum: number, p: any) => sum + (p.points_earned || 0), 0)
      cumulative[user.display_name] = (cumulative[user.display_name] || 0) + pts
      row[user.display_name] = cumulative[user.display_name]
    })
    return row
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6" style={{ marginTop: '1.5rem' }}>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">Evolución de puntos por fecha</h3>
      <p className="text-sm text-slate-600 mb-4">Puntaje acumulado de cada participante — {allUsers.length} jugadores</p>
      {evolutionData.length === 0 ? (
        <div className="text-center text-sm text-slate-400 py-10">
          Aún no hay partidos jugados. La gráfica mostrará la evolución apenas se carguen resultados.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={420}>
          <LineChart data={evolutionData} margin={{ top: 8, right: 24, bottom: 24, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="fecha" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                // Mostrar solo usuarios con el valor exacto del punto señalado
                const filtered = hoveredValue !== null
                  ? payload.filter((p: any) => p.value === hoveredValue)
                  : payload
                if (!filtered.length) return null
                return (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                    <p style={{ fontWeight: 700, color: '#1e2a44', marginBottom: 6 }}>{label} · {filtered[0].value} pts</p>
                    {filtered.map((entry: any) => (
                      <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: entry.stroke, flexShrink: 0 }} />
                        <span style={{ color: '#374151' }}>{String(entry.dataKey)}</span>
                      </div>
                    ))}
                  </div>
                )
              }}
            />
            {allUsers.map((user: any, idx: number) => (
              <Line
                key={user.id}
                type="monotone"
                dataKey={user.display_name}
                stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{
                  r: 6,
                  onMouseOver: (_: any, payload: any) => setHoveredValue(payload?.value ?? null),
                  onMouseOut: () => setHoveredValue(null),
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

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
        .select('id, type, value, user_id, updated_at, created_at')
        .order('updated_at', { ascending: false })

      // Load all predictions paginando (Supabase limita 1000/página)
      let predictions: any[] = []
      for (let page = 0; page < 10; page++) {
        const { data: batch } = await supabase
          .from('predictions')
          .select(`
            pred_home,
            pred_away,
            match_id,
            points_earned,
            calculated,
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
          .range(page * 1000, (page + 1) * 1000 - 1)
        if (!batch || batch.length === 0) break
        predictions = predictions.concat(batch)
        if (batch.length < 1000) break
      }

      // Count played matches (with results)
      const { count: playedCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .not('home_score', 'is', null)

      // Load top 10 users by points
      const { data: users } = await supabase
        .from('profiles')
        .select('id, display_name, total_points')
        .order('total_points', { ascending: false })

      // Calculate current streaks
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('id, display_name')

      let allPredictions: any[] = []
      for (let page = 0; page < 10; page++) {
        const { data: batch } = await supabase
          .from('predictions')
          .select(`user_id, points_earned, match_id, match:matches!inner(match_number, status)`)
          .eq('match:matches.status', 'finished')
          .order('match:matches.match_number', { ascending: false })
          .range(page * 1000, (page + 1) * 1000 - 1)
        if (!batch || batch.length === 0) break
        allPredictions = allPredictions.concat(batch)
        if (batch.length < 1000) break
      }

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

      setData({ specialPreds, predictions, users, streaks, allUsers, playedMatches: playedCount ?? 0 })
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
          const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()
          const capitalize = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase())
          // Use lowercase key for grouping, capitalize for display
          const normalizedKey = `${normalize(parsed.first_name)} ${normalize(parsed.last_name)}`
          displayValue = capitalize(normalizedKey)
        }
      } catch (e) {
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

  // Count total participants from all users
  const totalParticipants = data.allUsers?.length || 0

  // Get champion favorite
  const championData = specialByType.champion || {}
  const championEntries = Object.entries(championData).sort((a, b) => (b[1] as number) - (a[1] as number))
  const championFavorite = championEntries[0] || ['', 0]
  const championPercent = totalParticipants > 0 ? Math.round(((championFavorite[1] as number) / totalParticipants) * 100) : 0

  const totalMatches = 104
  const playedMatches = data.playedMatches ?? 0

  return (
    <div>
      {/* Header */}
      <div className="section-head">
        <div className="h-left">
          <h1><span className="accent">Estadísticas</span> de la polla</h1>
          <p>Cómo se reparten las predicciones especiales, el marcador más escogido por partido y quién lleva más avanzada su quiniela entre los {totalParticipants} participantes. El torneo arranca el 11 de junio.</p>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginTop: '1.5rem' }}>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Número de participantes</div>
          <div className="text-4xl font-bold text-slate-900">{totalParticipants}</div>
          <div className="text-sm text-slate-600 mt-1">jugadores inscritos en la polla</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Campeón favorito</div>
          <div className="text-4xl font-bold text-red-600">{championFavorite[0] || 'N/A'}</div>
          <div className="text-sm text-slate-600 mt-1">{championFavorite[1]} de {totalParticipants} votos ({championPercent}%)</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Partidos faltantes</div>
          <div className="text-4xl font-bold text-slate-900">{totalMatches - playedMatches}</div>
          <div className="text-sm text-slate-600 mt-1">{playedMatches}/{totalMatches} partidos jugados</div>
        </div>
      </div>

      {/* Donut Charts - Champion, Runner-up, Third Place */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginTop: '1.5rem' }}>
        {['champion', 'runner_up', 'third_place'].map((type) => {
          const values = specialByType[type] || {}
          const chartData = Object.entries(values)
            .map(([value, count]) => ({
              name: value,
              value: count as number
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5) // Top 5

          const icon = type === 'champion' ? '🏆' : type === 'runner_up' ? '🥈' : '🥉'
          const subtitle = type === 'champion' ? 'Quién levanta la copa' : type === 'runner_up' ? 'Finalista pronosticado' : 'Podio · 3.er puesto'
          const leader = chartData.length > 0 ? chartData[0] : null
          const leaderPercent = leader ? ((leader.value / totalParticipants) * 100).toFixed(0) : '0'

          return (
            <div key={type} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  {icon} {typeLabels[type]}
                </h3>
                <p className="text-sm text-slate-500">{subtitle}</p>
              </div>
              {chartData.length > 0 ? (
                <>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={false}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Leader display in center */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="text-4xl font-bold text-slate-900">{leaderPercent}%</div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">{leader?.name}</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {chartData.map((entry, index) => {
                      const percent = ((entry.value / totalParticipants) * 100).toFixed(0)
                      return (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-slate-700 font-medium">{entry.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{entry.value}</span>
                            <span className="text-slate-500">{percent}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-center py-8">Sin datos</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Horizontal Bar Charts - Top Scorer and MVP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginTop: '1.5rem' }}>
        {['top_scorer', 'mvp'].map((type) => {
          const values = specialByType[type] || {}
          const chartData = Object.entries(values)
            .map(([value, count]) => {
              // Parse player data if it's JSON
              let displayName = value
              try {
                const player = JSON.parse(value)
                displayName = `${player.first_name} ${player.last_name}`
              } catch (e) {
                // If not JSON, use as is
              }
              return {
                name: displayName,
                value: count as number
              }
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 8) // Top 8

          const maxValue = chartData.length > 0 ? chartData[0].value : 1
          const icon = type === 'top_scorer' ? '⚽' : '🏆'
          const title = type === 'top_scorer' ? 'Máximo goleador' : 'Mejor jugador (MVP)'
          const subtitle = type === 'top_scorer' ? 'Predicción de Bota de Oro' : 'Balón de Oro pronosticado'
          const barColor = type === 'top_scorer' ? '#991b1b' : '#854d0e'

          return (
            <div key={type} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  {icon} {title}
                </h3>
                <p className="text-sm text-slate-500">{subtitle}</p>
              </div>
              {chartData.length > 0 ? (
                <div className="space-y-4">
                  {chartData.map((item, index) => {
                    const percentage = ((item.value / totalParticipants) * 100).toFixed(0)
                    const widthPercentage = (item.value / maxValue) * 100

                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-900">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-slate-900">{item.value}</span>
                            <span className="text-sm text-slate-500">· {percentage}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-8 relative overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${widthPercentage}%`,
                              backgroundColor: barColor
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">Sin datos</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Tabla de puntos especiales por usuario */}
      {(() => {
        const teamPredDeadline = new Date('2026-06-11T23:59:59-05:00')
        const knockoutDeadline = new Date('2026-06-28T00:00:00-05:00')
        const allUsers = data.allUsers || []

        const getLatestPred = (userId: string, type: string) =>
          data.specialPreds?.filter((p: any) => p.user_id === userId && p.type === type)
            .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]

        const getPotentialPts = (pred: any, fullPts: number) => {
          if (!pred) return null
          const savedAt = new Date(pred.updated_at || pred.created_at)
          if (savedAt < teamPredDeadline) return fullPts
          if (savedAt < knockoutDeadline) return fullPts / 2
          return 0
        }

        const rows = [
          { type: 'champion',    label: '🥇 Campeón',    fullPts: 20 },
          { type: 'runner_up',   label: '🥈 Subcampeón', fullPts: 12 },
          { type: 'third_place', label: '🥉 Tercer Lugar', fullPts: 12 },
        ]

        return (
          <div className="bg-white rounded-xl border border-slate-200 p-6" style={{ marginTop: '1.5rem' }}>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Predicciones especiales de equipos</h3>
            <p className="text-sm text-slate-600 mb-4">Puntos potenciales por campeón, subcampeón y tercer lugar</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 sticky left-0 bg-slate-50">Predicción</th>
                    {allUsers.map((u: any) => (
                      <th key={u.id} className="px-2 py-2 text-center font-semibold text-slate-600 whitespace-nowrap">{u.display_name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ type, label, fullPts }) => (
                    <tr key={type} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-700 sticky left-0 bg-white whitespace-nowrap">{label}</td>
                      {allUsers.map((u: any) => {
                        const pred = getLatestPred(u.id, type)
                        const pts = getPotentialPts(pred, fullPts)
                        const isReduced = pred && pts !== null && pts < fullPts && pts > 0
                        return (
                          <td key={u.id} className="px-2 py-2 text-center">
                            {pred ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-xs text-slate-700 leading-tight">{pred.value}</span>
                                <span className={`text-xs font-bold ${isReduced ? 'text-amber-600' : 'text-green-700'}`}>
                                  {pts} pts
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-3">🟡 Amarillo = puntos reducidos por edición posterior al 11 jun</p>
          </div>
        )
      })()}

      <EvolutionChart allUsers={data.users || []} latestPreds={latestPredsByUserAndMatch} />

      {/* Bar Charts - Most Picked Scores by Match */}
      <div className="bg-white rounded-xl border border-slate-200 p-6" style={{ marginTop: '1.5rem' }}>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Marcadores más escogidos</h3>
        <p className="text-sm text-slate-600 mb-6">Por cada partido del Mundial</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <div key={matchId} className="bg-slate-50 rounded-xl p-4">
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Partido #{matchNumber === 999 ? matchId : matchNumber}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <span>{homeTeam?.flag_emoji || '🏴'}</span>
                      <span className="font-semibold text-slate-900">{homeDisplay}</span>
                      <span className="text-slate-400">vs</span>
                      <span className="font-semibold text-slate-900">{awayDisplay}</span>
                      <span>{awayTeam?.flag_emoji || '🏴'}</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 28)}>
                    <BarChart data={chartData} barSize={Math.max(10, Math.min(28, 180 / chartData.length))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="score"
                        tick={{ fontSize: chartData.length > 8 ? 8 : 10 }}
                        height={30}
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={25} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-2 border border-slate-200 rounded shadow-sm">
                                <p className="text-xs font-semibold">{payload[0].payload.score}</p>
                                <p className="text-xs text-slate-600">
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
