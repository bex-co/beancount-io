#!/usr/bin/env bash
set -euo pipefail
npx openapi-typescript ../backend-v2.openapi.json \
  -o src/generated/api.ts
