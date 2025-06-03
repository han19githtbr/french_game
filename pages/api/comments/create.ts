import { getDb } from '../../../lib/mongodb';
import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const db = await getDb();
    const { postId, text, userId, userName, userImage } = req.body;

    const newComment = {
      _id: new ObjectId(),
      userId,
      userName,
      userImage,
      text,
      createdAt: new Date(),
    };

    const result = await db.collection('posts').updateOne(
      { _id: new ObjectId(postId) },
      { 
        $push: { 
            comments: newComment as any // Solução temporária
        } 
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Publicação não encontrada' });
    }

    const updatedPost = await db.collection('posts').findOne({ _id: new ObjectId(postId) });

    res.status(201).json(updatedPost);
  } catch (error) {
    if (error instanceof Error) {
        res.status(500).json({ 
            message: 'Erro ao adicionar comentário', 
            error: error.message 
        });
    } else {
        res.status(500).json({ 
            message: 'Erro ao adicionar comentário', 
            error: String(error) 
        });
    }
  }
}