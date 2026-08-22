 FROM node:22-alpine

 # Set working directory
 WORKDIR /app

 # Install system dependencies including Yarn
 RUN apk add --no-cache git yarn

 # Copy package files
 COPY package.json yarn.lock* ./

 # Install dependencies (generate lockfile if needed)
 # Note: Peer dependency warnings for @as-integrations/koa are expected and non-blocking
 RUN yarn install

 # Copy source code
 COPY . .

 # Expose port
 EXPOSE 4104

 # Set environment variables
 ENV NODE_ENV=production
 ENV PORT=4104

 # Start the application
 CMD ["yarn", "start"]

