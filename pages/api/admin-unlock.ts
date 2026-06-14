import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ ok: false, error: 'Método não permitido' });
  }

  const { section, expiryMs, action } = req.body;

  if (!section) {
    return res.status(400).json({ ok: false, error: 'Seção não informada.' });
  }

  try {
    const db = await getDb();
    const col = db.collection('admin_unlocks');

    if (action === 'lock') {
      await col.deleteOne({ section });
      return res.status(200).json({ ok: true, locked: true });
    }

    // Desbloquear com expiração customizada (em ms)
    const expiry = expiryMs ?? Date.now() + 24 * 60 * 60 * 1000;
    await col.updateOne(
      { section },
      { $set: { section, expiryMs: expiry, unlockedAt: Date.now() } },
      { upsert: true }
    );

    return res.status(200).json({ ok: true, expiryMs: expiry });
  } catch (err) {
    console.error('admin-unlock error:', err);
    return res.status(500).json({ ok: false, error: 'Erro interno.' });
  }
}
