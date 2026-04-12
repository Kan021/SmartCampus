# ─── Stage 1: Builder ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app/server

# Copy package files and install all dependencies (including devDeps for tsc)
COPY server/package*.json ./
RUN npm ci

# Copy Prisma schema and generate the client
COPY server/prisma ./prisma
RUN npx prisma generate

# Copy source and compile TypeScript
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app/server

# Copy package files and install production dependencies only
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy Prisma schema and regenerate the client against production node_modules
COPY server/prisma ./prisma
RUN npx prisma generate

# Copy compiled output from builder
COPY --from=builder /app/server/dist ./dist

# Create the notices directory that the server serves as static files
# (populated at runtime via a mounted volume or seeded separately)
RUN mkdir -p /app/notices

EXPOSE 5000

CMD ["node", "dist/index.js"]
