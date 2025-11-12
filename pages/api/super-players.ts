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
    // Verifica se já existe um record para este usuário
    const existingRecord = await collection.findOne({ username });
    
    if (existingRecord) {
      // Atualiza se o novo record for maior
      if (totalPlays > existingRecord.totalPlays) {
        await collection.updateOne(
          { username },
          { $set: { totalPlays, timestamp: new Date() } }
        );
      }
    } else {
      // Cria novo record
      await collection.insertOne({ 
        username, 
        totalPlays, 
        timestamp: new Date() 
      });
    }
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
    const records = await collection.find({})
      .sort({ totalPlays: -1, timestamp: -1 })
      .limit(5)
      .toArray();
    return { success: true, data: records };
  } catch (error: any) {
    console.error("Erro ao buscar:", error);
    return { success: false, error: error.message || 'Ocorreu um erro ao buscar.' };
  }
}


async function getGlobalRecord() {
  try {
    const db = await getDbInstance();
    const collection = db.collection('super_players');
    
    // Busca o maior recorde de todos os tempos
    const globalRecord = await collection.find({})
      .sort({ totalPlays: -1, timestamp: -1 })
      .limit(1)
      .toArray();
    
    return { 
      success: true, 
      data: globalRecord.length > 0 ? globalRecord[0] : null 
    };
  } catch (error: any) {
    console.error("Erro ao buscar recorde global:", error);
    return { success: false, error: error.message || 'Ocorreu um erro ao buscar o recorde global.' };
  }
}


async function checkIfUserIsSuperPlayer(username: string) {
  try {
    const db = await getDbInstance();
    const collection = db.collection('super_players');
    
    // Busca o recorde mais recente do usuário
    const userRecord = await collection.findOne(
      { username }, 
      { sort: { timestamp: -1 } }
    );
    
    return { 
      success: true, 
      isSuperPlayer: !!userRecord,
      userRecord 
    };
  } catch (error: any) {
    console.error("Erro ao verificar Super Player:", error);
    return { success: false, error: error.message };
  }
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      const { username, totalPlays } = req.body;
      const result = await saveRecord(username, totalPlays);
      res.status(result.success ? 200 : 500).json(result);
    } else if (req.method === 'GET') {
      // Se tiver parâmetro de usuário, verifica se é Super Player
      const { username, global } = req.query;

      // Nova rota para buscar o recorde global
      if (global === 'true') {
        const result = await getGlobalRecord();
        res.status(result.success ? 200 : 500).json(result);
      }
      // Rota existente para verificar usuário específico
      else if (username && typeof username === 'string') {
        const result = await checkIfUserIsSuperPlayer(username);
        res.status(result.success ? 200 : 500).json(result);
      } else {
        // Rota existente para buscar todos os records (top 5)
        const result = await getRecords();
        res.status(result.success ? 200 : 500).json(result);
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    console.error("Erro geral na handler:", error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor.' });
  }
}