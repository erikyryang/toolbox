# syntax=docker/dockerfile:1

# A versão do Node acompanha .node-version.
ARG NODE_VERSION=26

# --- dependências ---------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# --- build -----------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis NEXT_PUBLIC_* são embutidas no bundle durante o build, então
# precisam existir aqui e não no container em execução. Vazio significa
# "sem backend": as operações locais continuam funcionando.
ARG NEXT_PUBLIC_BACKEND_URL=""
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL} \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- runtime ---------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Usuário sem privilégio, dono de nada além do próprio processo.
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

# server.js do standalone serve .next/static sozinho desde que a pasta esteja
# no lugar (ver docs de output: "standalone").
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
