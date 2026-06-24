# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js 14 app using `output: 'standalone'`.
# The runtime image ships only the traced standalone server + static assets.

FROM node:20-bookworm-slim AS base
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ---- build ----
FROM base AS build
# NEXT_PUBLIC_API_URL is read server-side only (next.config.js rewrite +
# auth.server.ts SSR fetch). The browser client uses the relative '/api/v1'
# base, which nginx routes — so this internal hostname never ships to the
# browser bundle. Defaults to the in-network backend service name.
ARG NEXT_PUBLIC_API_URL=http://backend:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Standalone output: server.js + minimal node_modules, plus static assets.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
