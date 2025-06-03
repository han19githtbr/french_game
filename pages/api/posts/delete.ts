import { getDb } from '../../../lib/mongodb';
import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const db = await getDb();
    const { id } = req.query;

    const result = await db.collection('posts').deleteOne({ _id: new ObjectId(id as string) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Publicação não encontrada' });
    }

    res.status(200).json({ message: 'Publicação excluída com sucesso' });
  } catch (error) {
    
    if (error instanceof Error) {
        res.status(500).json({ 
            message: 'Erro ao excluir publicação', 
            error: error.message 
        });
        } else {
        res.status(500).json({ 
            message: 'Erro ao excluir publicação', 
            error: String(error) 
        });
    }

  }
}