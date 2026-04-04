import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#060b14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#38bdf8', fontFamily: 'sans-serif', fontSize: 18,
    }}>
      Carregando...
    </div>
  )

  return session ? <Dashboard user={session.user} /> : <Auth />
}
