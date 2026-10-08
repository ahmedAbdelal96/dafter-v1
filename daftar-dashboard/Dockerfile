# ──────────────────────────────────────────
# Stage 1: Build
# ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build args become env at build time (NEXT_PUBLIC_* must be available here)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_TOKEN_EXPIRY_DAYS
ARG NEXT_PUBLIC_REFRESH_TOKEN_EXPIRY_DAYS
ARG NEXT_PUBLIC_ENABLE_ANALYTICS
ARG NEXT_PUBLIC_ENABLE_NOTIFICATIONS
ARG NEXT_PUBLIC_ENABLE_DEVTOOLS

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_TOKEN_EXPIRY_DAYS=$NEXT_PUBLIC_TOKEN_EXPIRY_DAYS
ENV NEXT_PUBLIC_REFRESH_TOKEN_EXPIRY_DAYS=$NEXT_PUBLIC_REFRESH_TOKEN_EXPIRY_DAYS
ENV NEXT_PUBLIC_ENABLE_ANALYTICS=$NEXT_PUBLIC_ENABLE_ANALYTICS
ENV NEXT_PUBLIC_ENABLE_NOTIFICATIONS=$NEXT_PUBLIC_ENABLE_NOTIFICATIONS
ENV NEXT_PUBLIC_ENABLE_DEVTOOLS=$NEXT_PUBLIC_ENABLE_DEVTOOLS

RUN npm run build

# ──────────────────────────────────────────
# Stage 2: Production
# ──────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
