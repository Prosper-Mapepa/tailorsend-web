FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY scripts ./scripts
COPY src ./src
COPY tsconfig.json ./

RUN npm run generate

ENV NODE_ENV=production

EXPOSE 4000

CMD ["npm", "start"]
