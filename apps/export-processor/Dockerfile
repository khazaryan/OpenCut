FROM oven/bun:1.3 AS base

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy monorepo root files for workspace resolution
COPY package.json bun.lock ./
COPY packages/export-config/package.json ./packages/export-config/
COPY apps/export-processor/package.json ./apps/export-processor/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY packages/export-config/ ./packages/export-config/
COPY apps/export-processor/ ./apps/export-processor/

# Health marker
RUN touch /tmp/processor-healthy

CMD ["bun", "run", "apps/export-processor/src/index.ts"]
