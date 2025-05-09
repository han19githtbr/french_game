import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import * as publishModule from '../publish'; // Ajuste o caminho conforme necessário

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

  if (req.method === 'POST') {
    try {
      await connectDB();
      const updatedConquest = await ConquestModel.findByIdAndUpdate(
        id,
        { $inc: { views: 1 } },
        { new: true }
      );

      if (updatedConquest) {
        res.status(200).json({ message: 'Contagem de visualizações atualizada.', views: updatedConquest.views });
      } else {
        res.status(404).json({ message: 'Conquista não encontrada.' });
      }
    } catch (error) {
      console.error('Erro ao atualizar a contagem de visualizações:', error);
      res.status(500).json({ message: 'Erro ao atualizar a contagem de visualizações.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}