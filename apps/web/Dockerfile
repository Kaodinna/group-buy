# Build context must be the REPO ROOT (not apps/web) - see apps/api/Dockerfile
# for why. Build with: docker build -f apps/web/Dockerfile -t group-buy-web .
#
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so
# NEXT_PUBLIC_API_URL must be passed as a --build-arg, not a runtime env var.

FROM node:22-alpine AS base
WORKDIR /repo

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci --legacy-peer-deps

FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_OUTPUT_STANDALONE=1
RUN npm run build --workspace=web

FROM base AS runtime
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
# `output: "standalone"` (next.config.ts) traces only the modules actually
# imported at runtime into .next/standalone, so this is a self-contained
# server - no repo-root node_modules needed in this final stage.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
USER nextjs
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1
CMD ["node", "apps/web/server.js"]
