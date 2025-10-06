import { getDb } from '../../../lib/mongodb';
import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const db = await getDb();
    const { id, action } = req.query;
    const { userId, userName, userImage } = req.body || {};

    // Verifica se o ID é válido
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID inválido' });
    }
    if (!userId || !userName) {
      return res.status(400).json({ message: 'Usuário não informado' });
    }

    // Atualiza o array likedBy
    let updateQuery: any = {};
    if (action === 'unlike') {
      updateQuery = { $pull: { likedBy: { userId } } };
    } else {
      updateQuery = { $addToSet: { likedBy: { userId, userName, userImage } } };
    }

    const result = await db.collection('posts').updateOne(
      { _id: new ObjectId(id) },
      updateQuery
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Publicação não encontrada' });
    }

    // Atualiza o campo likes para refletir o tamanho do array likedBy
    const updated = await db.collection('posts').findOne({ _id: new ObjectId(id as string) });
    const likesCount = Array.isArray(updated?.likedBy) ? updated.likedBy.length : 0;
    await db.collection('posts').updateOne(
      { _id: new ObjectId(id) },
      { $set: { likes: likesCount } }
    );
    const updatedPost = await db.collection('posts').findOne({ _id: new ObjectId(id as string) });

    res.status(200).json(updatedPost);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ 
        message: 'Erro ao curtir publicação', 
        error: error.message 
      });
    } else {
      res.status(500).json({ 
        message: 'Erro ao curtir publicação', 
        error: String(error) 
      });
    }
  }
}