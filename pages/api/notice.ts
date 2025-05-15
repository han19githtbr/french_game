import type { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '../../lib/mongodb'; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await connectDB();
  const db = client.db(); // usa o banco padrão da URI
  const collection = db.collection('notices');

  if (req.method === 'POST') {
    const { title, message, expiration } = req.body;

    if (!title || !message || !expiration) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const newNotice = {
      title,
      message,
      expiration: new Date(expiration),
    };

    await collection.insertOne(newNotice);
    return res.status(201).json({ message: 'Aviso criado com sucesso.' });
  }

  if (req.method === 'GET') {
    const now = new Date();
    const notices = await collection
      .find({ expiration: { $gt: now } })
      .sort({ _id: -1 }) // ← do mais novo para o mais antigo
      .toArray();
    return res.status(200).json(notices);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
