import type { NextApiRequest, NextApiResponse } from 'next';
//import connectDB from '../../lib/mongodb';
import { getDb } from '../../lib/mongodb';
import { Collection } from 'mongodb'; // Importe Collection do 'mongodb'

// Sua chave API do Freesound DEVE vir de variáveis de ambiente.
const FREESOUND_API_KEY = process.env.FREESOUND_API_KEY;

// Tempo de vida do cache em segundos (MongoDB TTL index usa segundos)
//const CACHE_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 dias

const CACHE_DURATION_SECONDS = 365 * 24 * 60 * 60; // 1 ano
const CACHE_COLLECTION_NAME = 'freesoundCache';

// 1. Defina a Interface para o Documento de Cache
interface CacheDocument {
  _id: string; // O ID será uma string (sua cacheKey)
  data: any; // O conteúdo JSON da resposta da API do Freesound
  expiresAt: Date; // A data de expiração para o TTL Index
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { query, soundId } = req.body;

  if (!FREESOUND_API_KEY) {
    console.error('ERRO: FREESOUND_API_KEY não está definida nas variáveis de ambiente.');
    return res.status(500).json({ message: 'Erro de configuração do servidor: Chave API ausente.' });
  }

  try {
    const db = await getDb();
    
    // 2. Tipe a coleção com a interface criada
    const cacheCollection: Collection<CacheDocument> = db.collection<CacheDocument>(CACHE_COLLECTION_NAME);

    // Garante que o TTL index existe
    // Este index fará com que os documentos expirem e sejam removidos automaticamente
    // O `expireAfterSeconds` deve ser definido aqui para que o TTL index funcione
    // Se o index já existe, esta chamada não fará nada.
    await cacheCollection.createIndex(
      { "expiresAt": 1 },
      { expireAfterSeconds: 0 }
    );

    let cacheKey: string;
    let freesoundApiUrl: string;
    let requestType: 'search' | 'details';

    if (soundId) {
      cacheKey = `sound_details_${soundId}`;
      freesoundApiUrl = `https://freesound.org/apiv2/sounds/${soundId}/?token=${FREESOUND_API_KEY}`;
      requestType = 'details';
    } else if (query) {
      cacheKey = `search_query_${query}`;
      freesoundApiUrl = `https://freesound.org/apiv2/search/text/?query=${query}&fields=id,name,duration,previews,user,url&token=${FREESOUND_API_KEY}`;
      requestType = 'search';
    } else {
      return res.status(400).json({ message: 'Parâmetro inválido ou ausente. Forneça "query" ou "soundId".' });
    }

    // 3. A busca e atualização agora estão corretamente tipadas
    const cachedEntry = await cacheCollection.findOne({ _id: cacheKey }); // Este erro será resolvido

    if (cachedEntry) {
      console.log(`[Freesound API - Backend] Cache hit para ${requestType}: "${cacheKey}"`);
      return res.status(200).json(cachedEntry.data);
    }

    // Se não estiver em cache ou cache expirou (TTL já removeu), fazer a requisição à API do Freesound
    console.log(`[Freesound API - Backend] Cache miss para ${requestType}: "${cacheKey}". Buscando no Freesound.`);
    const freesoundResponse = await fetch(freesoundApiUrl);

    if (!freesoundResponse.ok) {
      const errorData = await freesoundResponse.json().catch(() => ({}));
      console.error(`Erro Freesound API (${requestType}): ${freesoundResponse.status} - ${errorData.detail || freesoundResponse.statusText}`);
      throw new Error(`Erro Freesound API: ${freesoundResponse.status} - ${errorData.detail || freesoundResponse.statusText}`);
    }

    const data = await freesoundResponse.json();

    // Calcular a data de expiração
    const expiresAt = new Date(Date.now() + CACHE_DURATION_SECONDS * 1000);

    // Armazenar no Cache do MongoDB antes de enviar a resposta
    await cacheCollection.updateOne(
      { _id: cacheKey },
      { $set: { data, expiresAt } },
      { upsert: true }
    );
    console.log(`[Freesound API - Backend] Resultados para ${requestType}: "${cacheKey}" armazenados em cache.`);

    return res.status(200).json(data);

  } catch (error) {
    console.error("Erro no backend Freesound API:", error);
    return res.status(500).json({ message: 'Falha ao processar requisição Freesound.', error: (error as Error).message });
  }
}