# Use a imagem oficial do Node.js como base
FROM node:22-alpine AS builder

# Defina o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copie os arquivos de package.json e package-lock.json (ou yarn.lock)
COPY package*.json ./

# Instale as dependências
RUN npm install

# Copie o restante dos arquivos do projeto
COPY . .

# Faça o build da aplicação Next.js para produção
RUN npm run build

# --- Stage para a imagem de produção ---
FROM node:22-alpine AS runner

# Defina o diretório de trabalho
WORKDIR /app

# Copie apenas os arquivos necessários do stage de builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

# Instale apenas as dependências necessárias para produção
RUN npm install --omit=dev

# Exponha a porta que sua aplicação Next.js usa (geralmente 3000)
EXPOSE 3000

# Comando para iniciar a aplicação Next.js em produção
CMD ["npm", "start"]