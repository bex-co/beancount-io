 FROM node:22.23.4-alpine

 # Set working directory
 WORKDIR /app

 # Install system dependencies including Yarn
 RUN apk add --no-cache git yarn

 # Copy package files
 COPY package.json yarn.lock* ./

 # Install dependencies (generate lockfile if needed)
 # Note: Peer dependency warnings for @as-integrations/koa are expected and non-blocking
 # Clear the download caches in the same layer: they are never read at runtime
 # and otherwise add ~10 GB to the image.
 RUN yarn install && \
     yarn cache clean && \
     rm -rf /usr/local/share/.cache /root/.cache /tmp/*

 # Copy source code
 COPY . .

 # Expose port
 EXPOSE 4104

 # Set environment variables
 ENV NODE_ENV=production
 ENV PORT=4104

 # The git commit this image was built from, reported on the MCP discovery
 # documents (`config.revision`, src/config/revision.ts). `unknown` is read as
 # "not given", so a platform that sets BEANCOUNT_REVISION or RENDER_GIT_COMMIT
 # at runtime is never shadowed by it. Pass it with
 # `--build-arg REVISION=$(git rev-parse HEAD)`; the compose files under
 # deploy/ do that from BEANCOUNT_REVISION. Declared last so a new commit does
 # not invalidate the layers above.
 ARG REVISION=unknown
 ENV BEANCOUNT_REVISION=$REVISION

 # Start the application
 CMD ["yarn", "start"]

