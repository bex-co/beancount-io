# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json .yarnrc.yml ./
COPY yarn.lock* ./

# Install dependencies (need devDependencies for building)
RUN corepack enable && yarn install --frozen-lockfile

# Copy source files
COPY . .

# Build args are OPTIONAL overrides. Defaults come from the committed
# .env.production, which is what a platform that passes no --build-arg gets.
#
# These must NOT become ENV directly: with no --build-arg the ARG is empty, so
# `ENV VITE_API_URL=$VITE_API_URL` sets it to "" -- and Vite prioritises
# VITE_-prefixed process.env over .env files, so an empty ENV silently blanks
# the committed value and ships a bundle with no API URL. Write the non-empty
# ones to .env.production.local instead, which Vite loads at higher precedence
# than .env.production while an absent file changes nothing.
ARG VITE_API_URL
ARG VITE_SSR_API_URL
ARG VITE_GA_MEASUREMENT_ID
RUN set -eu; \
    : > .env.production.local; \
    if [ -n "${VITE_API_URL:-}" ]; then \
      echo "VITE_API_URL=$VITE_API_URL" >> .env.production.local; fi; \
    if [ -n "${VITE_SSR_API_URL:-}" ]; then \
      echo "VITE_SSR_API_URL=$VITE_SSR_API_URL" >> .env.production.local; fi; \
    if [ -n "${VITE_GA_MEASUREMENT_ID:-}" ]; then \
      echo "VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID" >> .env.production.local; fi

# Build the application (produces .output/)
RUN yarn build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built output
COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
