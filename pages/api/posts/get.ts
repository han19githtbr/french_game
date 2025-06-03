import { getDb } from '../../../lib/mongodb';
import { NextApiRequest, NextApiResponse } from 'next';
import { Post } from '../../../models/Post';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  /*try {
    const db = await getDb();
    const { search, theme } = req.query;

    let query: any = {};
    
    // Filtro por tema
    if (theme) {
      query.theme = theme;
    }

    // Filtro por busca
    if (search) {
      query.$or = [
        { caption: { $regex: search, $options: 'i' } },
        { theme: { $regex: search, $options: 'i' } },
      ];
    }
    

    // Filtrar apenas posts ativos (não expirados ou permanentes)
    query.$and = [
      {
        $or: [
          { endDate: null }, // Publicações permanentes
          { endDate: { $gte: new Date() } } // Publicações não expiradas
        ]
      }
    ];

    const posts = await db
      .collection('posts')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    console.log("Posts encontrados:", JSON.stringify(posts, null, 2));

    res.status(200).json(posts);
  } catch (error) {
    console.error('Erro detalhado:', error);
    if (error instanceof Error) {
        res.status(500).json({ 
            message: 'Erro ao buscar publicações', 
            error: error.message 
        });
        } else {
        res.status(500).json({ 
            message: 'Erro ao buscar publicações', 
            error: String(error) 
        });
    }

  }*/

  try {
    const db = await getDb();
    const { search, theme } = req.query;
    console.log('Conexão com DB estabelecida');

    // Debug: Verificar data atual
    const currentDate = new Date();
    currentDate.setHours(currentDate.getHours() - 3);
    console.log('DEBUG - Data de referência:', currentDate.toISOString());
    
    let query: any = {};
    
    // Filtro por tema
    if (theme) {
      query.theme = theme;
    }

    // Filtro por busca
    if (search) {
      query.$or = [
        { caption: { $regex: search, $options: 'i' } },
        { theme: { $regex: search, $options: 'i' } },
      ];
    }

    // Filtro por data (agora comparando objetos Date)
    query.$and = [
      {
        $or: [
          { endDate: null }, // Publicações permanentes
          { endDate: { $gte: currentDate } } // Publicações não expiradas
        ]
      }
    ];

    // Debug: Mostrar query completa
    console.log('DEBUG - Query executada:', JSON.stringify(query, null, 2));

    const posts = await db
      .collection<Post>('posts')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Debug detalhado dos resultados
    console.log('DEBUG - Posts encontrados:', posts.length);
    if (posts.length > 0) {
      console.log('DEBUG - Exemplo de post:', {
        _id: posts[0]._id,
        caption: posts[0].caption,
        endDate: posts[0].endDate?.toISOString(),
        daysLeft: posts[0].endDate 
          ? Math.ceil((new Date(posts[0].endDate).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
          : 'Permanente'
      });
    }

    // Converter ObjectId para string para o frontend
    const postsWithStringIds = posts.map(post => ({
      ...post,
      _id: post._id.toString()
    }));

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(postsWithStringIds);
  } catch (error) {
    console.error('ERRO - Detalhes completos:', {
      error: error instanceof Error ? error.stack : error,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      message: 'Erro ao buscar publicações',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    });
  }   

}