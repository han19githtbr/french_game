// scripts/seed-images.ts
import 'dotenv/config';
import connectDB from '../lib/mongodb'


const images = {
  'família': [
    { url: '/ghibli/familia/família.png', title: 'Une grande famille' },
    { url: '/ghibli/familia/casa.png', title: 'Une Maison' },
    { url: '/ghibli/familia/sopa.png', title: 'La Soupe' },
    { url: '/ghibli/familia/almoço.png', title: 'Un Dîner en famille' },
    { url: '/ghibli/familia/piquenique.png', title: 'Une Pique-nique en famille' },
    { url: '/ghibli/familia/mae.png', title: 'Une femme enceinte' },
    { url: '/ghibli/familia/casal.jpg', title: 'Un couple' },
    { url: '/ghibli/familia/rir.jpg', title: 'Rire' },
    { url: '/ghibli/familia/natal.png', title: 'La Noël' },
    { url: '/ghibli/familia/plane.png', title: 'Dans l\'avion' },
    { url: '/ghibli/familia/praia.png', title: 'Une famille heureuse' },
    { url: '/ghibli/familia/teatro.png', title: 'À la salle de Théâtre' },
    { url: '/ghibli/familia/tv.png', title: 'Regarder la télévision' },
    { url: '/ghibli/familia/familia_golfinho.png', title: 'Un dauphin' },
    { url: '/ghibli/familia/familia_praia.png', title: 'Une plage' },
  ],
  'natureza': [
    { url: '/ghibli/natureza/árvore.png', title: 'Un Arbre' },
    { url: '/ghibli/natureza/floresta.png', title: 'La Forêt' },
    { url: '/ghibli/natureza/mar.png', title: 'La Mer' },
    { url: '/ghibli/natureza/deserto.png', title: 'Le Désert' },
    { url: '/ghibli/natureza/dormir.png', title: 'Regarder la pluie' },
    { url: '/ghibli/natureza/montanha.png', title: 'La Montagne' },
    { url: '/ghibli/natureza/pescar.png', title: 'Pêcher' },
    { url: '/ghibli/natureza/rio.png', title: 'La Rivière' },
    { url: '/ghibli/natureza/chuva.png', title: 'La pluie' },
    { url: '/ghibli/natureza/estrelas.png', title: 'Les étoiles' },
    { url: '/ghibli/natureza/mangas.png', title: 'Un manguier' },
    { url: '/ghibli/natureza/ceu.jpg', title: 'Le ciel est bleu' },
    { url: '/ghibli/natureza/flores.jpg', title: 'Des fleurs' },
    { url: '/ghibli/natureza/fotografo.jpg', title: 'Un photographe' },
    { url: '/ghibli/natureza/guarda-chuva.jpg', title: 'Ouvrir son parapluie' },
    { url: '/ghibli/natureza/guitarra.jpg', title: 'La musique et la nature' },
    { url: '/ghibli/natureza/mergulho.jpg', title: 'Sous l\'eau' },
    { url: '/ghibli/natureza/noite.jpg', title: 'Une nuit étoilée' },
    { url: '/ghibli/natureza/praia.jpg', title: 'À la plage' },
    { url: '/ghibli/natureza/lua.png', title: 'La lune' },
    { url: '/ghibli/natureza/furacao.png', title: 'Un cyclone' },
    { url: '/ghibli/natureza/vulcao.png', title: 'Le volcan' },
        
  ],
  'turismo': [
    { url: '/ghibli/turismo/aeroporto.png', title: 'L\'Aéroport' },
    { url: '/ghibli/turismo/por do sol.png', title: 'Le Coucher du soleil' },
    { url: '/ghibli/turismo/aviao.png', title: 'Un Avion' },
    { url: '/ghibli/turismo/helicoptero.png', title: 'L\'Hélicoptère' },
    { url: '/ghibli/turismo/navio.png', title: 'Un Navire' },
    { url: '/ghibli/turismo/ponte.png', title: 'Un Pont' },
    { url: '/ghibli/turismo/cristo.png', title: 'Statue du Christ Rédempteur' },
    { url: '/ghibli/turismo/bandeira_haitiana.png', title: 'Le drapeau haïtien' },
    { url: '/ghibli/turismo/estatua_liberdade.png', title: 'Statue de la liberté' },
    { url: '/ghibli/turismo/torre_eiffel.png', title: 'La Tour Eiffel' },
    { url: '/ghibli/turismo/fogos.jpg', title: 'Des feux d\'artifice' },
  ],
  'animais': [
    { url: '/ghibli/animais/cachorro.png', title: 'Le Chien' },
    { url: '/ghibli/animais/gato.png', title: 'Le Chat' },
    { url: '/ghibli/animais/elefante.png', title: 'L\'Éléphant' },
    { url: '/ghibli/animais/peixe.png', title: 'Le Poisson' },
    { url: '/ghibli/animais/cobra.png', title: 'Le Serpent' },
    { url: '/ghibli/animais/urso.png', title: 'L\'Ours' },
    { url: '/ghibli/animais/leao.png', title: 'Le Lion' },
    { url: '/ghibli/animais/cavalo.png', title: 'Le Cheval' },
    { url: '/ghibli/animais/papagaio.png', title: 'Le Perroquet' },
    { url: '/ghibli/animais/passaro.png', title: 'L\'Oiseau' },
    { url: '/ghibli/animais/tubarao.png', title: 'Le Requin' },
    { url: '/ghibli/animais/crocodilo.png', title: 'Le Crocodile' },
    { url: '/ghibli/animais/gorila.png', title: 'Un Gorille' },
    { url: '/ghibli/animais/ovelha.png', title: 'Le Mouton' },
    { url: '/ghibli/animais/pato.png', title: 'Le Canard' },
    { url: '/ghibli/animais/galinha.jpg', title: 'Un Coq' },
    { url: '/ghibli/animais/brincar_cachorro.jpg', title: 'Jouer avec son chien' },
    { url: '/ghibli/animais/vaca.png', title: 'Une vache' },
    { url: '/ghibli/animais/coelho.png', title: 'Un lapin' },
    { url: '/ghibli/animais/gafanhoto.png', title: 'Une sauterelle' },
    { url: '/ghibli/animais/lobo.png', title: 'Un loup' },
    { url: '/ghibli/animais/baleia.png', title: 'Une baleine' },
    { url: '/ghibli/animais/cabrito.png', title: 'Un cabrit' },
    { url: '/ghibli/animais/golfinho.png', title: 'Un dauphin' },
    { url: '/ghibli/animais/porco.png', title: 'Un porc' },
    { url: '/ghibli/animais/aguia.png', title: 'Un aigle' },
    { url: '/ghibli/animais/pintinho.png', title: 'Un poussin' },
  ],
  'tecnologia': [
    { url: '/ghibli/tecnologia/satelite.png', title: 'Une Satellite' },
    { url: '/ghibli/tecnologia/celular.png', title: 'Le Téléphone' },
    { url: '/ghibli/tecnologia/carro.png', title: 'Une Voiture' },
    { url: '/ghibli/tecnologia/cinema.png', title: 'Une Salle de cinéma' },
    { url: '/ghibli/tecnologia/elevador.png', title: 'L\'Ascenseur' },
    { url: '/ghibli/tecnologia/televisao.png', title: 'La Télévision' },
    { url: '/ghibli/tecnologia/drone.png', title: 'Un Drone' },
    { url: '/ghibli/tecnologia/foguete.png', title: 'Une Fusée' },
    { url: '/ghibli/tecnologia/moto.jpg', title: 'Une moto' },
    { url: '/ghibli/tecnologia/ventilador.png', title: 'Le ventilateur' },
    { url: '/ghibli/tecnologia/redes_sociais.png', title: 'Les réseaux sociaux' },
    { url: '/ghibli/tecnologia/trem.png', title: 'Le train' },
    { url: '/ghibli/tecnologia/computador.png', title: 'Un ordinateur' },
    { url: '/ghibli/tecnologia/radio.png', title: 'La radio' },
    { url: '/ghibli/tecnologia/laboratorio.png', title: 'Le laboratoire' },
    { url: '/ghibli/tecnologia/telescopio.png', title: 'Le télescope' },
  ],
  'gastronomia': [
    { url: '/ghibli/gastronomia/bolo.png', title: 'Un Gâteau' },
    { url: '/ghibli/gastronomia/legumes.png', title: 'Les Légumes' },
    { url: '/ghibli/gastronomia/arroz.png', title: 'Le Riz' },
    { url: '/ghibli/gastronomia/pimenta.png', title: 'Le Piment' },
    { url: '/ghibli/gastronomia/cozinheira.png', title: 'La Cuisinière' },
    { url: '/ghibli/gastronomia/frango.png', title: 'Le Poulet' },
    { url: '/ghibli/gastronomia/ovos_fritos.png', title: 'Des oeufs frits' },
    { url: '/ghibli/gastronomia/salada.png', title: 'Une Salade' },
    { url: '/ghibli/gastronomia/suco.png', title: 'Du Jus d\'orange' },
    { url: '/ghibli/gastronomia/abacate.png', title: 'L\'Avocat' },
    { url: '/ghibli/gastronomia/lasanha.png', title: 'Du Lasagne' },
    { url: '/ghibli/gastronomia/peixe_frito.png', title: 'Du poisson frit' },
    { url: '/ghibli/gastronomia/salsichas.png', title: 'Des saucisses' },
  ]
};

async function seedImages() {
  const client = await connectDB();
  const db = client.db('app_french');
  const collection = db.collection('images');

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

seedImages().catch(error => {
  console.error('Erro ao popular imagens:', error);
  process.exit(1);
});
