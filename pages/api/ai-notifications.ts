import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/mongodb';
import { getServerSession } from 'next-auth/next';
import authOptions from './auth/[...nextauth]';

/**
 * GET /api/ai-notifications
 * Returns unread in-app notifications generated when new AI images are ready.
 * The frontend should poll this endpoint (or use socket) to show toasts/badges.
 *
 * POST /api/ai-notifications/mark-read
 * Marks all notifications as read (called after frontend displays them).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions as any);
  if (!session) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const db = await getDb();
  const col = db.collection('in_app_notifications');

  if (req.method === 'GET') {
    const since = req.query.since
      ? new Date(req.query.since as string)
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h by default

    const notifications = await col
      .find({ createdAt: { $gte: since }, read: false })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    return res.status(200).json({ notifications, count: notifications.length });
  }

  if (req.method === 'POST') {
    // Mark all as read
    await col.updateMany({ read: false }, { $set: { read: true } });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
