import { NextApiRequest, NextApiResponse } from 'next';
//import connectDB from '../../lib/mongodb';
import { getDb } from '../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const db = await getDb();
    const activities = await db.collection('user_activity').find({}).toArray();

    // Calculate peak and off-peak hours
    const hourlyCounts = Array(24).fill(0);
    activities.forEach((activity) => {
      const hour = new Date(activity.loginTime).getHours();
      hourlyCounts[hour]++;
    });

    const peakHour = hourlyCounts.indexOf(Math.max(...hourlyCounts));
    const offPeakHour = hourlyCounts.indexOf(Math.min(...hourlyCounts));

    // Calculate total logins and average session duration
    const totalLogins = activities.length;
    const totalDuration = activities.reduce((sum, activity) => sum + (activity.duration || 0), 0);
    const avgDuration = totalLogins ? (totalDuration / totalLogins / 60).toFixed(2) : 0;

    res.status(200).json({
      activities,
      analytics: {
        totalLogins,
        avgDuration,
        peakHour: `${peakHour}:00`,
        offPeakHour: `${offPeakHour}:00`,
        hourlyCounts,
      },
    });
  } catch (error) {
    console.error('Erro ao recuperar atividades:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}