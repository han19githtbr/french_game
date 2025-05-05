import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
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

export default connectDB;