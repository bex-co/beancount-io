#!/usr/bin/env bash
set -euo pipefail
npx openapi-typescript ../beancount-ledger.openapi.json \
  -o src/generated/api.ts
