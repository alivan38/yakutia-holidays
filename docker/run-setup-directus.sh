#!/bin/sh
set -e

if [ -z "$DIRECTUS_TOKEN" ]; then
  export DIRECTUS_TOKEN="$(node /docker/ensure-token.mjs)"
fi

exec node /app/setup-directus.mjs
