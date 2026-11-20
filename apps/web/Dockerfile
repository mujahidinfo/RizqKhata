# Rizq Khata public site (landing, about, privacy, terms) — build from the repo root:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://rizqkhata.com \
#     --build-arg NEXT_PUBLIC_APP_URL=https://app.rizqkhata.com \
#     -t rizqkhata-web .
# NEXT_PUBLIC_* values are baked in at build time (they are public by design).

FROM node:24-bookworm-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
ARG NEXT_PUBLIC_APP_NAME="Rizq Khata"
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_CONTACT_EMAIL=""
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_TELEMETRY_DISABLED=1
RUN test -n "$NEXT_PUBLIC_SITE_URL" && test -n "$NEXT_PUBLIC_APP_URL" \
  || (echo "Set NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_APP_URL build args" && exit 1)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter "@genpos/web..."
COPY apps/web apps/web
RUN pnpm --filter @genpos/web build

FROM base AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
# Standalone output keeps the monorepo layout: server.js lives under apps/web.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
