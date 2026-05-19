import { getDb } from '../../../lib/mongodb';
import { NextApiRequest, NextApiResponse } from 'next';
import { Post } from '../../../models/Post';
import { requireAdminSession } from '../../../lib/api-auth';

const ALLOWED_THEMES = ['Cultura', 'Gastronomia', 'Tecnologia', 'Ditados', 'Natureza', 'Turismo', 'Pensamentos'];
const MAX_CAPTION_LENGTH = 500;

const isValidImageUrl = (value: unknown) =>
  typeof value === 'string' && /^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\//.test(value);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Metodo nao permitido' });
  }

  try {
    const session = await requireAdminSession(req, res);
    if (!session) return;

    const db = await getDb();
    const rawData = req.body;
    const caption = String(rawData.caption || '').trim();

    if (!caption || caption.length > MAX_CAPTION_LENGTH) {
      return res.status(400).json({ message: 'Legenda invalida.' });
    }

    if (!ALLOWED_THEMES.includes(rawData.theme)) {
      return res.status(400).json({ message: 'Tema invalido.' });
    }

    if (!isValidImageUrl(rawData.imageUrl)) {
      return res.status(400).json({ message: 'URL de imagem invalida.' });
    }

    const endDate = rawData.endDate ? new Date(rawData.endDate) : null;
    if (endDate && isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Formato de endDate invalido.' });
    }

    const postData: Post = {
      caption,
      imageUrl: rawData.imageUrl,
      theme: rawData.theme,
      startDate: new Date(),
      endDate,
      likes: 0,
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('posts').insertOne(postData);
    const insertedPost = await db.collection('posts').findOne({ _id: result.insertedId });

    if (!insertedPost) {
      throw new Error('Post nao foi encontrado apos criacao');
    }

    res.status(201).json({
      ...insertedPost,
      _id: insertedPost._id.toString(),
      createdAt: insertedPost.createdAt.toISOString(),
      startDate: insertedPost.startDate.toISOString(),
      endDate: insertedPost.endDate?.toISOString() || null,
    });
  } catch (error) {
    console.error('Erro ao criar publicacao:', error);
    res.status(500).json({ message: 'Erro ao criar publicacao' });
  }
}
