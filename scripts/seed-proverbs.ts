import 'dotenv/config';
import { getDb } from '../lib/mongodb';
import { ObjectId } from 'mongodb';


interface ImageData {
  _id?: ObjectId;
  url: string;
  title: string;
  theme: string;
  createdAt?: Date;
}

const images = {
  'grupo-1': [
    { url: '/proverbios/grupo-1/courage.jpg', title: 'Réunir as suas forças' },
    { url: '/proverbios/grupo-1/a_cheval.jpg', title: 'Levar algo muito a sério' },
    { url: '/proverbios/grupo-1/belle_jambe.jpg', title: 'Eu não me importo' },
    { url: '/proverbios/grupo-1/coup_de_barre.jpg', title: 'Estar muito cansado' },
    { url: '/proverbios/grupo-1/coup_de_main.jpg', title: 'Ajudar alguém' },
    { url: '/proverbios/grupo-1/coup_de_vieux.jpg', title: 'Envelhecer rapidamente' },
    { url: '/proverbios/grupo-1/dans_le_bain.jpg', title: 'Se acostumar com algo novo' },
    { url: '/proverbios/grupo-1/epingles.jpg', title: 'Chique, estar muito bem vestido' },
    { url: '/proverbios/grupo-1/beaux_draps.jpg', title: 'Estar em uma situação complicada' },
    { url: '/proverbios/grupo-1/gueule_de_bois.jpg', title: 'Estar de ressaca' },
        
  ],
  'grupo-2': [
    { url: '/proverbios/grupo-2/long_feu.jpg', title: 'Durar menos do que o previsto' },
    { url: '/proverbios/grupo-2/louche.jpg', title: 'Aproximadamente' },
    { url: '/proverbios/grupo-2/main_verte.jpg', title: 'Ter talento para a jardinagem' },
    { url: '/proverbios/grupo-2/midi_porte.jpg', title: 'Ver as coisas de acordo com o seu ponto de vista' },
    { url: '/proverbios/grupo-2/moutons.jpg', title: 'Voltar ao assunto principal da conversa' },
    { url: '/proverbios/grupo-2/paquerettes.jpg', title: 'Desinteressante' },
    { url: '/proverbios/grupo-2/peter_cable.jpg', title: 'Ter um surto de raiva' },
    { url: '/proverbios/grupo-2/petite_cuiller.jpg', title: 'Estar muito cansado' },
    { url: '/proverbios/grupo-2/pinceaux.jpg', title: 'Se confundir' },
    { url: '/proverbios/grupo-2/pipeau.jpg', title: 'Não é verdade' },
  ],
  'grupo-3': [
    { url: '/proverbios/grupo-3/poil_main.jpg', title: 'Ser muito preguiçoso' },
    { url: '/proverbios/grupo-3/poireauter.jpg', title: 'Esperar alguém por muito tempo' },
    { url: '/proverbios/grupo-3/pompes.jpg', title: 'Estar ditraído' },
    { url: '/proverbios/grupo-3/poules_dents.jpg', title: 'Jamais' },
    { url: '/proverbios/grupo-3/prunes.jpg', title: 'Sem motivo algum' },
    { url: '/proverbios/grupo-3/salades.jpg', title: 'Contar coisas que não são verdadeiras' },
    { url: '/proverbios/grupo-3/sur_le_pouce.jpg', title: 'Comer rapidamente' },
    { url: '/proverbios/grupo-3/tondu.jpg', title: 'Tem pouca gente' },
    { url: '/proverbios/grupo-3/verre_deau.jpg', title: 'Se deixar ultrapassado por uma pequena dificuldade' },
    { url: '/proverbios/grupo-3/vie_en_rose.jpg', title: 'Estar muito feliz' },
    
  ]
}

async function seedImageProverbs() {
  // 1. Conecte ao MongoDB
  const db = await getDb(); // Recebe o MongoClient
    
  // 2. Acesse a coleção
  const collection = db.collection<ImageData>('images_proverbs');

  // Remove dados antigos (opcional)
  await collection.deleteMany({});

  // Inserir dados
  const data = Object.entries(images).flatMap(([theme, items]) =>
    items.map(item => ({
      url: item.url,
      title: item.title,
      theme: theme.toLowerCase()
    }))
  );

  await collection.insertMany(data);
  console.log('✅ Banco populado com sucesso!');
  process.exit();
}

seedImageProverbs().catch(error => {
  console.error('Erro ao popular imagens:', error);
  process.exit(1);
});