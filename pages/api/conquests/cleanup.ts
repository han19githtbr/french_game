import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import * as publishModule from './publish';

const ConquestModel = publishModule.ConquestModel;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://handydev:19handyrio@clusterfrenchgame.qczmr62.mongodb.net/app_french?retryWrites=true&w=majority&appName=clusterfrenchgame';

async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  return mongoose.connect(MONGODB_URI);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      await connectDB();
      
      // Marcar conquistas expiradas como inativas
      const result = await ConquestModel.updateMany(
        {
          expiresAt: { $lt: new Date() },
          isActive: true
        },
        {
          $set: { isActive: false }
        }
      );
      
      console.log(`Conquistas desativadas: ${result.modifiedCount}`);
      res.status(200).json({ 
        message: 'Limpeza concluída', 
        deactivated: result.modifiedCount 
      });
      
    } catch (error) {
      console.error('Erro ao limpar conquistas expiradas:', error);
      res.status(500).json({ message: 'Erro ao limpar conquistas expiradas.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}