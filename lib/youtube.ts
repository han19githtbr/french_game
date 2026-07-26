const YOUTUBE_API_KEY = process.env.YOUTUBE_API_NEW_KEY;

async function fetchJson(url: string) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`YouTube request failed with ${response.status}`);
  }
  return response.json();
}

interface Video {
  id: string;
  name: string;
  url: string;
  user?: { username: string };
  duration?: string;
}


// Função auxiliar para obter a duração de um vídeo
async function getVideoDuration(videoId: string): Promise<string | undefined> {
  if (!YOUTUBE_API_KEY) return undefined;

  try {
    const payload = await fetchJson(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(YOUTUBE_API_KEY)}`,
    );
    return payload.items?.[0]?.contentDetails?.duration ?? undefined;
  } catch (error) {
    console.error(`Erro ao obter a duração do vídeo ${videoId}:`, error);
    return undefined;
  }
}

export async function searchYouTubeVideos(theme: string): Promise<Video[]> {
  if (!YOUTUBE_API_KEY) {
    return [];
  }

  try {
    const payload = await fetchJson(
      `https://www.googleapis.com/youtube/v3/search?part=id,snippet&q=${encodeURIComponent(`${theme} french`)}&type=video&videoDuration=medium&maxResults=30&regionCode=FR&relevanceLanguage=fr&key=${encodeURIComponent(YOUTUBE_API_KEY)}`,
    );

    const items = payload.items ?? [];
    const videos = await Promise.all(
      items.map(async (item: any) => {
        const videoId = item.id?.videoId || '';
        const duration = await getVideoDuration(videoId);
        return {
          id: videoId,
          name: item.snippet?.title || 'Untitled',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          user: { username: item.snippet?.channelTitle || 'Unknown' },
          duration,
        };
      }),
    );

    return videos;
  } catch (error) {
    console.error('YouTube API error:', error);
    throw new Error('Failed to fetch videos from YouTube');
  }
}