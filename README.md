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

## Geração automática de imagens e legendas via AI

Este projeto agora suporta geração diária de conteúdo novo em `pages/api/generate-images.ts`, `pages/api/generate-phrases.ts` e `pages/api/generate-proverbs.ts`.

Adicione a variável de ambiente `OPENAI_API_KEY` no seu `.env.local` para ativar a criação de legendas via OpenAI. Opcionalmente, defina `OPENAI_MODEL` e `AI_DAILY_GENERATION_LIMIT`:

```env
OPENAI_API_KEY=seu_token_aqui
OPENAI_MODEL=gpt-3.5-turbo
AI_DAILY_GENERATION_LIMIT=4
```

Se a AI não estiver configurada, o sistema continuará usando o conteúdo manual existente.

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

[![My Skills](https://skillicons.dev/icons?i=ts,next,mongodb,websockets)](https://skillicons.dev)

---

## Atualizações de design e produto (revisão de monetização)

Esta seção documenta as mudanças feitas em resposta à revisão de UI/monetização do app.

### 1. Sistema de tema claro/escuro

- Novo `lib/theme-context.tsx`: `ThemeProvider` + hook `useTheme()`, com persistência em `localStorage` (`french-quest-theme`) e detecção de `prefers-color-scheme` na primeira visita.
- Novo `components/ThemeToggle.tsx`: botão circular com ícone de sol/lua (segue o padrão visual do app de referência "Pattern Checker / Vision Studio").
- `pages/_document.tsx`: script inline que aplica a classe `dark` antes da hidratação, evitando flash do tema errado.
- `pages/_app.tsx`: app inteiro envolvido em `<ThemeProvider>`.
- `styles/globals.css`: novos tokens de design (`--color-bg`, `--color-surface`, `--color-surface-alt`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-success`, etc.) definidos em `:root` (claro) e sobrescritos em `.dark` (escuro). A paleta usa o roxo/índigo (`#6d5ef8`) do app de referência, no lugar do ciano usado antes.
- **Status**: migração de cores/tema **concluída** nas 7 páginas do app: `index.tsx`, `game.tsx`, `frases.tsx`, `classes.tsx`, `admin.tsx`, `results.tsx` e `sentences_results.tsx`. Todas usam agora os tokens `bg-(--color-bg)`, `bg-(--color-surface)`, `bg-(--color-surface-alt)`, `border-(--color-border)`, `text-(--color-text)`, `text-(--color-text-muted)`, `bg-(--color-accent[-soft|-strong])`, com a sintaxe curta de variável do Tailwind v4 (suporta opacidade, ex.: `bg-(--color-surface)/80`).
  - O antigo destaque ciano (bordas, textos, sombras neon, anéis de foco) foi convertido para o roxo/índigo do novo tema em todas as páginas, incluindo o roxo usado só em `admin.tsx`.
  - 9 fundos em hexadecimal "cru" (painéis, modal do Premium Pack em `game.tsx`, fundo de tela cheia em `classes.tsx` e `admin.tsx`) foram convertidos.
  - `styles/globals.css` ganhou `@custom-variant dark (&:where(.dark, .dark *));`, para que qualquer `dark:` remanescente no código (ex.: o gráfico de estatísticas em `results.tsx`/`sentences_results.tsx`, que já tinha um par claro/escuro pronto) siga o `ThemeToggle` em vez da preferência do sistema operacional.
  - `text-white` foi convertido para `text-(--color-text)` só onde o fundo por trás também virou dinâmico (cartões, modais, títulos, telas de carregamento com gradiente fixo). Onde `text-white` está sobre um fundo colorido fixo (botões azul/vermelho/verde/fúcsia/índigo), foi mantido — inclusive corrigi 3 casos em que a conversão automática por regex teria trocado errado o texto de botões sólidos ("Voltar ao jogo" em `frases.tsx`/`results.tsx`/`sentences_results.tsx`).
  - Cores "neon" (`neon-blue`, `neon-pink`) usadas de propósito no seletor de resposta do modo jogo foram mantidas como estão — são um destaque estilístico à parte, não a paleta cinza/ciano que estava sendo substituída.
- **Limitação conhecida**: a migração foi feita por substituição de classes bem direcionada (script + revisão manual dos casos ambíguos), não uma reescrita visual completa — o *layout* (posições, espaçamentos, componentes) continua o mesmo, só a paleta e a resposta a claro/escuro mudaram. Recomendo um teste visual rápido nos dois temas antes de publicar, sobretudo em modais, badges e no seletor de resposta com efeito neon.

### 2. Correções de implementação

- Removido o botão "Entrar como Administrador" como CTA de destaque na landing page pública — anunciar um "login de administrador restrito" para qualquer visitante era mais um risco/ruído do que uma funcionalidade. Virou um link discreto no rodapé; a proteção real continua sendo o middleware + checagem de `ADMIN_EMAIL` no servidor (isso não muda).
- Removida variável `titleAdmin` que nunca era usada (código morto).

### 3. Análise de monetização e funcionalidades

Ver conversa/relatório entregue junto com esta atualização para a análise completa de: pontos fracos do modelo de pagamento único atual (Stripe "Premium Pack"), sugestões de níveis de assinatura, funcionalidades a remover/simplificar, e funcionalidades a reforçar para aumentar a conversão para o plano pago.
