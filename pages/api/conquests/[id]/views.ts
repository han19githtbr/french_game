import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import * as publishModule from '../publish';

const ConquestModel = mongoose.models.Conquest || mongoose.model('Conquest', publishModule.conquestSchema);
const MONGODB_URI = process.env.MONGODB_URI;

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('MongoDB nao configurado.');
  }

  if (mongoose.connection.readyState >= 1) {
    return;
  }

  return mongoose.connect(MONGODB_URI);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID invalido.' });
  }

  try {
    await connectDB();
    const updatedConquest = await ConquestModel.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true },
    );

    if (!updatedConquest) {
      return res.status(404).json({ message: 'Conquista nao encontrada.' });
    }

    return res.status(200).json({
      message: 'Contagem de visualizacoes atualizada.',
      views: updatedConquest.views,
    });
  } catch (error) {
    console.error('Erro ao atualizar views:', error);
    return res.status(500).json({ message: 'Erro ao atualizar a contagem de visualizacoes.' });
  }
}
