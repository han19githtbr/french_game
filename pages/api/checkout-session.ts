import type { NextApiRequest, NextApiResponse } from 'next';

const STRIPE_API_VERSION = '2025-04-30.basil';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const sessionId = String(req.query.session_id || '');

  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'Stripe não configurado no servidor.' });
  }

  if (!sessionId || !sessionId.startsWith('cs_')) {
    return res.status(400).json({ error: 'Sessão de pagamento inválida.' });
  }

  const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Stripe-Version': STRIPE_API_VERSION,
    },
  });

  const data = await stripeResponse.json();

  if (!stripeResponse.ok) {
    return res.status(stripeResponse.status).json({
      error: data?.error?.message || 'Não foi possível verificar o pagamento.',
    });
  }

  return res.status(200).json({
    paid: data.payment_status === 'paid',
    status: data.status,
    feature: data.metadata?.feature || null,
  });
}
