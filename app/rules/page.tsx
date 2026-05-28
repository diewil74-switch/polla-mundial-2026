import Link from 'next/link'

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-800 mb-4">
            <span className="inline-block mr-3">📋</span>
            Reglas de Puntuación
          </h1>
          <p className="text-lg text-slate-600">Copa Mundial FIFA 2026</p>
        </div>

        {/* Fase de Grupos */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border border-red-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
            <span className="mr-3">⚽</span>
            Fase de Grupos (por partido)
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <span className="text-slate-700">Resultado exacto (marcador correcto)</span>
              <span className="font-bold text-green-700 text-xl">3 pts</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
              <span className="text-slate-700">Gol acertado por equipo</span>
              <span className="font-bold text-purple-700 text-xl">1 pt (c/u)</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-slate-700">Ganador o empate correcto (sin acertar marcador ni goles)</span>
              <span className="font-bold text-blue-700 text-xl">2 pts</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <span className="text-slate-700">Predicción única (único jugador que acertó marcador exacto)</span>
              <span className="font-bold text-yellow-700 text-xl">+5 pts</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-slate-700">Resultado equivocado</span>
              <span className="font-bold text-gray-700 text-xl">0 pts</span>
            </div>
          </div>

          <div className="bg-slate-100 rounded-lg p-4 mt-6">
            <p className="font-semibold text-slate-800 mb-3">📖 Ejemplo de puntuación:</p>
            <p className="text-sm text-slate-700 mb-3">
              <strong>Resultado real:</strong> 🇲🇽 México 2-1 Sudáfrica 🇿🇦
            </p>
            <div className="space-y-2 text-xs">
              <div className="bg-white rounded p-2 border-l-4 border-green-500">
                <p className="font-semibold text-slate-800">Tu predicción: México 2-1 Sudáfrica (eres el único)</p>
                <p className="text-slate-600 mt-1">
                  ✅ Marcador exacto: <strong>3 pts</strong><br/>
                  ✅ Gol local (2): <strong>1 pt</strong><br/>
                  ✅ Gol visitante (1): <strong>1 pt</strong><br/>
                  ✅ Ganador (México): <strong>2 pts</strong><br/>
                  ✅ Predicción única: <strong>5 pts</strong><br/>
                  <strong className="text-green-700">Total: 12 puntos</strong>
                </p>
              </div>
              <div className="bg-white rounded p-2 border-l-4 border-blue-500">
                <p className="font-semibold text-slate-800">Tu predicción: México 2-1 Sudáfrica (otros también)</p>
                <p className="text-slate-600 mt-1">
                  ✅ Marcador exacto: <strong>3 pts</strong><br/>
                  ✅ Gol local (2): <strong>1 pt</strong><br/>
                  ✅ Gol visitante (1): <strong>1 pt</strong><br/>
                  ✅ Ganador (México): <strong>2 pts</strong><br/>
                  ❌ Predicción única: <strong>0 pts</strong><br/>
                  <strong className="text-blue-700">Total: 7 puntos</strong>
                </p>
              </div>
              <div className="bg-white rounded p-2 border-l-4 border-yellow-500">
                <p className="font-semibold text-slate-800">Tu predicción: México 3-1 Sudáfrica</p>
                <p className="text-slate-600 mt-1">
                  ❌ Marcador exacto: <strong>0 pts</strong><br/>
                  ❌ Gol local (3≠2): <strong>0 pts</strong><br/>
                  ✅ Gol visitante (1): <strong>1 pt</strong><br/>
                  ✅ Ganador (México): <strong>2 pts</strong><br/>
                  <strong className="text-yellow-700">Total: 3 puntos</strong>
                </p>
              </div>
              <div className="bg-white rounded p-2 border-l-4 border-orange-500">
                <p className="font-semibold text-slate-800">Tu predicción: México 1-0 Sudáfrica</p>
                <p className="text-slate-600 mt-1">
                  ❌ Marcador exacto: <strong>0 pts</strong><br/>
                  ❌ Gol local (1≠2): <strong>0 pts</strong><br/>
                  ❌ Gol visitante (0≠1): <strong>0 pts</strong><br/>
                  ✅ Ganador (México): <strong>2 pts</strong><br/>
                  <strong className="text-orange-700">Total: 2 puntos</strong>
                </p>
              </div>
              <div className="bg-white rounded p-2 border-l-4 border-red-500">
                <p className="font-semibold text-slate-800">Tu predicción: Sudáfrica 2-0 México</p>
                <p className="text-slate-600 mt-1">
                  ❌ Marcador exacto: <strong>0 pts</strong><br/>
                  ❌ Gol local: <strong>0 pts</strong><br/>
                  ❌ Gol visitante: <strong>0 pts</strong><br/>
                  ❌ Ganador (predijiste Sudáfrica, ganó México): <strong>0 pts</strong><br/>
                  <strong className="text-red-700">Total: 0 puntos</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bono orden de grupo */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border border-red-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
            <span className="mr-3">🎯</span>
            Bono orden de grupo - Proyección de posiciones finales
          </h2>
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-700 font-medium">
                Acertar el orden completo del grupo (posiciones 1°, 2°, 3° y 4°)
              </span>
              <span className="font-bold text-yellow-700 text-2xl">+3 pts</span>
            </div>
          </div>

          <div className="space-y-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-800">¿Cómo funciona?</p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start">
                <span className="mr-2">1.</span>
                <span>En Dashboard/Grupos, cada tabla muestra una columna "Pos" donde debes asignar manualmente un número (1, 2, 3 o 4) a cada equipo</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">2.</span>
                <span>Este número indica la <strong>posición final proyectada</strong> que crees que tendrá el equipo al terminar la fase de grupos</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">3.</span>
                <span>La tabla se ordena automáticamente según tus predicciones de partidos, pero la columna "Pos" muestra tu proyección manual</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">4.</span>
                <span>Al finalizar la fase de grupos, si las 4 posiciones proyectadas coinciden con el orden real final, ganas 3 puntos</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">5.</span>
                <span><strong>Deadline:</strong> 11 de junio 2026, 11:00 PM (hora Colombia) - después de esta fecha no se pueden modificar las proyecciones</span>
              </li>
            </ul>
            <div className="bg-slate-100 rounded-lg p-3 mt-3">
              <p className="font-semibold text-slate-800 mb-1">Ejemplo:</p>
              <p className="text-xs">Si proyectas a México en posición 1, Argentina en 2, Polonia en 3 y Arabia en 4, y ese es el orden final real del grupo, ganas 3 puntos. Si aunque sea una posición es diferente, no ganas el bono.</p>
            </div>
          </div>
        </div>

        {/* Rondas eliminatorias */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border border-red-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
            <span className="mr-3">🏆</span>
            Rondas eliminatorias (por partido)
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
              <span className="text-slate-700">Acertar el clasificado a la siguiente ronda</span>
              <span className="font-bold text-purple-700 text-xl">3 pts</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-pink-50 rounded-lg border border-pink-200">
              <span className="text-slate-700">+ Acertar resultado exacto en 120 min</span>
              <span className="font-bold text-pink-700 text-xl">+3 pts</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <span className="text-slate-700">Predicción única (único jugador que acertó marcador exacto)</span>
              <span className="font-bold text-yellow-700 text-xl">+5 pts</span>
            </div>
          </div>
        </div>

        {/* Predicciones especiales */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border border-red-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
            <span className="mr-3">⭐</span>
            Predicciones especiales
          </h2>

          {/* Sistema progresivo de puntos */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Sistema Progresivo de Puntos</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Antes del 11 de junio, 2pm:</strong> Puntos completos</li>
              <li>• <strong>Del 11 al 28 de junio:</strong> Puntos reducidos para podio (Campeón, Subcampeón, 3er lugar). Goleador y MVP bloqueados.</li>
              <li>• <strong>Después del 28 de junio:</strong> Todas las predicciones especiales bloqueadas</li>
            </ul>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-4 text-slate-700 font-semibold">Predicción</th>
                  <th className="text-center py-3 px-4 text-slate-700 font-semibold">Antes 11 jun</th>
                  <th className="text-center py-3 px-4 text-slate-700 font-semibold">11-28 jun</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-semibold">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-red-50">
                  <td className="py-3 px-4">🥇 Campeón</td>
                  <td className="text-center py-3 px-4">
                    <span className="font-bold text-red-600 text-lg">20 pts</span>
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className="font-bold text-orange-600 text-lg">10 pts</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">28 jun 2026</td>
                </tr>
                <tr className="hover:bg-red-50">
                  <td className="py-3 px-4">🥈 Subcampeón</td>
                  <td className="text-center py-3 px-4">
                    <span className="font-bold text-red-600 text-lg">12 pts</span>
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className="font-bold text-orange-600 text-lg">6 pts</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">28 jun 2026</td>
                </tr>
                <tr className="hover:bg-red-50">
                  <td className="py-3 px-4">🥉 3er lugar</td>
                  <td className="text-center py-3 px-4">
                    <span className="font-bold text-red-600 text-lg">12 pts</span>
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className="font-bold text-orange-600 text-lg">6 pts</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">28 jun 2026</td>
                </tr>
                <tr className="hover:bg-red-50">
                  <td className="py-3 px-4">⚽ Máximo goleador</td>
                  <td className="text-center py-3 px-4">
                    <span className="font-bold text-red-600 text-lg">10 pts</span>
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className="text-slate-400 text-sm">Bloqueado</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">11 jun 2026, 2pm</td>
                </tr>
                <tr className="hover:bg-red-50">
                  <td className="py-3 px-4">🌟 Mejor jugador (MVP)</td>
                  <td className="text-center py-3 px-4">
                    <span className="font-bold text-red-600 text-lg">10 pts</span>
                  </td>
                  <td className="text-center py-3 px-4">
                    <span className="text-slate-400 text-sm">Bloqueado</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">11 jun 2026, 2pm</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Reglas generales */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-red-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center">
            <span className="mr-3">ℹ️</span>
            Reglas generales
          </h2>
          <ul className="space-y-3 text-slate-700">
            <li className="flex items-start">
              <span className="mr-3 text-red-600">•</span>
              <span>Las predicciones de cada partido se deben hacer 15 minutos antes de que inicie el partido</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-red-600">•</span>
              <span>Las predicciones especiales tienen plazo hasta el 11 de junio 2026, 2pm</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-red-600">•</span>
              <span>Campeón, subcampeón y tercer puesto podrán cambiarse hasta el 28 de junio con menos puntuación</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-red-600">•</span>
              <span>En eliminatorias la predicción es sobre el clasificado y no sobre el resultado del partido al término del tiempo reglamentario</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-red-600">•</span>
              <span>El administrador es el único que puede ingresar y/o modificar los resultados oficiales</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-red-600">•</span>
              <span>Errores pueden ser corregidos y puntos recalculados automáticamente. No hay reembolsos ni cancelaciones una vez hechas las predicciones</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-red-600">•</span>
              <span>Máximo 20 usuarios registrados</span>
            </li>
          </ul>
        </div>

        {/* Back button */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
