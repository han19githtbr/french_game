import { getDb } from '../../../lib/mongodb';
import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  // TIMEOUT MANUAL - Previne o timeout do Vercel
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout após 8 segundos')), 8000);
  });

  try {
    const db = await getDb();
    const { id, userId } = req.query;
    const postId = id as string;
    const user = (userId as string) || '';

    if (!user) {
      return res.status(400).json({ message: 'Usuário não informado' });
    }

    if (!ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'ID da publicação inválido' });
    }

    // Busca o post com timeout
    const post = await Promise.race([
      db.collection('posts').findOne({ _id: new ObjectId(postId) }),
      timeoutPromise
    ]) as any;

    if (!post) {
      return res.status(404).json({ message: 'Publicação não encontrada' });
    }

    // Garante que o campo viewedBy existe no banco
    if (!Array.isArray(post.viewedBy)) {
      await Promise.race([
        db.collection('posts').updateOne(
          { _id: new ObjectId(postId) },
          { $set: { viewedBy: [] } }
        ),
        timeoutPromise
      ]);
    }

    // Busca novamente (para garantir que viewedBy foi atualizado)
    const updatedPostBefore = await Promise.race([
      db.collection('posts').findOne({ _id: new ObjectId(postId) }),
      timeoutPromise
    ]) as any;

    // Se o usuário já visualizou, não incrementa
    if (updatedPostBefore?.viewedBy?.includes(user)) {
      return res.status(200).json({ message: 'Usuário já visualizou', post: updatedPostBefore });
    }

    // Incrementa views com timeout
    const result = await Promise.race([
      db.collection('posts').findOneAndUpdate(
        { _id: new ObjectId(postId) },
        { 
          $inc: { views: 1 }, 
          $addToSet: { viewedBy: user }, 
        },
        { returnDocument: 'after' }
      ),
      timeoutPromise
    ]) as any;

    if (!result || !result.value) {
      return res.status(404).json({ message: 'Publicação não encontrada' });
    }

    const updatedPost = result.value;
    
    return res.status(200).json(updatedPost);
    
  } catch (error) {
    console.error('Erro ao incrementar visualizações:', error);
    
    if (error instanceof Error && error.message.includes('Timeout')) {
      return res.status(408).json({ 
        message: 'Tempo de resposta excedido', 
        error: 'A operação demorou muito para ser concluída'
      });
    }
    
    return res.status(500).json({ 
      message: 'Erro ao incrementar visualizações', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}