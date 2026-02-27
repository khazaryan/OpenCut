FROM node:20-slim

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace root for monorepo resolution
COPY package.json bun.lock ./
COPY packages/export-config/ ./packages/export-config/
COPY apps/export-processor/package.json ./apps/export-processor/

# Install dependencies
RUN npm install --prefix apps/export-processor --production

# Copy processor source
COPY apps/export-processor/ ./apps/export-processor/

WORKDIR /app/apps/export-processor

# Health marker
RUN touch /tmp/processor-healthy

CMD ["node", "--loader", "tsx", "src/index.ts"]
