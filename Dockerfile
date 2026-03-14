# Use official Node.js image
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Enable corepack for modern package manager
RUN corepack enable

# Copy package and lock file
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the app source code
COPY . .

# Build Nuxt output
RUN npm run build

# --- Production Image ---
FROM node:20-slim

WORKDIR /app

# Copy built server from builder
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/server/database/migrations ./server/database/migrations

# Ensure data directory exists for SQLite
RUN mkdir -p /app/data

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Start Nuxt using the Nitro server, but first ensure DB tables exist
CMD ["sh", "-c", "node scripts/migrate.js && node .output/server/index.mjs"]
