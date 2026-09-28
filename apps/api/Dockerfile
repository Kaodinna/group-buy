# Build context must be the REPO ROOT (not apps/api) - npm workspaces needs
# the root package.json/lockfile plus every workspace's package.json to
# resolve the dependency graph, even though only the api workspace gets built.
# Build with: docker build -f apps/api/Dockerfile -t group-buy-api .

FROM node:22-alpine AS base
WORKDIR /repo

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
# --legacy-peer-deps works around an unrelated @npmcli/arborist crash on
# this dependency set (see README) - not a peer-conflict workaround.
RUN npm ci --legacy-peer-deps

FROM deps AS build
COPY . .
RUN npm run build --workspace=api

FROM base AS runtime
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY apps/api/package.json ./apps/api/package.json
USER nestjs
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1
CMD ["node", "apps/api/dist/main.js"]
