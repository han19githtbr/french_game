import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import * as publishModule from './publish'; // Importe o arquivo publish.ts

const ConquestModel = mongoose.models.Conquest || mongoose.model('Conquest', publishModule.conquestSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://handydev:19handyrio@clusterfrenchgame.qczmr62.mongodb.net/app_french?retryWrites=true&w=majority&appName=clusterfrenchgame';

async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  return mongoose.connect(MONGODB_URI);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      await connectDB();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const conquestsToday = await ConquestModel.find({
        timestamp: {
            $gte: today,
            $lt: tomorrow,
        },
      }).sort({ timestamp: -1 });

      res.status(200).json(conquestsToday);
    } catch (error) {
      console.error('Erro ao buscar as conquistas de hoje:', error);
      res.status(500).json({ message: 'Erro ao buscar as conquistas de hoje.' });  
    }
  
  } else {
    res.setHeader('Allow', ['GET']); // Permitir somente o método GET
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}