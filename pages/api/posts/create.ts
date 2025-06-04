import { getDb } from '../../../lib/mongodb';
import { NextApiRequest, NextApiResponse } from 'next';
import { Post } from '../../../models/Post';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const db = await getDb();
    const rawData = req.body;
    
    // Processamento seguro das datas
    const postData: Post = {
      ...rawData,
      // Garante que createdAt é uma Data válida
      createdAt: rawData.createdAt ? new Date(rawData.createdAt) : new Date(),
      // Converte explicitamente endDate para Date ou null
      endDate: rawData.endDate ? new Date(rawData.endDate) : null,
      // Garante que startDate é uma Data válida
      startDate: rawData.startDate ? new Date(rawData.startDate) : new Date()
    };

    // Validação adicional das datas
    if (postData.endDate && isNaN(postData.endDate.getTime())) {
      throw new Error('Formato de endDate inválido');
    }

    if (isNaN(postData.startDate.getTime())) {
      throw new Error('Formato de startDate inválido');
    }

    // Insere no banco de dados
    const result = await db.collection('posts').insertOne(postData);
    
    // Recupera o post inserido com tratamento de null
    const insertedPost = await db.collection('posts').findOne({ _id: result.insertedId });
    
    if (!insertedPost) {
      throw new Error('Post não foi encontrado após criação');
    }

    // Resposta formatada com datas serializadas
    res.status(201).json({
      ...insertedPost,
      _id: insertedPost._id.toString(),
      createdAt: insertedPost.createdAt.toISOString(),
      startDate: insertedPost.startDate.toISOString(),
      endDate: insertedPost.endDate?.toISOString() || null
    });

  } catch (error) {
    console.error('Erro detalhado:', {
      error: error instanceof Error ? error.stack : error,
      inputData: req.body
    });
    
    res.status(500).json({ 
      message: 'Erro ao criar publicação',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      // Adiciona detalhes apenas em desenvolvimento
      ...(process.env.NODE_ENV === 'development' && {
        stack: error instanceof Error ? error.stack : undefined
      })
    });
  }
}