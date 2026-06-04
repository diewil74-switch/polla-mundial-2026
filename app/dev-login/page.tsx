'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DevLoginPage() {
  const [status, setStatus] = useState('Iniciando sesión...')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (window.location.hostname !== 'localhost') {
      setStatus('No disponible en producción.')
      return
    }

    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', ''))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            setStatus('Error: ' + error.message)
          } else {
            setStatus('Sesión iniciada, redirigiendo...')
            router.push('/dashboard')
          }
        })
    } else {
      // Try code flow
      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get('code')
      if (code) {
        supabase.auth.exchangeCodeForSession(code)
          .then(({ error }) => {
            if (error) {
              setStatus('Error: ' + error.message)
            } else {
              setStatus('Sesión iniciada, redirigiendo...')
              router.push('/dashboard')
            }
          })
      } else {
        setStatus('No se encontraron tokens en la URL.')
      }
    }
  }, [router, supabase])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <p style={{ fontSize: 18, color: '#444' }}>{status}</p>
    </div>
  )
}
