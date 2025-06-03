import { getDb } from '../../../lib/mongodb';
import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const db = await getDb();
    const { id } = req.query;

    const result = await db.collection('posts').updateOne(
      { _id: new ObjectId(id as string) },
      { $inc: { likes: 1 } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Publicação não encontrada' });
    }

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