#!/usr/bin/env bash
set -euo pipefail
# Convert Swagger 2.0 → OpenAPI 3.0 then generate TypeScript types
npx swagger2openapi ../gitea.swagger.v1.json -o /tmp/gitea.openapi3.json
npx openapi-typescript /tmp/gitea.openapi3.json \
  -o src/generated/api.ts
rm /tmp/gitea.openapi3.json
