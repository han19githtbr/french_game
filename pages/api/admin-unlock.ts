import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/mongodb';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'milliance23@gmail.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ ok: false, error: 'Método não permitido' });
  }

  // Verificação simples de admin via header ou body
  const { section, expiryMs, action } = req.body;
  // action: 'unlock' | 'lock'

  if (!section) {
    return res.status(400).json({ ok: false, error: 'Seção não informada.' });
  }

  try {
    const db = await getDb();
    const col = db.collection('admin_unlocks');

    if (action === 'lock') {
      // Re-bloquear: remove o registro de desbloqueio
      await col.deleteOne({ section });
      return res.status(200).json({ ok: true, locked: true });
    }

    // Desbloquear: salva com expiração
    await col.updateOne(
      { section },
      { $set: { section, expiryMs: expiryMs ?? Date.now() + 24 * 60 * 60 * 1000 } },
      { upsert: true }
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('admin-unlock error:', err);
    return res.status(500).json({ ok: false, error: 'Erro interno.' });
  }
}