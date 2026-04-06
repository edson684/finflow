import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

// ── Constantes ────────────────────────────────────────────────────────────────
const FREE_TX_LIMIT = 50

const categoryColors = {
  Moradia: '#f97316', Alimentação: '#eab308', Saúde: '#22c55e',
  Lazer: '#a855f7', Transporte: '#3b82f6', Renda: '#10b981', Outros: '#6b7280',
}
const CATEGORIES = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Renda', 'Outros']
const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const formatCurrency = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const formatCurrencyShort = v => {
  const n = Number(v)
  if (Math.abs(n) >= 1000) return `R$${(n / 1000).toFixed(1)}k`
  return `R$${n.toFixed(0)}`
}
const formatDateLabel = (dateStr) => {
  const [year, month, day] = dateStr.split('-')
  const d = new Date(Number(year), Number(month) - 1, Number(day))
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '10px 16px' }}>
      <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600, margin: 0 }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

const inp = {
  width: '100%', boxSizing: 'border-box', background: '#060b14',
  border: '1px solid #0f1f35', borderRadius: 10, padding: '11px 14px',
  color: '#e2e8f0', fontSize: 14, outline: 'none',
}

const EMPTY_FORM = { desc: '', category: 'Alimentação', value: '', type: 'expense', date: '' }
const EMPTY_GOAL = { name: '', target: '', current: '' }

// ── Componente de Upgrade (tela modal) ────────────────────────────────────────
function UpgradeModal({ onClose, user }) {
  const [plan, setPlan] = useState('yearly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, userId: user.id, userEmail: user.email }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Erro ao iniciar pagamento.')
      }
    } catch (e) {
      setError('Erro de conexão. Tente novamente.')
    }
    setLoading(false)
  }

  const features = [
    { icon: '∞', label: 'Transações ilimitadas', free: `Até ${FREE_TX_LIMIT}` },
    { icon: '📊', label: 'Relatório mensal detalhado', free: false },
    { icon: '📥', label: 'Exportar dados (Excel/PDF)', free: false },
    { icon: '⚡', label: 'Suporte prioritário', free: false },
    { icon: '📅', label: 'Calendário financeiro', free: true },
    { icon: '🎯', label: 'Metas financeiras', free: true },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000099', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, backdropFilter: 'blur(6px)', padding: 16 }}>
      <div style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>

        {/* Header */}
        <div style={{ padding: '28px 28px 0', textAlign: 'center', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 20 }}>✕</button>
          <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 14px' }}>⚡</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.5px' }}>FinFlow Pro</h2>
          <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>Desbloqueie tudo e controle suas finanças sem limites</p>
        </div>

        {/* Planos */}
        <div style={{ padding: '22px 28px 0' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[
              { id: 'monthly', label: 'Mensal', price: 'R$9,90', sub: 'por mês', badge: null },
              { id: 'yearly',  label: 'Anual',  price: 'R$79',   sub: 'por ano', badge: '33% OFF' },
            ].map(p => (
              <button key={p.id} onClick={() => setPlan(p.id)} style={{
                flex: 1, padding: '14px 12px', borderRadius: 14, border: '2px solid',
                borderColor: plan === p.id ? '#38bdf8' : '#1e293b',
                background: plan === p.id ? '#38bdf810' : 'transparent',
                cursor: 'pointer', textAlign: 'center', position: 'relative', transition: 'all 0.15s',
              }}>
                {p.badge && (
                  <span style={{ position: 'absolute', top: -10, right: 10, background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>{p.badge}</span>
                )}
                <p style={{ margin: '0 0 4px', fontSize: 12, color: plan === p.id ? '#38bdf8' : '#64748b', fontWeight: 600 }}>{p.label}</p>
                <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 800, color: plan === p.id ? '#e2e8f0' : '#94a3b8' }}>{p.price}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>{p.sub}</p>
              </button>
            ))}
          </div>

          {/* Comparação Free vs Pro */}
          <div style={{ background: '#0d1a2e', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', padding: '10px 16px', borderBottom: '1px solid #1e293b' }}>
              <span style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>RECURSO</span>
              <span style={{ fontSize: 11, color: '#475569', fontWeight: 700, textAlign: 'center', minWidth: 56 }}>FREE</span>
              <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700, textAlign: 'center', minWidth: 56 }}>PRO</span>
            </div>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', padding: '11px 16px', borderBottom: i < features.length - 1 ? '1px solid #0f1f35' : 'none', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{f.icon}</span>
                  <span style={{ fontSize: 13, color: '#cbd5e1' }}>{f.label}</span>
                </div>
                <div style={{ textAlign: 'center', minWidth: 56 }}>
                  {f.free === true
                    ? <span style={{ color: '#22c55e', fontSize: 15 }}>✓</span>
                    : f.free === false
                    ? <span style={{ color: '#334155', fontSize: 15 }}>✕</span>
                    : <span style={{ fontSize: 11, color: '#64748b' }}>{f.free}</span>
                  }
                </div>
                <div style={{ textAlign: 'center', minWidth: 56 }}>
                  <span style={{ color: '#22c55e', fontSize: 15 }}>✓</span>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#ef4444', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button onClick={handleUpgrade} disabled={loading} style={{
            width: '100%', padding: '14px', marginBottom: 28,
            background: loading ? '#1e293b' : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontWeight: 800, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.3px',
          }}>
            {loading ? 'Aguarde...' : `Assinar ${plan === 'yearly' ? 'por R$79/ano' : 'por R$9,90/mês'} →`}
          </button>

          <p style={{ textAlign: 'center', color: '#334155', fontSize: 12, marginBottom: 20, margin: '0 0 20px' }}>
            Pagamento seguro via Stripe · Cancele quando quiser
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Componente de bloqueio inline ─────────────────────────────────────────────
function ProLock({ onUpgrade, message }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: '#38bdf815', border: '1px solid #38bdf830', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>🔒</div>
      <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Recurso Pro</p>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: '#475569', maxWidth: 260 }}>{message || 'Faça upgrade para desbloquear este recurso.'}</p>
      <button onClick={onUpgrade} style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
        Ver planos Pro →
      </button>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────
export default function Dashboard({ user }) {
  const [transactions, setTransactions] = useState([])
  const [goals, setGoals] = useState([])
  const [isPro, setIsPro] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showModal, setShowModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL)
  const [goalErrors, setGoalErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({ type: '', category: '' })
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [upgradeSuccess, setUpgradeSuccess] = useState(false)

  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    // Verifica se voltou do Stripe com sucesso
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgrade') === 'success') {
      setUpgradeSuccess(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    const { data, error } = await supabase
      .from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false })
    if (!error) setTransactions(data || [])
  }, [user.id])

  const fetchGoals = useCallback(async () => {
    const { data, error } = await supabase
      .from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
    if (!error) setGoals(data || [])
  }, [user.id])

  const fetchProfile = useCallback(async () => {
    const { data } = await supabase
      .from('profiles').select('is_pro').eq('id', user.id).single()
    setIsPro(data?.is_pro || false)
  }, [user.id])

  useEffect(() => {
    Promise.all([fetchTransactions(), fetchGoals(), fetchProfile()]).finally(() => setLoading(false))
  }, [fetchTransactions, fetchGoals, fetchProfile])

  // ── Limites free ───────────────────────────────────────────────────────────
  const atLimit = !isPro && transactions.length >= FREE_TX_LIMIT
  const txUsagePercent = Math.min(100, (transactions.length / FREE_TX_LIMIT) * 100)

  // ── Validações ─────────────────────────────────────────────────────────────
  const validateTransaction = () => {
    const errors = {}
    if (!form.desc.trim()) errors.desc = 'Informe uma descrição'
    if (!form.value || isNaN(parseFloat(form.value)) || parseFloat(form.value) <= 0) errors.value = 'Informe um valor válido'
    if (!form.date) errors.date = 'Selecione a data'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateGoal = () => {
    const errors = {}
    if (!goalForm.name.trim()) errors.name = 'Informe o nome da meta'
    if (!goalForm.target || isNaN(parseFloat(goalForm.target)) || parseFloat(goalForm.target) <= 0) errors.target = 'Informe um valor alvo válido'
    setGoalErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── Add transaction (com bloqueio) ─────────────────────────────────────────
  const handleAddTransaction = async () => {
    if (atLimit) { setShowModal(false); setShowUpgrade(true); return }
    if (!validateTransaction()) return
    setSaving(true)
    const { error } = await supabase.from('transactions').insert([{
      user_id: user.id, description: form.desc, category: form.category,
      value: parseFloat(form.value), type: form.type, date: form.date,
    }])
    if (!error) { await fetchTransactions(); setForm(EMPTY_FORM); setFormErrors({}); setShowModal(false) }
    setSaving(false)
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  const startEdit = (t) => { setEditingId(t.id); setEditValues({ type: t.type, category: t.category }) }
  const handleSaveEdit = async () => {
    const { error } = await supabase.from('transactions').update({ type: editValues.type, category: editValues.category }).eq('id', editingId)
    if (!error) setTransactions(prev => prev.map(t => t.id === editingId ? { ...t, ...editValues } : t))
    setEditingId(null)
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  // ── Goals ──────────────────────────────────────────────────────────────────
  const handleAddGoal = async () => {
    if (!validateGoal()) return
    setSaving(true)
    const { error } = await supabase.from('goals').insert([{
      user_id: user.id, name: goalForm.name,
      target: parseFloat(goalForm.target), current: parseFloat(goalForm.current || 0),
    }])
    if (!error) { await fetchGoals(); setGoalForm(EMPTY_GOAL); setGoalErrors({}); setShowGoalModal(false) }
    setSaving(false)
  }
  const handleDeleteGoal = async (id) => {
    await supabase.from('goals').delete().eq('id', id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  // ── Exportar CSV (Pro) ─────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!isPro) { setShowUpgrade(true); return }
    const header = 'Data,Descrição,Categoria,Tipo,Valor\n'
    const rows = transactions.map(t =>
      `${t.date},"${t.description}",${t.category},${t.type === 'income' ? 'Receita' : 'Despesa'},${t.value}`
    ).join('\n')
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'finflow-transacoes.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.value), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.value), 0)
  const balance = totalIncome - totalExpense
  const savingRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0

  const expenseByCategory = transactions.filter(t => t.type === 'expense')
    .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + Number(t.value); return acc }, {})
  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }))

  const now = new Date()
  const areaData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthTx = transactions.filter(t => t.date?.startsWith(key))
    return {
      month: d.toLocaleDateString('pt-BR', { month: 'short' }),
      receitas: monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.value), 0),
      despesas: monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.value), 0),
    }
  })

  // Calendário
  const calMonthKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const calTxMap = {}
  transactions.forEach(t => {
    if (t.date?.startsWith(calMonthKey)) {
      if (!calTxMap[t.date]) calTxMap[t.date] = []
      calTxMap[t.date].push(t)
    }
  })
  const prevCalMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) } else setCalMonth(m => m - 1); setSelectedDay(null) }
  const nextCalMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) } else setCalMonth(m => m + 1); setSelectedDay(null) }
  const selectedDayTx = selectedDay ? (calTxMap[selectedDay] || []) : []

  // Transações agrupadas
  const filtered = transactions.filter(t => filterType === 'all' || t.type === filterType)
  const groupedByMonthDay = filtered.reduce((acc, t) => {
    const mk = t.date?.slice(0, 7); const dk = t.date
    if (!acc[mk]) acc[mk] = {}; if (!acc[mk][dk]) acc[mk][dk] = []
    acc[mk][dk].push(t); return acc
  }, {})
  const sortedMonths = Object.keys(groupedByMonthDay).sort((a, b) => b.localeCompare(a))

  const tabs = [
    { id: 'dashboard', label: 'Visão Geral', icon: '◈' },
    { id: 'transactions', label: 'Transações', icon: '⇄' },
    { id: 'goals', label: 'Metas', icon: '◎' },
  ]

  const ErrorMsg = ({ msg }) => msg ? <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0', fontWeight: 500 }}>⚠ {msg}</p> : null

  const TxRow = ({ t, index, total, compact }) => (
    <div style={{ borderBottom: index < total - 1 ? '1px solid #0d1a2e' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: compact ? '10px 14px' : (isMobile ? '12px 14px' : '13px 20px') }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 10, background: (t.type === 'income' ? '#22c55e' : categoryColors[t.category] || '#6b7280') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
            {t.type === 'income' ? '↑' : '↓'}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</p>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: (categoryColors[t.category] || '#6b7280') + '25', color: categoryColors[t.category] || '#6b7280', fontWeight: 600 }}>{t.category}</span>
              {!compact && <button onClick={() => editingId === t.id ? setEditingId(null) : startEdit(t)} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, border: '1px solid #1e293b', background: editingId === t.id ? '#38bdf820' : 'transparent', color: editingId === t.id ? '#38bdf8' : '#64748b', cursor: 'pointer' }}>✎ Editar</button>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: t.type === 'income' ? '#22c55e' : '#f97316', whiteSpace: 'nowrap' }}>
            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.value)}
          </span>
          <button onClick={() => handleDelete(t.id)} style={{ background: '#ef444415', border: 'none', color: '#ef4444', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>✕</button>
        </div>
      </div>
      {!compact && editingId === t.id && (
        <div style={{ margin: '0 14px 14px', background: '#0d1a2e', borderRadius: 12, padding: '14px 16px', border: '1px solid #1e293b' }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b', fontWeight: 600 }}>Alterar tipo e categoria</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {[['income', 'Receita ↑'], ['expense', 'Despesa ↓']].map(([v, l]) => (
              <button key={v} onClick={() => setEditValues(ev => ({ ...ev, type: v }))} style={{ flex: 1, padding: '8px', borderRadius: 9, border: '1px solid', borderColor: editValues.type === v ? (v === 'income' ? '#22c55e' : '#f97316') : '#1e293b', background: editValues.type === v ? (v === 'income' ? '#22c55e18' : '#f9731618') : 'transparent', color: editValues.type === v ? (v === 'income' ? '#22c55e' : '#f97316') : '#475569', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>{l}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setEditValues(ev => ({ ...ev, category: cat }))} style={{ padding: '5px 10px', borderRadius: 20, border: '1px solid', borderColor: editValues.category === cat ? (categoryColors[cat] || '#6b7280') : '#1e293b', background: editValues.category === cat ? (categoryColors[cat] || '#6b7280') + '25' : 'transparent', color: editValues.category === cat ? (categoryColors[cat] || '#6b7280') : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: editValues.category === cat ? 700 : 400 }}>{cat}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid #1e293b', borderRadius: 9, color: '#64748b', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            <button onClick={handleSaveEdit} style={{ flex: 2, padding: '8px', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', border: 'none', borderRadius: 9, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Salvar</button>
          </div>
        </div>
      )}
    </div>
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#060b14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontFamily: 'sans-serif', fontSize: 18 }}>Carregando...</div>
  )

  const sidebarWidth = 220

  return (
    <div style={{ minHeight: '100vh', background: '#060b14', color: '#e2e8f0', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", display: 'flex' }}>

      {/* ── SIDEBAR ── */}
      {!isMobile && (
        <aside style={{ width: sidebarWidth, background: '#080f1e', borderRight: '1px solid #0f1f35', display: 'flex', flexDirection: 'column', padding: '32px 0', position: 'fixed', height: '100vh', zIndex: 100 }}>
          <div style={{ padding: '0 24px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>₿</div>
              <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.5px' }}>FinFlow</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#334155', wordBreak: 'break-all' }}>{user.email}</p>
            {/* Badge Pro / Free */}
            {isPro ? (
              <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'linear-gradient(135deg, #06b6d420, #3b82f620)', border: '1px solid #38bdf840', color: '#38bdf8' }}>⚡ Pro</span>
            ) : (
              <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#1e293b', color: '#475569' }}>Free</span>
            )}
          </div>
          <nav style={{ flex: 1, padding: '0 12px' }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, border: 'none', background: activeTab === tab.id ? 'linear-gradient(90deg, #0ea5e922, #3b82f611)' : 'transparent', color: activeTab === tab.id ? '#38bdf8' : '#64748b', cursor: 'pointer', fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400, marginBottom: 4, transition: 'all 0.2s', textAlign: 'left', borderLeft: activeTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent' }}>
                <span style={{ fontSize: 18 }}>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: '0 12px 16px' }}>
            {/* Barra de uso (free) */}
            {!isPro && (
              <div style={{ background: '#0d1a2e', borderRadius: 12, padding: '12px 14px', marginBottom: 10, border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Transações</span>
                  <span style={{ fontSize: 11, color: txUsagePercent >= 80 ? '#f97316' : '#64748b', fontWeight: 600 }}>{transactions.length}/{FREE_TX_LIMIT}</span>
                </div>
                <div style={{ background: '#060b14', borderRadius: 99, height: 5 }}>
                  <div style={{ height: 5, borderRadius: 99, background: txUsagePercent >= 80 ? '#f97316' : '#38bdf8', width: `${txUsagePercent}%`, transition: 'width 0.5s' }} />
                </div>
                {txUsagePercent >= 80 && <p style={{ margin: '6px 0 0', fontSize: 10, color: '#f97316' }}>Quase no limite!</p>}
              </div>
            )}
            {!isPro && (
              <button onClick={() => setShowUpgrade(true)} style={{ width: '100%', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 8 }}>⚡ Upgrade Pro</button>
            )}
            <button onClick={() => { setActiveTab('transactions'); setShowModal(true) }} style={{ width: '100%', background: isPro ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : '#0d1a2e', color: '#fff', border: isPro ? 'none' : '1px solid #1e293b', borderRadius: 10, padding: '11px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>+ Nova Transação</button>
            <button onClick={() => supabase.auth.signOut()} style={{ width: '100%', background: 'transparent', color: '#475569', border: '1px solid #0f1f35', borderRadius: 10, padding: '9px 0', fontSize: 13, cursor: 'pointer' }}>Sair</button>
          </div>
        </aside>
      )}

      {/* ── BOTTOM NAV (mobile) ── */}
      {isMobile && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: '#080f1e', borderTop: '1px solid #0f1f35', display: 'flex', alignItems: 'center', height: 64, paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, border: 'none', background: 'transparent', color: activeTab === tab.id ? '#38bdf8' : '#475569', cursor: 'pointer', fontSize: 9, fontWeight: activeTab === tab.id ? 700 : 400, padding: '8px 0' }}>
              <span style={{ fontSize: 18 }}>{tab.icon}</span>{tab.label}
            </button>
          ))}
          <button onClick={() => setShowModal(true)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, border: 'none', background: 'transparent', color: '#06b6d4', cursor: 'pointer', fontSize: 9, fontWeight: 700, padding: '8px 0' }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>Novo
          </button>
        </nav>
      )}

      {/* ── MAIN ── */}
      <main style={{ marginLeft: isMobile ? 0 : sidebarWidth, flex: 1, padding: isMobile ? '20px 16px 80px' : '36px 36px 36px 40px' }}>

        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>₿</div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>FinFlow</span>
              {isPro && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#38bdf815', border: '1px solid #38bdf840', color: '#38bdf8' }}>⚡ Pro</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!isPro && <button onClick={() => setShowUpgrade(true)} style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, padding: '6px 10px', cursor: 'pointer' }}>⚡ Pro</button>}
              <button onClick={() => supabase.auth.signOut()} style={{ background: 'transparent', border: '1px solid #0f1f35', borderRadius: 8, color: '#475569', fontSize: 12, padding: '6px 10px', cursor: 'pointer' }}>Sair</button>
            </div>
          </div>
        )}

        {/* Banner de sucesso pós-pagamento */}
        {upgradeSuccess && (
          <div style={{ background: '#22c55e15', border: '1px solid #22c55e30', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#22c55e', fontSize: 14 }}>Bem-vindo ao FinFlow Pro!</p>
                <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>Todos os recursos foram desbloqueados.</p>
              </div>
            </div>
            <button onClick={() => setUpgradeSuccess(false)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
        )}

        {/* ════════ DASHBOARD ════════ */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>Visão Geral</h1>
              <p style={{ color: '#475569', margin: '4px 0 0', fontSize: 14 }}>{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 12 : 18, marginBottom: 24 }}>
              {[
                { label: 'Saldo Atual', value: formatCurrency(balance), color: balance >= 0 ? '#22c55e' : '#ef4444', sub: 'Disponível' },
                { label: 'Receitas', value: formatCurrency(totalIncome), color: '#38bdf8', sub: 'Total' },
                { label: 'Despesas', value: formatCurrency(totalExpense), color: '#f97316', sub: 'Total' },
                { label: 'Taxa de Poupança', value: `${savingRate}%`, color: '#a855f7', sub: 'Da renda total' },
              ].map((card, i) => (
                <div key={i} style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 14, padding: isMobile ? '14px 16px' : '20px 22px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 70, height: 70, background: card.color + '15', borderRadius: '50%' }} />
                  <p style={{ color: '#475569', fontSize: isMobile ? 11 : 12, margin: '0 0 6px', fontWeight: 500 }}>{card.label}</p>
                  <p style={{ color: card.color, fontSize: isMobile ? 16 : 22, fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.5px' }}>{card.value}</p>
                  <p style={{ color: '#334155', fontSize: 11, margin: 0 }}>{card.sub}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.7fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 16, padding: '20px 16px' }}>
                <h3 style={{ margin: '0 0 18px', fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>Receitas vs Despesas (6 meses)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={areaData}>
                    <defs>
                      <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} /><stop offset="95%" stopColor="#38bdf8" stopOpacity={0} /></linearGradient>
                      <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} /></linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#38bdf8" strokeWidth={2} fill="url(#incG)" />
                    <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#f97316" strokeWidth={2} fill="url(#expG)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 16, padding: '20px 16px' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>Despesas por Categoria</h3>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={52} dataKey="value" paddingAngle={3}>
                          {pieData.map((entry, i) => <Cell key={i} fill={categoryColors[entry.name] || '#6b7280'} />)}
                        </Pie>
                        <Tooltip formatter={v => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px' }}>
                      {pieData.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: categoryColors[item.name] || '#6b7280' }} />
                          <span style={{ fontSize: 11, color: '#64748b' }}>{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p style={{ color: '#334155', fontSize: 13, marginTop: 30, textAlign: 'center' }}>Nenhuma despesa ainda</p>}
              </div>
            </div>

            {/* Calendário */}
            <div style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 16, padding: isMobile ? '16px 12px' : '22px 24px', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <button onClick={prevCalMonth} style={{ background: '#0d1a2e', border: '1px solid #1e293b', borderRadius: 8, color: '#94a3b8', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{MONTH_NAMES[calMonth]} {calYear}</h3>
                <button onClick={nextCalMonth} style={{ background: '#0d1a2e', border: '1px solid #1e293b', borderRadius: 8, color: '#94a3b8', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 3 : 5, marginBottom: isMobile ? 3 : 5 }}>
                {WEEK_DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#334155', padding: '4px 0' }}>{d}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 3 : 5 }}>
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const dayNum = i + 1
                  const dayStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                  const dayTx = calTxMap[dayStr] || []
                  const hasIncome = dayTx.some(t => t.type === 'income')
                  const hasExpense = dayTx.some(t => t.type === 'expense')
                  const isToday = dayStr === todayStr
                  const isFuture = dayStr > todayStr
                  const isSelected = dayStr === selectedDay
                  const hasTx = dayTx.length > 0
                  const dayIncome = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.value), 0)
                  const dayExpense = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.value), 0)
                  return (
                    <div key={dayStr} onClick={() => hasTx ? setSelectedDay(isSelected ? null : dayStr) : null} style={{ minHeight: isMobile ? 48 : 72, borderRadius: 10, border: '1px solid', borderColor: isSelected ? '#38bdf8' : isToday ? '#3b82f640' : hasTx ? '#1e293b' : '#0f1f35', background: isSelected ? '#38bdf810' : isToday ? '#3b82f608' : hasTx ? '#0d1a2e' : 'transparent', padding: isMobile ? '5px 4px' : '8px 7px', cursor: hasTx ? 'pointer' : 'default', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 3, position: 'relative', opacity: isFuture && !hasTx ? 0.35 : 1 }}>
                      <span style={{ fontSize: isMobile ? 11 : 12, fontWeight: isToday ? 800 : 500, color: isToday ? '#38bdf8' : isFuture ? '#64748b' : '#94a3b8', lineHeight: 1 }}>{dayNum}</span>
                      {hasTx && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                          {hasIncome && <span style={{ fontSize: isMobile ? 9 : 10, color: '#22c55e', fontWeight: 700, lineHeight: 1.2, background: '#22c55e12', borderRadius: 4, padding: isMobile ? '1px 3px' : '2px 4px' }}>+{formatCurrencyShort(dayIncome)}</span>}
                          {hasExpense && <span style={{ fontSize: isMobile ? 9 : 10, color: isFuture ? '#f9731699' : '#f97316', fontWeight: 700, lineHeight: 1.2, background: isFuture ? '#f9731608' : '#f9731612', borderRadius: 4, padding: isMobile ? '1px 3px' : '2px 4px' }}>-{formatCurrencyShort(dayExpense)}</span>}
                        </div>
                      )}
                      {isFuture && hasTx && <div style={{ position: 'absolute', top: 5, right: 5, width: 5, height: 5, borderRadius: '50%', background: '#f97316', opacity: 0.7 }} />}
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
                {[['#22c55e', 'Receita'], ['#f97316', 'Despesa'], ['#f97316', 'Lançamento futuro', true]].map(([color, label, dot], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: dot ? 5 : 8, height: dot ? 5 : 8, borderRadius: dot ? '50%' : 2, background: color, opacity: dot ? 0.7 : 1 }} />
                    <span style={{ fontSize: 11, color: '#475569' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedDay && (
              <div style={{ background: '#080f1e', border: '1px solid #38bdf830', borderRadius: 16, padding: '18px 0', marginBottom: 24 }}>
                <div style={{ padding: '0 20px 14px', borderBottom: '1px solid #0f1f35', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e2e8f0', textTransform: 'capitalize' }}>{formatDateLabel(selectedDay)}</h3>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#475569' }}>{selectedDayTx.length} transação{selectedDayTx.length !== 1 ? 'ões' : ''}</p>
                  </div>
                  <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
                {selectedDayTx.map((t, i) => <TxRow key={t.id} t={t} index={i} total={selectedDayTx.length} compact={false} />)}
              </div>
            )}

            <div style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 16, padding: '20px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>Últimas Transações</h3>
                <button onClick={() => setActiveTab('transactions')} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: 13 }}>Ver todas →</button>
              </div>
              {transactions.slice(0, 5).map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #0d1a2e' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: (t.type === 'income' ? '#38bdf8' : categoryColors[t.category] || '#6b7280') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{t.type === 'income' ? '↑' : '↓'}</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#cbd5e1' }}>{t.description}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>{t.category} · {t.date}</p>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: t.type === 'income' ? '#22c55e' : '#f97316' }}>{t.type === 'income' ? '+' : '-'}{formatCurrency(t.value)}</span>
                </div>
              ))}
              {transactions.length === 0 && <p style={{ color: '#334155', textAlign: 'center', padding: 20 }}>Nenhuma transação ainda.</p>}
            </div>
          </div>
        )}

        {/* ════════ TRANSAÇÕES ════════ */}
        {activeTab === 'transactions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, margin: 0 }}>Transações</h1>
                <p style={{ color: '#475569', margin: '4px 0 0', fontSize: 14 }}>{transactions.length}{!isPro ? `/${FREE_TX_LIMIT}` : ''} registros</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {/* Exportar CSV (Pro) */}
                <button onClick={handleExportCSV} title={isPro ? 'Exportar CSV' : 'Recurso Pro'} style={{ background: isPro ? '#0d1a2e' : 'transparent', border: '1px solid #1e293b', borderRadius: 10, color: isPro ? '#94a3b8' : '#334155', padding: '10px 14px', cursor: 'pointer', fontSize: 13, display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 6 }}>
                  {!isPro && '🔒'} ↓ CSV
                </button>
                {!isMobile && (
                  <button onClick={() => atLimit ? setShowUpgrade(true) : setShowModal(true)} style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    + Nova Transação
                  </button>
                )}
              </div>
            </div>

            {/* Banner de limite atingido */}
            {atLimit && (
              <div style={{ background: '#f9731615', border: '1px solid #f9731630', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: '#f97316', fontSize: 14 }}>Limite de {FREE_TX_LIMIT} transações atingido</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>Faça upgrade para continuar adicionando.</p>
                </div>
                <button onClick={() => setShowUpgrade(true)} style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>⚡ Ver Pro</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[['all', 'Todas'], ['income', 'Receitas'], ['expense', 'Despesas']].map(([v, l]) => (
                <button key={v} onClick={() => setFilterType(v)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid', borderColor: filterType === v ? '#38bdf8' : '#0f1f35', background: filterType === v ? '#38bdf815' : 'transparent', color: filterType === v ? '#38bdf8' : '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>{l}</button>
              ))}
            </div>

            {sortedMonths.length === 0 && <div style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 16, padding: 40, textAlign: 'center', color: '#334155' }}>Nenhuma transação encontrada</div>}

            {sortedMonths.map(monthKey => {
              const days = groupedByMonthDay[monthKey]
              const sortedDays = Object.keys(days).sort((a, b) => b.localeCompare(a))
              const mIncome = Object.values(days).flat().filter(t => t.type === 'income').reduce((s, t) => s + Number(t.value), 0)
              const mExpense = Object.values(days).flat().filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.value), 0)
              return (
                <div key={monthKey} style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #0f1f35' }}>
                    <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#94a3b8', textTransform: 'capitalize' }}>{MONTH_NAMES[parseInt(monthKey.split('-')[1]) - 1]} {monthKey.split('-')[0]}</h2>
                    <div style={{ display: 'flex', gap: 14 }}>
                      {mIncome > 0 && <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>+{formatCurrency(mIncome)}</span>}
                      {mExpense > 0 && <span style={{ fontSize: 12, color: '#f97316', fontWeight: 600 }}>-{formatCurrency(mExpense)}</span>}
                    </div>
                  </div>
                  {sortedDays.map(dayKey => (
                    <div key={dayKey} style={{ marginBottom: 16 }}>
                      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#475569', fontWeight: 600, textTransform: 'capitalize' }}>{formatDateLabel(dayKey)}</p>
                      <div style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 14, overflow: 'hidden' }}>
                        {days[dayKey].map((t, i) => <TxRow key={t.id} t={t} index={i} total={days[dayKey].length} compact={false} />)}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* ════════ METAS ════════ */}
        {activeTab === 'goals' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, margin: 0 }}>Metas Financeiras</h1>
                <p style={{ color: '#475569', margin: '4px 0 0', fontSize: 14 }}>Acompanhe seu progresso</p>
              </div>
              <button onClick={() => setShowGoalModal(true)} style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ Nova Meta</button>
            </div>
            {goals.length === 0 && <p style={{ color: '#334155', textAlign: 'center', padding: 40 }}>Nenhuma meta criada ainda.</p>}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
              {goals.map((g, i) => {
                const color = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#38bdf8'][i % 5]
                const pct = Math.min(100, (Number(g.current) / Number(g.target)) * 100)
                return (
                  <div key={g.id} style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 16, padding: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>◎</div>
                      <button onClick={() => handleDeleteGoal(g.id)} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontSize: 16 }}>✕</button>
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>{g.name}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Atual: {formatCurrency(g.current)}</span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Meta: {formatCurrency(g.target)}</span>
                    </div>
                    <div style={{ background: '#0d1a2e', borderRadius: 99, height: 8, marginBottom: 8 }}>
                      <div style={{ height: 8, borderRadius: 99, background: `linear-gradient(90deg, ${color}, ${color}aa)`, width: `${pct}%`, transition: 'width 0.8s ease' }} />
                    </div>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color }}>{pct.toFixed(0)}%</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>Faltam {formatCurrency(g.target - g.current)}</p>
                  </div>
                )
              })}
            </div>
            {/* Bloco Pro: relatório mensal */}
            {!isPro && (
              <div style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #0f1f35', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>Relatório Mensal Detalhado</h3>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#38bdf815', border: '1px solid #38bdf830', color: '#38bdf8' }}>⚡ Pro</span>
                </div>
                <ProLock onUpgrade={() => setShowUpgrade(true)} message="Acesse relatórios detalhados por mês com gráficos e análises de gastos por categoria." />
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── MODALS ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: isMobile ? '20px 20px 0 0' : 20, padding: isMobile ? '28px 20px 36px' : 32, width: isMobile ? '100%' : 420, maxHeight: '90vh', overflowY: 'auto' }}>
            {atLimit ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Limite atingido</p>
                <p style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>Você chegou ao limite de {FREE_TX_LIMIT} transações do plano free.</p>
                <button onClick={() => { setShowModal(false); setShowUpgrade(true) }} style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>⚡ Ver planos Pro</button>
                <br /><button onClick={() => setShowModal(false)} style={{ marginTop: 12, background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              </div>
            ) : (
              <>
                <h2 style={{ margin: '0 0 22px', fontSize: 18, fontWeight: 700 }}>Nova Transação</h2>
                {[{ label: 'Descrição', key: 'desc', type: 'text', placeholder: 'Ex: Salário, Supermercado...' }, { label: 'Valor (R$)', key: 'value', type: 'number', placeholder: '0,00' }].map(f => (
                  <div key={f.key} style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 5, fontWeight: 600 }}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={{ ...inp, borderColor: formErrors[f.key] ? '#ef4444' : '#0f1f35' }} />
                    <ErrorMsg msg={formErrors[f.key]} />
                  </div>
                ))}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 5, fontWeight: 600 }}>Data</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ ...inp, borderColor: formErrors.date ? '#ef4444' : '#0f1f35', colorScheme: 'dark' }} />
                  <ErrorMsg msg={formErrors.date} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 5, fontWeight: 600 }}>Tipo</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[['income', 'Receita'], ['expense', 'Despesa']].map(([v, l]) => (
                      <button key={v} onClick={() => setForm({ ...form, type: v })} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid', borderColor: form.type === v ? (v === 'income' ? '#22c55e' : '#f97316') : '#0f1f35', background: form.type === v ? (v === 'income' ? '#22c55e15' : '#f9731615') : 'transparent', color: form.type === v ? (v === 'income' ? '#22c55e' : '#f97316') : '#475569', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{l}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 5, fontWeight: 600 }}>Categoria</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inp}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => { setShowModal(false); setFormErrors({}) }} style={{ flex: 1, padding: '12px', background: '#0d1a2e', border: 'none', borderRadius: 10, color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Cancelar</button>
                  <button onClick={handleAddTransaction} disabled={saving} style={{ flex: 1, padding: '12px', background: saving ? '#1e293b' : 'linear-gradient(135deg, #06b6d4, #3b82f6)', border: 'none', borderRadius: 10, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}>{saving ? 'Salvando...' : 'Adicionar'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showGoalModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: isMobile ? '20px 20px 0 0' : 20, padding: isMobile ? '28px 20px 36px' : 32, width: isMobile ? '100%' : 400 }}>
            <h2 style={{ margin: '0 0 22px', fontSize: 18, fontWeight: 700 }}>Nova Meta</h2>
            {[{ label: 'Nome da Meta', key: 'name', type: 'text', placeholder: 'Ex: Reserva de emergência' }, { label: 'Valor Alvo (R$)', key: 'target', type: 'number', placeholder: '10000' }, { label: 'Valor Atual (R$)', key: 'current', type: 'number', placeholder: '0' }].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 5, fontWeight: 600 }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={goalForm[f.key]} onChange={e => setGoalForm({ ...goalForm, [f.key]: e.target.value })} style={{ ...inp, borderColor: goalErrors[f.key] ? '#ef4444' : '#0f1f35' }} />
                <ErrorMsg msg={goalErrors[f.key]} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={() => { setShowGoalModal(false); setGoalErrors({}) }} style={{ flex: 1, padding: '12px', background: '#0d1a2e', border: 'none', borderRadius: 10, color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Cancelar</button>
              <button onClick={handleAddGoal} disabled={saving} style={{ flex: 1, padding: '12px', background: saving ? '#1e293b' : 'linear-gradient(135deg, #06b6d4, #3b82f6)', border: 'none', borderRadius: 10, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}>{saving ? 'Salvando...' : 'Criar Meta'}</button>
            </div>
          </div>
        </div>
      )}

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} user={user} />}
    </div>
  )
}
