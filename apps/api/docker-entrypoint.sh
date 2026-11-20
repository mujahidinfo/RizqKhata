#!/bin/sh
# Apply committed migrations, then start the API. `migrate deploy` only runs
# migrations that are not applied yet, so restarts are safe.
set -e

cd /repo/packages/db
./node_modules/.bin/prisma migrate deploy

cd /repo/apps/api
exec node dist/main.js
