# TailorSend is a Next.js app. Nginx cannot run it — use Node.
FROM cgr.dev/chainguard/node

WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node prisma ./prisma
RUN npm ci

COPY --chown=node:node . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
