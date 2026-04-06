// api/stripe-webhook.js
// Vercel Serverless Function
// Recebe eventos do Stripe e atualiza o Supabase

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

// Cliente Supabase com service_role (acesso total, só no backend)
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // NÃO é a anon key! É a service_role key
)

// Necessário para ler o body raw do Stripe
export const config = { api: { bodyParser: false } }

const getRawBody = (req) =>
  new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => (data += chunk))
    req.on('end', () => resolve(Buffer.from(data)))
    req.on('error', reject)
  })

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end()

  const rawBody = await getRawBody(req)
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  const session = event.data.object

  // ── Pagamento confirmado → ativa Pro ──────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const userId = session.metadata?.userId
    const plan = session.metadata?.plan
    const subscriptionId = session.subscription

    if (!userId) return res.status(400).json({ error: 'userId não encontrado no metadata' })

    // Busca detalhes da assinatura para pegar a data de expiração
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

    // Ativa is_pro no perfil
    await supabase.from('profiles').upsert({ id: userId, is_pro: true })

    // Salva assinatura
    await supabase.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: session.customer,
      stripe_subscription_id: subscriptionId,
      plan,
      status: 'active',
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'stripe_subscription_id' })
  }

  // ── Assinatura cancelada ou expirada → remove Pro ─────────────────────────
  if (
    event.type === 'customer.subscription.deleted' ||
    (event.type === 'customer.subscription.updated' && session.status === 'canceled')
  ) {
    const subscriptionId = session.id

    // Busca usuário pela subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    if (sub?.user_id) {
      await supabase.from('profiles').update({ is_pro: false }).eq('id', sub.user_id)
      await supabase.from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscriptionId)
    }
  }

  // ── Renovação mensal/anual → atualiza data de expiração ───────────────────
  if (event.type === 'invoice.payment_succeeded') {
    const subscriptionId = session.subscription
    if (!subscriptionId) return res.status(200).json({ received: true })

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString()

    await supabase.from('subscriptions')
      .update({ status: 'active', current_period_end: periodEnd, updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', subscriptionId)
  }

  return res.status(200).json({ received: true })
}
