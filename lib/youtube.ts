import { youtube_v3 } from '@googleapis/youtube';
import { google } from 'googleapis';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

interface Video {
  id: string;
  name: string;
  url: string;
  user?: { username: string };
}

export async function searchYouTubeVideos(theme: string): Promise<Video[]> {
  try {
    const response = await youtube.search.list({
      part: ['id,snippet'],
      q: `${theme} french`,
      type: ['video'],
      videoDuration: 'short', // Videos up to 4 minutes
      maxResults: 10,
      regionCode: 'FR', // Prioritize French content
      relevanceLanguage: 'fr', // French language relevance
    });

    const videos = response.data.items?.map((item) => ({
      id: item.id?.videoId || '',
      name: item.snippet?.title || 'Untitled',
      url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
      user: { username: item.snippet?.channelTitle || 'Unknown' },
    })) || [];

    return videos;
  } catch (error) {
    console.error('YouTube API error:', error);
    throw new Error('Failed to fetch videos from YouTube');
  }
}