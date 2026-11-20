# Rizq Khata API — build from the repo root:
#   docker build -f apps/api/Dockerfile -t rizqkhata-api .
# Runtime env: DATABASE_URL, JWT_SECRET, CORS_ORIGINS, TRUST_PROXY=1, optional
# GOOGLE_CLIENT_IDS / UPLOADTHING_TOKEN. Committed migrations run on start.

FROM node:24-bookworm-slim AS base
# Prisma's query engine needs OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
# The db package's postinstall runs `prisma generate`, which needs the schema.
COPY packages/db/prisma packages/db/prisma
RUN pnpm install --frozen-lockfile --filter "@genpos/api..."
COPY packages/db packages/db
COPY apps/api apps/api
RUN pnpm --filter @genpos/api build

FROM base AS runtime
ENV NODE_ENV=production PORT=4000
COPY --from=build --chown=node:node /repo /repo
COPY --chown=node:node apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["docker-entrypoint.sh"]
