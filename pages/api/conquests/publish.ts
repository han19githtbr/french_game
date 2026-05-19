import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { requireApiSession } from '../../../lib/api-auth';

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

export const conquestSchema = new mongoose.Schema({
  user: String,
  plays: Array,
  views: Number,
  timestamp: Date,
  date: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: function () {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date;
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const ConquestModel = mongoose.models.Conquest || mongoose.model('Conquest', conquestSchema);

const sanitizePlay = (play: any) => ({
  image: {
    url: typeof play?.image?.url === 'string' ? play.image.url.slice(0, 1200) : '',
    title: typeof play?.image?.title === 'string' ? play.image.title.slice(0, 160) : '',
  },
  answer: typeof play?.answer === 'string' ? play.answer.slice(0, 160) : '',
  correct: Boolean(play?.correct),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const session = await requireApiSession(req, res);
    if (!session) return;

    await connectDB();

    const plays = Array.isArray(req.body?.plays) ? req.body.plays.slice(0, 12).map(sanitizePlay) : [];
    if (plays.length === 0) {
      return res.status(400).json({ message: 'Conquista sem jogadas validas.' });
    }

    const newConquest = new ConquestModel({
      user: session.user?.name || session.user?.email || 'Aluno',
      plays,
      views: 0,
      timestamp: new Date(),
      date: typeof req.body?.date === 'string' ? req.body.date.slice(0, 20) : new Date().toISOString().slice(0, 10),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
    });

    const savedConquest = await newConquest.save();

    return res.status(201).json({
      message: 'Conquista publicada com sucesso!',
      conquestId: savedConquest._id,
      expiresAt: savedConquest.expiresAt,
    });
  } catch (error) {
    console.error('Erro ao publicar a conquista:', error);
    return res.status(500).json({ message: 'Erro ao publicar a conquista.' });
  }
}

export { ConquestModel };
