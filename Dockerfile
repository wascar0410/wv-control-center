# Build stage
FROM node:22-alpine AS builder

WORKDIR /app# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10.4.1

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --no-frozen-lockfile

COPY . .

# limpiar builds viejos
RUN rm -rf dist node_modules/.vite

RUN pnpm build

# Production stage
FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm@10.4.1

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --prod --no-frozen-lockfile

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

CMD ["pnpm", "start"]
