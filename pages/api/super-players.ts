// pages/api/super-players.ts
import { NextApiRequest, NextApiResponse } from 'next';
//import connectDB from '../../lib/mongodb';
//import { MongoClient } from 'mongodb';
import { getDb } from '../../lib/mongodb';


let cachedDb: any = null; // Variável para armazenar o cliente conectado


async function getDbInstance() {
  if (cachedDb) {
    return cachedDb;
  }
  //const client = await connectDB();
  const db = await getDb();
  cachedDb = db;
  return db;
}


async function saveRecord(username: string, totalPlays: number) {
  try {
    const db = await getDbInstance();
    
    const collection = db.collection('super_players');
    await collection.insertOne({ username, totalPlays, timestamp: new Date() });
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao salvar:", error);
    return { success: false, error: error.message || 'Ocorreu um erro ao salvar.' };
  }
}


async function getRecords() {
  try {
    const db = await getDbInstance();
    
    const collection = db.collection('super_players');
    const records = await collection.find({}).sort({ totalPlays: -1, timestamp: -1 }).limit(5).toArray();
    return { success: true, data: records };
  } catch (error: any) {
    console.error("Erro ao buscar:", error);
    return { success: false, error: error.message || 'Ocorreu um erro ao buscar.' };
  }
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      const { username, totalPlays } = req.body;
      const result = await saveRecord(username, totalPlays);
      res.status(result.success ? 200 : 500).json(result);
    } else if (req.method === 'GET') {
      const result = await getRecords();
      res.status(result.success ? 200 : 500).json(result);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    console.error("Erro geral na handler:", error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor.' });
  }
}