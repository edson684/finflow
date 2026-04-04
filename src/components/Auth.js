import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const inp = {
  width: '100%', boxSizing: 'border-box',
  background: '#060b14', border: '1px solid #0f1f35',
  borderRadius: 10, padding: '12px 14px',
  color: '#e2e8f0', fontSize: 14, outline: 'none',
}

export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Conta criada! Verifique seu e-mail para confirmar.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#060b14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    }}>
      <div style={{
        background: '#080f1e', border: '1px solid #0f1f35',
        borderRadius: 20, padding: 40, width: 400,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 38, height: 38,
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: '#fff',
          }}>₿</div>
          <span style={{ fontWeight: 700, fontSize: 20, color: '#e2e8f0', letterSpacing: '-0.5px' }}>FinFlow</span>
        </div>

        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>
          {mode === 'login' ? 'Entrar na conta' : 'Criar conta'}
        </h2>
        <p style={{ margin: '0 0 28px', color: '#475569', fontSize: 14 }}>
          {mode === 'login' ? 'Bem-vindo de volta!' : 'Comece a controlar suas finanças'}
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>E-mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com" style={inp} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>Senha</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" style={inp} />
        </div>

        {error && (
          <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ background: '#22c55e15', border: '1px solid #22c55e30', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#22c55e', fontSize: 13 }}>
            {message}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: '13px',
          background: loading ? '#1e293b' : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
          color: '#fff', border: 'none', borderRadius: 10,
          fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: 16,
        }}>
          {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        <p style={{ textAlign: 'center', color: '#475569', fontSize: 14, margin: 0 }}>
          {mode === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setMessage(null) }}
            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            {mode === 'login' ? 'Criar conta' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  )
}
