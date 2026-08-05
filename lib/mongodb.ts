import { MongoClient, MongoClientOptions } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options: MongoClientOptions = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    // Só lança o erro quando alguém de fato tentar usar o banco (em runtime),
    // nunca no carregamento do módulo — isso evita quebrar o build da Vercel,
    // que importa este arquivo para "coletar dados de página" de cada rota /api.
    throw new Error('Por favor, adicione a URI do MongoDB às variáveis de ambiente (MONGODB_URI).');
  }

  if (process.env.NODE_ENV === 'development') {
    // Em dev, usa uma variável global para preservar o valor entre hot-reloads.
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }

  // Em produção, cria uma única conexão por instância de função (cacheada em módulo).
  if (!clientPromise) {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export const getDb = async () => {
  try {
    const client = await getClientPromise();
    return client.db('app_french');
  } catch (error) {
    console.error('Erro ao acessar o banco de dados:', error);
    throw error;
  }
};

// Não chama getClientPromise() aqui — isso deve acontecer só quando alguém
// de fato precisar da conexão (dentro de um handler de API, em runtime).
export default getClientPromise;