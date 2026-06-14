import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();
  const records = await db.collection('admin_unlocks').find({}).toArray();
  const now = Date.now();
  const unlocks: Record<string, boolean> = {};
  const expiryDates: Record<string, number> = {};

  for (const r of records) {
    const isActive = r.expiryMs > now;
    unlocks[r.section] = isActive;
    if (isActive) expiryDates[r.section] = r.expiryMs;
  }

  return res.status(200).json({ unlocks, expiryDates });
}
