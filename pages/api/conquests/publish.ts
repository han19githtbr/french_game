import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';

// 1. Conectar ao MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://handydev:19handyrio@clusterfrenchgame.qczmr62.mongodb.net/app_french?retryWrites=true&w=majority&appName=clusterfrenchgame'; // Substitua pela sua URI do MongoDB

async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  return mongoose.connect(MONGODB_URI);
}

// 2. Definir o Schema da Conquista
export const conquestSchema = new mongoose.Schema({
  user: String,
  plays: Array,
  views: Number,
  timestamp: Date,
  date: String,
  // Campos adicionados para controle de expiração
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date, 
    default: function() {
      const date = new Date();
      date.setDate(date.getDate() + 7); // Expira em 7 dias
      return date;
    }
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
});

const ConquestModel = mongoose.models.Conquest || mongoose.model('Conquest', conquestSchema);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      await connectDB();
      // Criar nova conquista com os dados do corpo da requisição
      const newConquest = new ConquestModel({
        ...req.body,
        // Garantir que os campos de data sejam definidos
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias em milissegundos
        isActive: true
      });
      
      const savedConquest = await newConquest.save();
      
      res.status(201).json({ message: 'Conquista publicada com sucesso!', conquestId: savedConquest._id, expiresAt: savedConquest.expiresAt });
    } catch (error) {
      console.error('Erro ao publicar a conquista:', error);
      res.status(500).json({ message: 'Erro ao publicar a conquista.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export { ConquestModel };