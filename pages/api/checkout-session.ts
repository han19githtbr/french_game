import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/mongodb';
import { requireApiSession } from '../../lib/api-auth';

const STRIPE_API_VERSION = '2025-04-30.basil';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const sessionId = String(req.query.session_id || '');
  const session = await requireApiSession(req, res);
  if (!session) return;

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

  const paid = data.payment_status === 'paid';
  const feature = data.metadata?.feature || null;
  const stripeEmail = data.customer_details?.email || data.customer_email || data.metadata?.user_email;

  if (paid && feature === 'premium_pack' && stripeEmail !== session.user.email) {
    return res.status(403).json({ error: 'Pagamento nao pertence ao usuario logado.' });
  }

  if (paid && feature === 'premium_pack') {
    const db = await getDb();
    await db.collection('premium_access').updateOne(
      { email: session.user.email },
      {
        $set: {
          email: session.user.email,
          stripeSessionId: sessionId,
          active: true,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  }

  return res.status(200).json({
    paid,
    status: data.status,
    feature,
  });
}
