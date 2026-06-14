import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

const COLLECTIONS: Record<string, string> = {
  images: 'images',
  frases: 'images_sentences',
  proverbs: 'images_proverbs',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = await getDb();

  // GET: lista imagens de uma coleção com filtro opcional de tema
  if (req.method === 'GET') {
    const { collection = 'images', theme, page = '1', limit = '20' } = req.query;
    const col = COLLECTIONS[collection as string];
    if (!col) return res.status(400).json({ error: 'Coleção inválida.' });

    const filter: Record<string, any> = {};
    if (theme) filter.theme = (theme as string).toLowerCase();

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      db.collection(col).find(filter).skip(skip).limit(Number(limit)).toArray(),
      db.collection(col).countDocuments(filter),
    ]);

    return res.status(200).json({ items, total, page: Number(page), limit: Number(limit) });
  }

  // DELETE: remove uma imagem pelo _id
  if (req.method === 'DELETE') {
    const { id, collection = 'images' } = req.body;
    if (!id) return res.status(400).json({ error: 'ID não fornecido.' });
    const col = COLLECTIONS[collection as string];
    if (!col) return res.status(400).json({ error: 'Coleção inválida.' });

    try {
      await db.collection(col).deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(500).json({ error: 'Erro ao remover imagem.' });
    }
  }

  // PATCH: marcar imagem como validada ou inválida
  if (req.method === 'PATCH') {
    const { id, collection = 'images', validated } = req.body;
    if (!id) return res.status(400).json({ error: 'ID não fornecido.' });
    const col = COLLECTIONS[collection as string];
    if (!col) return res.status(400).json({ error: 'Coleção inválida.' });

    try {
      await db.collection(col).updateOne(
        { _id: new ObjectId(id) },
        { $set: { validated: !!validated } }
      );
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(500).json({ error: 'Erro ao atualizar imagem.' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
