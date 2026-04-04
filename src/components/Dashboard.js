import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

const categoryColors = {
  Moradia: '#f97316', Alimentação: '#eab308', Saúde: '#22c55e',
  Lazer: '#a855f7', Transporte: '#3b82f6', Renda: '#10b981', Outros: '#6b7280',
}

const formatCurrency = v =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

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
  width: '100%', boxSizing: 'border-box',
  background: '#060b14', border: '1px solid #0f1f35',
  borderRadius: 10, padding: '11px 14px',
  color: '#e2e8f0', fontSize: 14, outline: 'none',
}

export default function Dashboard({ user }) {
  const [transactions, setTransactions] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showModal, setShowModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [form, setForm] = useState({ desc: '', category: 'Alimentação', value: '', type: 'expense', date: '' })
  const [goalForm, setGoalForm] = useState({ name: '', target: '', current: '' })
  const [saving, setSaving] = useState(false)

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
    if (!error) setTransactions(data || [])
  }, [user.id])

  const fetchGoals = useCallback(async () => {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (!error) setGoals(data || [])
  }, [user.id])

  useEffect(() => {
    Promise.all([fetchTransactions(), fetchGoals()]).finally(() => setLoading(false))
  }, [fetchTransactions, fetchGoals])

  // ── Add transaction ──────────────────────────────────────────────────────────
  const handleAddTransaction = async () => {
    if (!form.desc || !form.value || !form.date) return
    setSaving(true)
    const { error } = await supabase.from('transactions').insert([{
      user_id: user.id,
      description: form.desc,
      category: form.category,
      value: parseFloat(form.value),
      type: form.type,
      date: form.date,
    }])
    if (!error) {
      await fetchTransactions()
      setForm({ desc: '', category: 'Alimentação', value: '', type: 'expense', date: '' })
      setShowModal(false)
    }
    setSaving(false)
  }

  // ── Delete transaction ───────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  // ── Add goal ─────────────────────────────────────────────────────────────────
  const handleAddGoal = async () => {
    if (!goalForm.name || !goalForm.target) return
    setSaving(true)
    const { error } = await supabase.from('goals').insert([{
      user_id: user.id,
      name: goalForm.name,
      target: parseFloat(goalForm.target),
      current: parseFloat(goalForm.current || 0),
    }])
    if (!error) {
      await fetchGoals()
      setGoalForm({ name: '', target: '', current: '' })
      setShowGoalModal(false)
    }
    setSaving(false)
  }

  // ── Delete goal ───────────────────────────────────────────────────────────────
  const handleDeleteGoal = async (id) => {
    await supabase.from('goals').delete().eq('id', id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  // ── Computed ─────────────────────────────────────────────────────────────────
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.value), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.value), 0)
  const balance = totalIncome - totalExpense
  const savingRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0

  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + Number(t.value); return acc }, {})
  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }))

  // Build area chart from last 6 months of real data
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

  const filtered = transactions.filter(t => filterType === 'all' || t.type === filterType)

  const tabs = [
    { id: 'dashboard', label: 'Visão Geral', icon: '◈' },
    { id: 'transactions', label: 'Transações', icon: '⇄' },
    { id: 'goals', label: 'Metas', icon: '◎' },
  ]

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#060b14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontFamily: 'sans-serif', fontSize: 18 }}>
      Carregando...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#060b14', color: '#e2e8f0', fontFamily: "'DM Sans', 'Segoe UI', sans-serif", display: 'flex' }}>

      {/* Sidebar */}
      <aside style={{ width: 220, background: '#080f1e', borderRight: '1px solid #0f1f35', display: 'flex', flexDirection: 'column', padding: '32px 0', position: 'fixed', height: '100vh', zIndex: 100 }}>
        <div style={{ padding: '0 24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>₿</div>
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.5px' }}>FinFlow</span>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: '#334155', wordBreak: 'break-all' }}>{user.email}</p>
        </div>

        <nav style={{ flex: 1, padding: '0 12px' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', borderRadius: 10, border: 'none',
              background: activeTab === tab.id ? 'linear-gradient(90deg, #0ea5e922, #3b82f611)' : 'transparent',
              color: activeTab === tab.id ? '#38bdf8' : '#64748b',
              cursor: 'pointer', fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400,
              marginBottom: 4, transition: 'all 0.2s', textAlign: 'left',
              borderLeft: activeTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
            }}>
              <span style={{ fontSize: 18 }}>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '0 12px 16px' }}>
          <button onClick={() => { setActiveTab('transactions'); setShowModal(true) }} style={{
            width: '100%', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0',
            fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 8,
          }}>+ Nova Transação</button>
          <button onClick={() => supabase.auth.signOut()} style={{
            width: '100%', background: 'transparent', color: '#475569',
            border: '1px solid #0f1f35', borderRadius: 10, padding: '9px 0',
            fontSize: 13, cursor: 'pointer',
          }}>Sair</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 220, flex: 1, padding: '36px 36px 36px 40px' }}>

        {/* ── DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>Visão Geral</h1>
              <p style={{ color: '#475569', margin: '4px 0 0', fontSize: 14 }}>
                {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 28 }}>
              {[
                { label: 'Saldo Atual', value: formatCurrency(balance), color: balance >= 0 ? '#22c55e' : '#ef4444', sub: 'Disponível' },
                { label: 'Receitas', value: formatCurrency(totalIncome), color: '#38bdf8', sub: 'Este mês' },
                { label: 'Despesas', value: formatCurrency(totalExpense), color: '#f97316', sub: 'Este mês' },
                { label: 'Taxa de Poupança', value: `${savingRate}%`, color: '#a855f7', sub: 'Da renda total' },
              ].map((card, i) => (
                <div key={i} style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 16, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: card.color + '15', borderRadius: '50%' }} />
                  <p style={{ color: '#475569', fontSize: 12, margin: '0 0 8px', fontWeight: 500 }}>{card.label}</p>
                  <p style={{ color: card.color, fontSize: 22, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>{card.value}</p>
                  <p style={{ color: '#334155', fontSize: 12, margin: 0 }}>{card.sub}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 18, marginBottom: 28 }}>
              <div style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 16, padding: '22px 20px' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: '#94a3b8' }}>Receitas vs Despesas</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={areaData}>
                    <defs>
                      <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#38bdf8" strokeWidth={2} fill="url(#incG)" />
                    <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#f97316" strokeWidth={2} fill="url(#expG)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 16, padding: '22px 20px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#94a3b8' }}>Despesas por Categoria</h3>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={130}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={58} dataKey="value" paddingAngle={3}>
                          {pieData.map((entry, i) => <Cell key={i} fill={categoryColors[entry.name] || '#6b7280'} />)}
                        </Pie>
                        <Tooltip formatter={v => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
                      {pieData.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: categoryColors[item.name] || '#6b7280' }} />
                          <span style={{ fontSize: 11, color: '#64748b' }}>{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={{ color: '#334155', fontSize: 13, marginTop: 40, textAlign: 'center' }}>Nenhuma despesa ainda</p>
                )}
              </div>
            </div>

            <div style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 16, padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#94a3b8' }}>Últimas Transações</h3>
                <button onClick={() => setActiveTab('transactions')} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: 13 }}>Ver todas →</button>
              </div>
              {transactions.slice(0, 5).map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #0d1a2e' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: (t.type === 'income' ? '#38bdf8' : categoryColors[t.category] || '#6b7280') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                      {t.type === 'income' ? '↑' : '↓'}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#cbd5e1' }}>{t.description}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>{t.category} · {t.date}</p>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 15, color: t.type === 'income' ? '#22c55e' : '#f97316' }}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.value)}
                  </span>
                </div>
              ))}
              {transactions.length === 0 && <p style={{ color: '#334155', textAlign: 'center', padding: 20 }}>Nenhuma transação ainda. Adicione a primeira!</p>}
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS ── */}
        {activeTab === 'transactions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Transações</h1>
                <p style={{ color: '#475569', margin: '4px 0 0', fontSize: 14 }}>{transactions.length} registros</p>
              </div>
              <button onClick={() => setShowModal(true)} style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                + Nova Transação
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[['all', 'Todas'], ['income', 'Receitas'], ['expense', 'Despesas']].map(([v, l]) => (
                <button key={v} onClick={() => setFilterType(v)} style={{
                  padding: '8px 18px', borderRadius: 8, border: '1px solid',
                  borderColor: filterType === v ? '#38bdf8' : '#0f1f35',
                  background: filterType === v ? '#38bdf815' : 'transparent',
                  color: filterType === v ? '#38bdf8' : '#475569',
                  cursor: 'pointer', fontSize: 13, fontWeight: 500,
                }}>{l}</button>
              ))}
            </div>

            <div style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 16, overflow: 'hidden' }}>
              {filtered.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 22px', borderBottom: i < filtered.length - 1 ? '1px solid #0d1a2e' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: (t.type === 'income' ? '#22c55e' : categoryColors[t.category] || '#6b7280') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {t.type === 'income' ? '↑' : '↓'}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{t.description}</p>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: (categoryColors[t.category] || '#6b7280') + '25', color: categoryColors[t.category] || '#6b7280', fontWeight: 600 }}>{t.category}</span>
                        <span style={{ fontSize: 12, color: '#475569' }}>{t.date}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: t.type === 'income' ? '#22c55e' : '#f97316' }}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.value)}
                    </span>
                    <button onClick={() => handleDelete(t.id)} style={{ background: '#ef444415', border: 'none', color: '#ef4444', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}>✕</button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#334155' }}>Nenhuma transação encontrada</div>}
            </div>
          </div>
        )}

        {/* ── GOALS ── */}
        {activeTab === 'goals' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Metas Financeiras</h1>
                <p style={{ color: '#475569', margin: '4px 0 0', fontSize: 14 }}>Acompanhe seu progresso</p>
              </div>
              <button onClick={() => setShowGoalModal(true)} style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                + Nova Meta
              </button>
            </div>

            {goals.length === 0 && <p style={{ color: '#334155', textAlign: 'center', padding: 40 }}>Nenhuma meta criada ainda.</p>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 28 }}>
              {goals.map((g, i) => {
                const color = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#38bdf8'][i % 5]
                const pct = Math.min(100, (Number(g.current) / Number(g.target)) * 100)
                return (
                  <div key={g.id} style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 16, padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>◎</div>
                      <button onClick={() => handleDeleteGoal(g.id)} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontSize: 16 }}>✕</button>
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>{g.name}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 13, color: '#64748b' }}>Atual: {formatCurrency(g.current)}</span>
                      <span style={{ fontSize: 13, color: '#64748b' }}>Meta: {formatCurrency(g.target)}</span>
                    </div>
                    <div style={{ background: '#0d1a2e', borderRadius: 99, height: 8, marginBottom: 10 }}>
                      <div style={{ height: 8, borderRadius: 99, background: `linear-gradient(90deg, ${color}, ${color}aa)`, width: `${pct}%`, transition: 'width 0.8s ease' }} />
                    </div>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color }}>{pct.toFixed(0)}%</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>Faltam {formatCurrency(g.target - g.current)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── TRANSACTION MODAL ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 20, padding: 32, width: 420 }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700 }}>Nova Transação</h2>
            {[
              { label: 'Descrição', key: 'desc', type: 'text', placeholder: 'Ex: Salário, Supermercado...' },
              { label: 'Valor (R$)', key: 'value', type: 'number', placeholder: '0,00' },
              { label: 'Data', key: 'date', type: 'date', placeholder: '' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={inp} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>Tipo</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[['income', 'Receita'], ['expense', 'Despesa']].map(([v, l]) => (
                  <button key={v} onClick={() => setForm({ ...form, type: v })} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid', borderColor: form.type === v ? (v === 'income' ? '#22c55e' : '#f97316') : '#0f1f35', background: form.type === v ? (v === 'income' ? '#22c55e15' : '#f9731615') : 'transparent', color: form.type === v ? (v === 'income' ? '#22c55e' : '#f97316') : '#475569', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>Categoria</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ ...inp }}>
                {['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer', 'Renda', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: '#0d1a2e', border: 'none', borderRadius: 10, color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Cancelar</button>
              <button onClick={handleAddTransaction} disabled={saving} style={{ flex: 1, padding: '12px', background: saving ? '#1e293b' : 'linear-gradient(135deg, #06b6d4, #3b82f6)', border: 'none', borderRadius: 10, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}>
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GOAL MODAL ── */}
      {showGoalModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#080f1e', border: '1px solid #0f1f35', borderRadius: 20, padding: 32, width: 400 }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700 }}>Nova Meta</h2>
            {[
              { label: 'Nome da Meta', key: 'name', placeholder: 'Ex: Reserva de emergência' },
              { label: 'Valor Alvo (R$)', key: 'target', placeholder: '10000' },
              { label: 'Valor Atual (R$)', key: 'current', placeholder: '0' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>{f.label}</label>
                <input type={f.key === 'name' ? 'text' : 'number'} placeholder={f.placeholder} value={goalForm[f.key]} onChange={e => setGoalForm({ ...goalForm, [f.key]: e.target.value })} style={inp} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={() => setShowGoalModal(false)} style={{ flex: 1, padding: '12px', background: '#0d1a2e', border: 'none', borderRadius: 10, color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Cancelar</button>
              <button onClick={handleAddGoal} disabled={saving} style={{ flex: 1, padding: '12px', background: saving ? '#1e293b' : 'linear-gradient(135deg, #06b6d4, #3b82f6)', border: 'none', borderRadius: 10, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}>
                {saving ? 'Salvando...' : 'Criar Meta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
