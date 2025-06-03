import { NextApiRequest, NextApiResponse } from 'next';
//import connectDB from '../../lib/mongodb';
import { getDb } from '../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const db = await getDb();
    
      const collection = db.collection('accessCounts');

      // Vamos tentar encontrar um documento para o dia atual
      const today = new Date().toDateString();
      const filter = { date: today };
      const update = { $inc: { count: 1 } };
      const options = { upsert: true }; // Se não existir, cria um novo documento

      const result = await collection.updateOne(filter, update, options);
      console.log('Acesso incrementado:', result);
      res.status(200).json({ message: 'Acesso incrementado com sucesso!' });
    } catch (error) {
      console.error('Erro ao incrementar o acesso:', error);
      res.status(500).json({ error: 'Erro ao incrementar o acesso' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}