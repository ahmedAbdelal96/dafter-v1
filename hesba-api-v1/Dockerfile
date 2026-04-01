# ──────────────────────────────────────────
# Stage 1: Build
# ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npx prisma generate
RUN npm run build

# ──────────────────────────────────────────
# Stage 2: Production
# ──────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy built output + Prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Create directories for uploads and logs
RUN mkdir -p uploads logs

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 7000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
