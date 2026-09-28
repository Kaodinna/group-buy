# Group Buy Platform

Group-buy marketplace MVP. Monorepo with a Next.js frontend and a NestJS API, built in phases (see project history for scope).

## Structure

```
apps/
  web/   Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
  api/   NestJS 12 (TypeScript, ESM, Mongoose/MongoDB)
```

## Prerequisites

- Node.js 22+
- A running MongoDB instance (local `mongod` or a connection string)

## Setup

```bash
npm install --legacy-peer-deps
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
```

`--legacy-peer-deps` is required — the current npm/Node combination hits an
unrelated `npm install` crash (`Cannot read properties of null (reading
'edgesOut')`) in `@npmcli/arborist` without it.

Fill in `apps/api/.env.local` with a real `MONGODB_URI` and a strong
`JWT_SECRET` before running the API.

## Development

```bash
npm run dev:api   # http://localhost:4000/api
npm run dev:web   # http://localhost:3000
```

## Build

```bash
npm run build:api
npm run build:web
```

## Docker

`apps/api/Dockerfile` and `apps/web/Dockerfile` are multi-stage builds; the
build context for both must be the **repo root** (npm workspaces needs the
root `package.json`/lockfile plus every workspace's `package.json` to
resolve dependencies), not the individual app directory.

```bash
cp .env.example .env   # fill in JWT_SECRET / JWT_REFRESH_SECRET (32+ chars each)
docker compose up --build
```

This starts MongoDB, the API (`:4000`), and the web app (`:3000`). Payment
provider and Cloudinary keys are optional for local use — leave them blank
in `.env` to run without real payments/image upload. `NEXT_PUBLIC_API_URL`
is baked into the web app at build time (it's a `NEXT_PUBLIC_*` var), so
changing it requires `docker compose build web` again, not just a restart.

These Dockerfiles and `docker-compose.yml` have been reviewed for
correctness but not build-tested against a live Docker daemon (unavailable
in the environment they were written in) — run `docker compose up --build`
once before relying on them in a real deployment.

## CI

`.github/workflows/ci.yml` runs lint, unit tests, the e2e health-check
test (against a real MongoDB service container), and a production build
for both workspaces on every push/PR to `main`.

## Conventions

- API responses always use the envelope `{ success, message, data }` on
  success or `{ success, message, code }` on error (see
  `apps/api/src/common/interceptors/response.interceptor.ts` and
  `apps/api/src/common/filters/http-exception.filter.ts`).
- The API backend uses ESM + NodeNext module resolution — relative imports
  must include the `.js` extension even in `.ts` source files.
- Frontend API calls go through `apps/web/src/lib/api-client.ts` rather than
  calling `fetch` directly.
