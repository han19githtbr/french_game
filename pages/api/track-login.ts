import { NextApiRequest, NextApiResponse } from 'next';
//import connectDB from '../../lib/mongodb';
import { getDb } from '../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { userId, email, loginTime } = req.body;
    const db = await getDb();
    //const db = client.db('platform');
    await db.collection('user_activity').insertOne({
      userId,
      email,
      loginTime: new Date(loginTime),
      sessionStart: new Date(),
      sessionEnd: null,
      duration: 0,
    });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao rastrear login:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}