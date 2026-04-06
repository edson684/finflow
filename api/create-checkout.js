// api/create-checkout.js
// Vercel Serverless Function
// Cria uma sessão de pagamento no Stripe e retorna a URL de checkout

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_SITE_URL || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { plan, userId, userEmail } = req.body

  if (!plan || !userId || !userEmail) {
    return res.status(400).json({ error: 'Dados obrigatórios: plan, userId, userEmail' })
  }

  // Escolhe o Price ID conforme o plano
  const priceId = plan === 'yearly'
    ? process.env.STRIPE_PRICE_YEARLY   // ex: price_xxx (anual)
    : process.env.STRIPE_PRICE_MONTHLY  // ex: price_xxx (mensal)

  if (!priceId) {
    return res.status(500).json({ error: 'Price ID não configurado para este plano' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId, plan },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}?upgrade=success`,
      cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}?upgrade=canceled`,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe error:', err)
    return res.status(500).json({ error: err.message })
  }
}
