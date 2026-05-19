import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/mongodb';
import { requireApiSession } from '../../lib/api-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  const session = await requireApiSession(req, res);
  if (!session) return;

  const db = await getDb();
  const premiumRecord = await db.collection('premium_access').findOne({
    email: session.user.email,
    active: true,
  });

  return res.status(200).json({ active: Boolean(premiumRecord) });
}
