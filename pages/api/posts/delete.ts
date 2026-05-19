import { getDb } from '../../../lib/mongodb';
import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { requireAdminSession } from '../../../lib/api-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Metodo nao permitido' });
  }

  try {
    const session = await requireAdminSession(req, res);
    if (!session) return;

    const { id } = req.query;
    const postId = String(id || '');

    if (!ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'ID invalido.' });
    }

    const db = await getDb();
    const result = await db.collection('posts').deleteOne({ _id: new ObjectId(postId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Publicacao nao encontrada' });
    }

    return res.status(200).json({ message: 'Publicacao excluida com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir publicacao:', error);
    return res.status(500).json({ message: 'Erro ao excluir publicacao' });
  }
}
