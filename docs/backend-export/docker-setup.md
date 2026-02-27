# Docker Setup

How the Docker containers and shared volumes are configured for the export system.

## Architecture

```
┌─────────────────┐     ┌─────────────────────┐
│  web (Next.js)  │     │  export-processor    │
│                 │     │  (Node + FFmpeg)     │
│  - Editor UI    │     │                      │
│  - API routes   │     │  - Watches for jobs  │
│  - Writes config│     │  - Runs FFmpeg       │
│                 │     │  - Updates status     │
└────────┬────────┘     └──────────┬───────────┘
         │                         │
         └──────────┬──────────────┘
                    │
            ┌───────▼────────┐
            │  Shared Volume │
            │  /data/media/  │
            │                │
            │  source files  │
            │  exports/      │
            │   └─ jobs/     │
            └────────────────┘
```

## docker-compose.yml Changes

Add to the existing `docker-compose.yml`:

```yaml
services:
  # ... existing services (db, redis, web) ...

  export-processor:
    build:
      context: .
      dockerfile: ./apps/export-processor/Dockerfile
    restart: unless-stopped
    volumes:
      - media_data:/data/media
    environment:
      - NODE_ENV=production
    depends_on:
      web:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "test -f /tmp/processor-healthy || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 10s

  web:
    # ... existing config ...
    volumes:
      - media_data:/data/media    # ADD THIS

volumes:
  postgres_data:
  media_data:                     # ADD THIS
```

## Shared Volume: `/data/media/`

### Directory Structure

```
/data/media/
├── sources/                    # Original source video files
│   ├── camera1_wide.mp4
│   ├── camera2_close.mp4
│   └── camera3_guest.mp4
├── proxies/                    # Low-res proxy files for browser editing
│   ├── camera1_wide_proxy.mp4
│   ├── camera2_close_proxy.mp4
│   └── camera3_guest_proxy.mp4
└── exports/                    # Export jobs
    └── export-abc123/
        ├── config.json         # Export config (written by web)
        ├── status.json         # Job status (updated by processor)
        ├── segment_0.mp4       # Temp segment files
        ├── segment_1.mp4
        ├── concat_list.txt     # FFmpeg concat input
        └── output.mp4          # Final output
```

### Permissions

Both containers need read/write access to `/data/media/`:
- **web** container: reads source files (for proxy generation later), writes config JSON
- **export-processor** container: reads source files + config, writes segments + output

## Export Processor Dockerfile

```dockerfile
FROM node:20-slim

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy processor code
COPY apps/export-processor/package.json ./
RUN npm install --production

COPY apps/export-processor/ ./

CMD ["node", "index.js"]
```

## Phase 1: Local Development

For local development without Docker, use a local directory:

```bash
# Create the media directory
mkdir -p /tmp/opencut-media/sources
mkdir -p /tmp/opencut-media/exports

# Copy test files
cp your-video-files/*.mp4 /tmp/opencut-media/sources/

# Set env var
export MEDIA_BASE_PATH=/tmp/opencut-media
```

The `MEDIA_BASE_PATH` environment variable is used by both the API routes and the processor to resolve file paths.

## Phase 2: S3 Integration

When moving to S3:
- `sources/` → S3 bucket (`s3://opencut-media/sources/`)
- `proxies/` → S3 bucket or CloudFront CDN
- `exports/` → stays on local volume (temporary), final output uploaded to S3
- Config JSON `filePath` fields change from `/data/media/sources/...` to `s3://...` URLs
- FFmpeg reads directly from S3 presigned URLs via HTTP
