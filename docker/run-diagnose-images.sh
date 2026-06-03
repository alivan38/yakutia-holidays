#!/bin/sh
set -e
export DIRECTUS_TOKEN="$(node /docker/ensure-token.mjs)"
exec node /docker/diagnose-holidays-image.mjs
