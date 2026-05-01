'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmPage() {
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Check if user is authenticated after email confirmation
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          setError('Error al confirmar el correo. Por favor intenta nuevamente.')
          return
        }

        // User is confirmed, redirect to dashboard
        router.push('/dashboard')
        router.refresh()
      } catch (err) {
        setError('Error al confirmar el correo. Por favor intenta nuevamente.')
      }
    }

    handleEmailConfirmation()
  }, [router, supabase])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-800 mb-2">
              <span className="inline-block mr-2">⚽</span>
              Polla Mundial 2026
            </h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-red-100">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                Error de confirmación
              </h2>
              <p className="text-slate-600 mb-6">
                {error}
              </p>
              <a
                href="/"
                className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Volver al inicio de sesión
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            <span className="inline-block mr-2">⚽</span>
            Polla Mundial 2026
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-red-100">
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              Confirmando tu cuenta
            </h2>
            <p className="text-slate-600">
              Espera un momento mientras confirmamos tu correo electrónico...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
