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
  duration?: string;
}


// Função auxiliar para obter a duração de um vídeo
async function getVideoDuration(videoId: string): Promise<string | undefined> {
  try {
    const response = await youtube.videos.list({
      part: ['contentDetails'],
      id: [videoId],
    });
    return response.data.items?.[0]?.contentDetails?.duration ?? undefined;
  } catch (error) {
    console.error(`Erro ao obter a duração do vídeo ${videoId}:`, error);
    return undefined; // Em caso de erro, retorne undefined
  }
}


export async function searchYouTubeVideos(theme: string): Promise<Video[]> {
  try {
    const response = await youtube.search.list({
      part: ['id,snippet'],
      q: `${theme} french`,
      type: ['video'],
      videoDuration: 'medium', // Videos up to 4 minutes
      maxResults: 30,
      regionCode: 'FR', // Prioritize French content
      relevanceLanguage: 'fr', // French language relevance
    });

    /*const videos = response.data.items?.map((item) => ({
      id: item.id?.videoId || '',
      name: item.snippet?.title || 'Untitled',
      url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
      user: { username: item.snippet?.channelTitle || 'Unknown' },
    })) || [];*/
    const videos = await Promise.all(
      response.data.items?.map(async (item) => {
        const videoId = item.id?.videoId || '';
        const duration = await getVideoDuration(videoId); // Obtenha a duração
        return {
          id: videoId,
          name: item.snippet?.title || 'Untitled',
          url: `https://www.youtube.com/watch?v=$${videoId}`,
          user: { username: item.snippet?.channelTitle || 'Unknown' },
          duration, // Inclua a duração no objeto do vídeo
        };
      }) || []
    ); 

    return videos;
  } catch (error) {
    console.error('YouTube API error:', error);
    throw new Error('Failed to fetch videos from YouTube');
  }
}