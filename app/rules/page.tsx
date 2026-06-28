import Link from 'next/link'

export default function RulesPage() {
  return (
    <div className="min-h-screen" style={{ background: '#f8f5f2' }}>
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-2">
            Cómo se <span className="text-red-600">juega</span>
          </h1>
          <p className="text-lg text-slate-600">
            Reglas de puntaje de la Polla Mundial 2026. Los puntos de cada partido <strong>se suman</strong> según qué tan cerca quedes del resultado real.
          </p>
        </div>

        {/* Fase de Grupos */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-6 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span>⚽</span>
            Fase de grupos · por partido
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3">
              <span className="text-slate-700">Resultado exacto (marcador correcto)</span>
              <span className="font-bold text-red-600 text-xl">3 pts</span>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <span className="text-slate-700">Gol acertado por equipo</span>
              <span className="font-bold text-red-600 text-xl">1 pt c/u</span>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <span className="text-slate-700">Ganador o empate correcto</span>
              <span className="font-bold text-red-600 text-xl">2 pts</span>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <span className="text-slate-700">Predicción única (solo tú acertaste el exacto)</span>
              <span className="font-bold text-red-600 text-xl">+5 pts</span>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <span className="text-slate-700">Resultado equivocado</span>
              <span className="font-bold text-slate-500 text-xl">0 pts</span>
            </div>
          </div>

          {/* Bono orden de grupo */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="bg-red-50 rounded-lg p-4 flex items-start gap-3">
              <span className="text-2xl">🎯</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-900">Bono orden de grupo:</span>
                  <span className="font-bold text-red-600 text-xl">+3 pts</span>
                </div>
                <p className="text-sm text-slate-600">
                  acertar el orden completo (1.º–4.º) de un grupo otorga <strong>+3 pts</strong>. Cierre: 11 jun 2026.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ejemplo de puntuación */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-6 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span>📖</span>
            Ejemplo de puntuación
          </h2>

          <div className="bg-orange-50 rounded-lg p-4 mb-6 border border-orange-200">
            <p className="text-slate-800 font-semibold">
              <span className="text-slate-600 text-sm uppercase tracking-wide mr-2">RESULTADO REAL</span>
              🇲🇽 <strong>México 2–1 Sudáfrica</strong> 🇿🇦
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Eres el único */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-slate-900 mb-1">México 2–1 Sudáfrica</div>
                  <div className="text-xs uppercase tracking-wide text-slate-500 bg-slate-200 inline-block px-2 py-1 rounded">ERES EL ÚNICO</div>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-slate-700">Marcador exacto</span>
                  <span className="ml-auto font-semibold">+3</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-slate-700">Gol local (2)</span>
                  <span className="ml-auto font-semibold">+1</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-slate-700">Gol visitante (1)</span>
                  <span className="ml-auto font-semibold">+1</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-slate-700">Ganador (México)</span>
                  <span className="ml-auto font-semibold">+2</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-slate-700">Predicción única</span>
                  <span className="ml-auto font-semibold">+5</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-300 flex justify-between items-center">
                <span className="text-sm uppercase tracking-wide text-slate-600">TOTAL</span>
                <span className="text-2xl font-bold text-red-600">12 pts</span>
              </div>
            </div>

            {/* Otros también */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-slate-900 mb-1">México 2–1 Sudáfrica</div>
                  <div className="text-xs uppercase tracking-wide text-slate-500 bg-slate-200 inline-block px-2 py-1 rounded">OTROS TAMBIÉN</div>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-slate-700">Marcador exacto</span>
                  <span className="ml-auto font-semibold">+3</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-slate-700">Gol local (2)</span>
                  <span className="ml-auto font-semibold">+1</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-slate-700">Gol visitante (1)</span>
                  <span className="ml-auto font-semibold">+1</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-slate-700">Ganador (México)</span>
                  <span className="ml-auto font-semibold">+2</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-slate-400">✗</span>
                  <span className="text-slate-500">Predicción única</span>
                  <span className="ml-auto font-semibold text-slate-400">0</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-300 flex justify-between items-center">
                <span className="text-sm uppercase tracking-wide text-slate-600">TOTAL</span>
                <span className="text-2xl font-bold text-red-600">7 pts</span>
              </div>
            </div>

            {/* México 3–1 Sudáfrica */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-slate-900 mb-1">México 3–1 Sudáfrica</div>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-slate-400">✗</span>
                  <span className="text-slate-500">Marcador exacto</span>
                  <span className="ml-auto font-semibold text-slate-400">0</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-slate-400">✗</span>
                  <span className="text-slate-500">Gol local (3≠2)</span>
                  <span className="ml-auto font-semibold text-slate-400">0</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-slate-700">Gol visitante (1)</span>
                  <span className="ml-auto font-semibold">+1</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-slate-700">Ganador (México)</span>
                  <span className="ml-auto font-semibold">+2</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-300 flex justify-between items-center">
                <span className="text-sm uppercase tracking-wide text-slate-600">TOTAL</span>
                <span className="text-2xl font-bold text-red-600">3 pts</span>
              </div>
            </div>

            {/* México 1–0 Sudáfrica */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-slate-900 mb-1">México 1–0 Sudáfrica</div>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-slate-400">✗</span>
                  <span className="text-slate-500">Marcador exacto</span>
                  <span className="ml-auto font-semibold text-slate-400">0</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-slate-400">✗</span>
                  <span className="text-slate-500">Gol local (1≠2)</span>
                  <span className="ml-auto font-semibold text-slate-400">0</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-slate-400">✗</span>
                  <span className="text-slate-500">Gol visitante (0≠1)</span>
                  <span className="ml-auto font-semibold text-slate-400">0</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-slate-700">Ganador (México)</span>
                  <span className="ml-auto font-semibold">+2</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-300 flex justify-between items-center">
                <span className="text-sm uppercase tracking-wide text-slate-600">TOTAL</span>
                <span className="text-2xl font-bold text-red-600">2 pts</span>
              </div>
            </div>

            {/* Sudáfrica 2–0 México */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 md:col-span-2">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-slate-900 mb-1">Sudáfrica 2–0 México</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-slate-400">✗</span>
                  <span className="text-slate-500">Marcador exacto</span>
                  <span className="ml-auto font-semibold text-slate-400">0</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-slate-400">✗</span>
                  <span className="text-slate-500">Gol local</span>
                  <span className="ml-auto font-semibold text-slate-400">0</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-slate-400">✗</span>
                  <span className="text-slate-500">Gol visitante</span>
                  <span className="ml-auto font-semibold text-slate-400">0</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-slate-400">✗</span>
                  <span className="text-slate-500">Ganador (predijiste Sudáfrica, ganó México)</span>
                  <span className="ml-auto font-semibold text-slate-400">0</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-300 flex justify-between items-center">
                <span className="text-sm uppercase tracking-wide text-slate-600">TOTAL</span>
                <span className="text-2xl font-bold text-slate-400">0 pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rondas eliminatorias */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-6 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span>🏆</span>
            Rondas eliminatorias · por partido
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3">
              <span className="text-slate-700">Ganador o empate correcto</span>
              <span className="font-bold text-red-600 text-xl">2 pts</span>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <span className="text-slate-700">Acertar el clasificado a la siguiente ronda</span>
              <span className="font-bold text-red-600 text-xl">+3 pts</span>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <span className="text-slate-700">Acertar resultado exacto en 120 min</span>
              <span className="font-bold text-red-600 text-xl">+3 pts</span>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <span className="text-slate-700">Gol acertado por equipo</span>
              <span className="font-bold text-red-600 text-xl">+1 pt c/u</span>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <span className="text-slate-700">Predicción única (solo tú acertaste el exacto)</span>
              <span className="font-bold text-red-600 text-xl">+5 pts</span>
            </div>
          </div>
        </div>

        {/* Predicciones especiales */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-6 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span>⭐</span>
            Predicciones especiales · sistema progresivo
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-4 text-slate-700 font-semibold uppercase text-xs tracking-wide">PREDICCIÓN</th>
                  <th className="text-center py-3 px-4 text-slate-700 font-semibold uppercase text-xs tracking-wide">ANTES 11 JUN</th>
                  <th className="text-center py-3 px-4 text-slate-700 font-semibold uppercase text-xs tracking-wide">11–28 JUN</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-semibold uppercase text-xs tracking-wide">DEADLINE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span>🥇</span>
                      <span className="font-medium">Campeón</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="font-bold text-red-600 text-lg">20 pts</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="font-bold text-red-600 text-lg">10 pts</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-600">28 jun 2026</td>
                </tr>
                <tr>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span>🥈</span>
                      <span className="font-medium">Subcampeón</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="font-bold text-red-600 text-lg">12 pts</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="font-bold text-red-600 text-lg">6 pts</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-600">28 jun 2026</td>
                </tr>
                <tr>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span>🥉</span>
                      <span className="font-medium">3.er lugar</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="font-bold text-red-600 text-lg">12 pts</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="font-bold text-red-600 text-lg">6 pts</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-600">28 jun 2026</td>
                </tr>
                <tr>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span>⚽</span>
                      <span className="font-medium">Máximo goleador</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="font-bold text-red-600 text-lg">10 pts</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-slate-400 italic text-sm">Bloqueado</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-600">11 jun, 2pm</td>
                </tr>
                <tr>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span>⭐</span>
                      <span className="font-medium">Mejor jugador (MVP)</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="font-bold text-red-600 text-lg">10 pts</span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="text-slate-400 italic text-sm">Bloqueado</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-600">11 jun, 2pm</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Back button */}
        <div className="text-center mt-12">
          <Link
            href="/dashboard"
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
          >
            ← Volver al Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
