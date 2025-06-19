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
    const { id } = req.query;
    const postId = id as string;

    // Verificar se já houve uma visualização recente deste post
    const now = Date.now();
    const lastViewTime = viewCache.get(postId) || 0;

    // Se a última visualização foi há menos de 5 segundos, ignorar
    if (now - lastViewTime < 5000) {
      const currentPost = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
      return res.status(200).json(currentPost);
    }

    // Atualizar o cache com o tempo atual
    viewCache.set(postId, now);

    const result = await db.collection('posts').findOneAndUpdate(
      { _id: new ObjectId(postId) },
      { $inc: { views: 1 } },
      { returnDocument: 'after' } // Retorna o documento atualizado
    );

    if (!result || !result.value) {
      return res.status(404).json({ message: 'Publicação não encontrada' });
    }

    res.status(200).json(result.value);
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

    /*const result = await db.collection('posts').updateOne(
      { _id: new ObjectId(id as string) },
      { $inc: { views: 1 } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Publicação não encontrada' });
    }*/

    /*const updatedPost = await db.collection('posts').findOne({ _id: new ObjectId(id as string) });

    res.status(200).json(updatedPost);
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

  }*/
}