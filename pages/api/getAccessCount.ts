import { NextApiRequest, NextApiResponse } from 'next';
//import connectDB from '../../lib/mongodb';
import { getDb } from '../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const db = await getDb();
      //const db = client.db(); // Acessa o banco de dados
      const collection = db.collection('accessCounts');
      const today = new Date().toDateString();
      const accessData = await collection.findOne({ date: today });

      res.status(200).json({ count: accessData?.count || 0 });
    } catch (error) {
      console.error('Erro ao buscar a contagem de acessos:', error);
      res.status(500).json({ error: 'Erro ao buscar a contagem de acessos' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}