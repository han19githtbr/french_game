import { NextApiRequest, NextApiResponse } from 'next';
//import { searchYouTubeVideos } from '../../lib/youtube';
import { searchYouTubeVideos } from '../../lib/youtube';
import { Collection } from 'mongodb';
//import connectDB from '../../lib/mongodb';
import { getDb } from '../../lib/mongodb';


const CACHE_DURATION_MS = 365 * 24 * 60 * 60; 


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  /*if (req.method !== 'POST') {
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
  }*/


  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }


  const { theme } = req.body;
  if (!theme) {
    return res.status(400).json({ error: 'Theme is required' });
  }


  try {
    const db = await getDb();
    
    const collection: Collection = db.collection('cachedVideos');

    const cached = await collection.findOne({ theme });

    const now = Date.now();

    if(cached && now - new Date(cached.updatedAt).getTime() < CACHE_DURATION_MS) {
      return res.status(200).json({ videos: cached.videos });
    }

    const videos = await searchYouTubeVideos(theme);

    if (cached) {
      await collection.updateOne(
        { theme },
        { $set: { videos, updatedAt: new Date() } }
      );
    } else {
      await collection.insertOne({
        theme,
        videos,
        updatedAt: new Date(),
      });
    }

    return res.status(200).json({ videos });

  } catch (error) {
    console.error('API YouTube Cache Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
}