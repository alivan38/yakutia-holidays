#!/bin/sh
set -e
export DIRECTUS_TOKEN="$(node /app/ensure-token.mjs)"
exec node /docker/diagnose-holidays-image.mjs
