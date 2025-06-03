import { getDb } from '../../../lib/mongodb';
import { NextApiRequest, NextApiResponse } from 'next';
import { Post } from '../../../models/Post';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const db = await getDb();
    const postData: Post = req.body;

    const result = await db.collection('posts').insertOne(postData);
    const insertedPost = await db.collection('posts').findOne({ _id: result.insertedId });

    res.status(201).json(insertedPost);
  } catch (error) {
    
    if (error instanceof Error) {
        res.status(500).json({ 
            message: 'Erro ao criar publicação', 
            error: error.message 
        });
        } else {
        res.status(500).json({ 
            message: 'Erro ao criar publicação', 
            error: String(error) 
        });
    }
  }
}