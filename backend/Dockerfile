# syntax=docker/dockerfile:1
# Multi-stage build for the NestJS API.
# - bookworm-slim (glibc) so bcrypt's prebuilt native binary resolves without a
#   compiler toolchain.
# - `build` target carries devDeps + source + scripts/, so it doubles as the
#   image used by the one-off seed service (see docker-compose.prod.yml).
# - `runtime` target ships only prod deps + compiled dist, runs as non-root.

FROM node:20-bookworm-slim AS base
WORKDIR /app

# ---- build: full deps + source, produces dist/ (and runs the seeders) ----
FROM base AS build
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build

# ---- prod-deps: production-only node_modules for the runtime image ----
FROM base AS prod-deps
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev

# ---- runtime: lean, non-root ----
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=4000
COPY package*.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:4000/api/v1/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "dist/main.js"]
