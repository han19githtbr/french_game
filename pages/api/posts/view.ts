import { getDb } from '../../../lib/mongodb';
import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';


const viewCache = new Map<string, number>();


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const db = await getDb();
    const { id, userId } = req.query;
    const postId = id as string;
    const user = (userId as string) || '';

    if (!user) {
      return res.status(400).json({ message: 'Usuário não informado' });
    }

    // Busca o post
    const post = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    if (!post) {
      return res.status(404).json({ message: 'Publicação não encontrada' });
    }

    
    // 🔹 Garante que o campo viewedBy existe no banco
    if (!Array.isArray(post.viewedBy)) {
      await db.collection('posts').updateOne(
        { _id: new ObjectId(postId) },
        { $set: { viewedBy: [] } }
      );
    }  


    // 🔹 Busca novamente (para garantir que viewedBy foi atualizado)
    const updatedPostBefore = await db.collection('posts').findOne({ _id: new ObjectId(postId) });


    // 🔹 Se o usuário já visualizou, não incrementa
    if (updatedPostBefore?.viewedBy?.includes(user)) {
      return res.status(200).json({ message: 'Usuário já visualizou', post: updatedPostBefore });
    }
    
    // Se o usuário já visualizou, não incrementa
    /*if (Array.isArray(post.viewedBy) && post.viewedBy.includes(user)) {
      return res.status(200).json(post);
    }*/

    // Se o usuário já visualizou, não incrementa
    /*if (post.viewedBy.includes(user)) {
      return res.status(200).json({ message: 'Usuário já visualizou', post });
    } */ 

    // Incrementa views e adiciona userId ao viewedBy
    const result = await db.collection('posts').findOneAndUpdate(
      { _id: new ObjectId(postId) },
      { 
        $inc: { views: 1 }, 
        $addToSet: { viewedBy: user }, 
      },
      { returnDocument: 'after' }
    );

    if (!result || !result.value) {
      return res.status(404).json({ message: 'Publicação não encontrada' });
    }

    const updatedPost = result?.value ?? await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    
    return res.status(200).json(updatedPost);
    
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ 
        message: 'Erro ao incrementar visualizações', 
        error: error.message 
      });
    } else {
      res.status(500).json({ 
        message: 'Erro ao incrementar visualizações', 
        error: String(error) 
      });
    }
  }
    
}