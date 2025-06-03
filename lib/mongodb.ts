import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

/*let client;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  throw new Error('Por favor, adicione a URI do MongoDB às variáveis de ambiente.');
}

async function connectDB(): Promise<MongoClient> {
  if (!clientPromise) {
    client = new MongoClient(uri!, options);
    clientPromise = client.connect();
    console.log("Conectado ao MongoDB");
  }

  return clientPromise;
}

export default connectDB;*/

if (!uri) {
  throw new Error('Por favor, adicione a URI do MongoDB às variáveis de ambiente.');
}

// Declaração única da variável clientPromise com inicialização imediata
const clientPromise: Promise<MongoClient> = (async () => {
  try {
    const client = new MongoClient(uri, options);
    await client.connect();
    console.log("Conectado ao MongoDB com sucesso");
    return client;
  } catch (error) {
    console.error("Erro ao conectar ao MongoDB:", error);
    throw error;
  }
})();

export const getDb = async () => {
  try {
    const client = await clientPromise;
    return client.db('app_french');
  } catch (error) {
    console.error("Erro ao acessar o banco de dados:", error);
    throw error;
  }
};

export default clientPromise;