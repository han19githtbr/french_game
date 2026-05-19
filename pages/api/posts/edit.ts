import { getDb } from '../../../lib/mongodb';
import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { requireAdminSession } from '../../../lib/api-auth';

const MAX_CAPTION_LENGTH = 500;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Metodo nao permitido' });
  }

  try {
    const session = await requireAdminSession(req, res);
    if (!session) return;

    const { id, caption } = req.body;
    const normalizedCaption = String(caption || '').trim();

    if (!ObjectId.isValid(String(id))) {
      return res.status(400).json({ message: 'ID invalido.' });
    }

    if (!normalizedCaption || normalizedCaption.length > MAX_CAPTION_LENGTH) {
      return res.status(400).json({ message: 'Legenda invalida.' });
    }

    const db = await getDb();
    const postId = new ObjectId(id);
    const result = await db.collection('posts').updateOne(
      { _id: postId },
      { $set: { caption: normalizedCaption, updatedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Publicacao nao encontrada' });
    }

    const updatedPost = await db.collection('posts').findOne({ _id: postId });
    return res.status(200).json(updatedPost);
  } catch (error) {
    console.error('Erro ao editar publicacao:', error);
    return res.status(500).json({ message: 'Erro ao editar publicacao' });
  }
}
