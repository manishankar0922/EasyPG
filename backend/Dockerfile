# ──────────────────────────────────────────────────────────
# Stage 1: Build (compile TypeScript → dist)
# ──────────────────────────────────────────────────────────
FROM node:22-slim AS builder

# Install OpenSSL for Prisma binary engine
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests first (Docker layer cache)
COPY package*.json ./
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Generate Prisma client before TypeScript build
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npm run build

# ──────────────────────────────────────────────────────────
# Stage 2: Production runtime (minimal image, no devDeps)
# ──────────────────────────────────────────────────────────
FROM node:22-slim AS runner

RUN apt-get update -y && apt-get install -y openssl dumb-init && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Copy only the production node_modules from builder
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled output and Prisma artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000

# dumb-init: proper signal handling (PID 1 issue in containers)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/index.js"]
