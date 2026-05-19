import type { NextApiRequest, NextApiResponse } from 'next';

const STRIPE_API_VERSION = '2025-04-30.basil';
const DEFAULT_PRICE_AMOUNT = Number(process.env.STRIPE_PREMIUM_AMOUNT_CENTS || '1990');
const DEFAULT_CURRENCY = process.env.STRIPE_PREMIUM_CURRENCY || 'brl';

const getBaseUrl = (req: NextApiRequest) => {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  return `${proto}://${host}`;
};

const appendParam = (params: URLSearchParams, key: string, value?: string | number | null) => {
  if (value !== undefined && value !== null && value !== '') {
    params.append(key, String(value));
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePriceId = process.env.STRIPE_PREMIUM_PRICE_ID;

  if (!stripeSecretKey) {
    if (process.env.NODE_ENV !== 'production') {
      return res.status(200).json({ fallback: true });
    }

    return res.status(500).json({ error: 'Stripe não configurado no servidor.' });
  }

  const baseUrl = getBaseUrl(req);
  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('success_url', `${baseUrl}/game?stripe_success=true&session_id={CHECKOUT_SESSION_ID}`);
  params.append('cancel_url', `${baseUrl}/game?stripe_cancelled=true`);
  params.append('allow_promotion_codes', 'true');
  params.append('metadata[feature]', 'premium_pack');

  if (typeof req.body?.email === 'string') {
    appendParam(params, 'customer_email', req.body.email);
    appendParam(params, 'metadata[user_email]', req.body.email);
  }

  if (stripePriceId) {
    params.append('line_items[0][price]', stripePriceId);
    params.append('line_items[0][quantity]', '1');
  } else {
    params.append('line_items[0][price_data][currency]', DEFAULT_CURRENCY);
    params.append('line_items[0][price_data][unit_amount]', String(DEFAULT_PRICE_AMOUNT));
    params.append('line_items[0][price_data][product_data][name]', 'Premium Pack - Francês');
    params.append(
      'line_items[0][price_data][product_data][description]',
      '+2 tentativas por rodada, missões especiais e apoio à criação de conteúdo.',
    );
    params.append('line_items[0][quantity]', '1');
  }

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': STRIPE_API_VERSION,
    },
    body: params.toString(),
  });

  const data = await stripeResponse.json();

  if (!stripeResponse.ok) {
    return res.status(stripeResponse.status).json({
      error: data?.error?.message || 'Não foi possível criar a sessão de pagamento.',
    });
  }

  return res.status(200).json({ url: data.url });
}
