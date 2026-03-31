# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10.4.1

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@10.4.1

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --no-frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/public ./client/public

ENV NODE_ENV=production

CMD ["pnpm", "start"]
Qué cambié

Cambié esta línea:

RUN pnpm install --prod --no-frozen-lockfile

por esta:

RUN pnpm install --no-frozen-lockfile
Qué haces ahora
abre Dockerfile en GitHub
reemplázalo completo por el bloque de arriba
guarda con commit
vuelve a Railway
haz redeploy
Después

Si arranca, el siguiente paso será revisar:

PORT
base de datos
dominio
variables de entorno

Si vuelve a fallar, pégame el nuevo error exacto.
