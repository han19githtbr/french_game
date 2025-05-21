This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Authorized JavaScript origins

http://localhost:3000


## Authorized redirect URIs

http://localhost:3000/api/auth/callback/google


## Generate secure key

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

## listar as bibliotecas instaladas

ls ./node_modules/.bin/

## Esse comando remove completamente as dependências e limpa o cache do npm

rm -rf node_modules package-lock.json


## limpar o cache

npm cache clean --force


## Instalar canvas-confetti para animacoes

npm install canvas-confetti


## Para deixar que o vercel faça o deploy 

"C:\Users\w540 1\AppData\Roaming\npm\vercel" --prod

## fazer login no vercel

vercel login

## O Ably é uma plataforma de comunicação em tempo real que você está usando no seu projeto para:

✅ Casos de uso no seu projeto:

Detectar usuários online em tempo real no jogo de francês.

Enviar e receber notificações entre os usuários enquanto jogam.


## Vantagens do Ably:

1-Baixíssima latência

2-Escalável

3-Confiável (usado por empresas grandes como   
  HubSpot, Toyota etc.)

4-SDKs para vários ambientes (Node, browser, 
  mobile)


# Fazer deploy no Docker

# Construa a imagem Docker:

docker build -t seu-nome/nome-do-jogo .
docker build -t 19handocker/french_game .

# Execute o contêiner Docker:

docker run -p 3000:3000 seu-nome/nome-do-jogo
docker run -p 3000:3000 19handocker/french_game

# Envie a imagem para um registro de contêiner (opcional, mas necessário para deploy em servidores)

docker login


# Marque sua imagem com o nome do registro:

docker tag seu-nome/nome-do-jogo:latest
docker tag 19handocker/french_game:latest
docker tag 19handocker/french_game:latest 19handocker/french_game:v1.0

# Envie a imagem:

docker push seu-nome/nome-do-jogo:latest
docker push 19handocker/french_game:latest


## Adicione o arquivo vercel.yml ao Git:

git add .github/workflows/vercel.yml


## popular o banco de dados(MongoDB)

npx tsx scripts/seed-images.ts
