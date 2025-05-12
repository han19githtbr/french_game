import { NextApiRequest, NextApiResponse } from 'next';
//import { searchYouTubeVideos } from '../../lib/youtube';
import { searchYouTubeVideos } from '../../lib/youtube';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { theme } = req.body;

  if (!theme) {
    return res.status(400).json({ error: 'Theme is required' });
  }

  try {
    const videos = await searchYouTubeVideos(theme);
    res.status(200).json({ videos });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'An unexpected error occurred' });
  }
}