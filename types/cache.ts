// Em um arquivo separado de interfaces (ex: types/cache.ts) ou no próprio freesound.ts

interface CacheDocument {
  _id: string; // O ID será uma string, que é a sua cacheKey
  data: any; // O conteúdo JSON da resposta da API
  expiresAt: Date; // A data de expiração para o TTL Index
}