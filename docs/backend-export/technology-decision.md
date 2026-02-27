# Backend Technology Decision

## What We Already Have

| Component | Technology | Notes |
|-----------|-----------|-------|
| Frontend | Next.js 16 + React 19 | Turbopack, Bun runtime |
| Monorepo | Turborepo + Bun workspaces | `apps/web`, `packages/ui`, `packages/env` |
| Database | Postgres 17 | via Drizzle ORM |
| Cache | Redis 7 | via Upstash REST adapter |
| Auth | better-auth | Session-based |
| Container | Docker Compose | Web + DB + Redis |
| FFmpeg (client) | `@ffmpeg/ffmpeg` 0.12 | Already in dependencies (WASM, browser-only) |
| Package manager | Bun 1.2 | |

## Decision: Where to Put the Export Processor

### Option A: Next.js API Route (inside `apps/web`)

```
apps/web/src/app/api/export/route.ts  →  spawns FFmpeg child process
```

- **Pro**: No new service, no new Docker container, simplest setup
- **Pro**: Shares auth, DB, types with the existing app
- **Pro**: Next.js API routes can handle long-running requests with streaming
- **Con**: FFmpeg runs on the same container as the web app — resource contention
- **Con**: Next.js serverless deploys (Vercel) can't run FFmpeg
- **Con**: If export crashes, it takes down the web app

### Option B: Separate Node.js service (`apps/export-processor`)

```
apps/export-processor/   →  standalone Node.js + FFmpeg container
```

- **Pro**: Isolated — export crashes don't affect the editor
- **Pro**: Can scale independently (more CPU/RAM for FFmpeg)
- **Pro**: Fits the Turborepo monorepo pattern (`apps/*`)
- **Pro**: Clear separation of concerns
- **Con**: More Docker config, inter-service communication needed
- **Con**: Slightly more complex setup

### Option C: Python + FFmpeg service

- **Pro**: Python has great FFmpeg bindings (ffmpeg-python)
- **Con**: Adds a new language to the stack
- **Con**: Doesn't fit the existing TypeScript/Bun ecosystem

---

## Recommendation: Option B — Separate Node.js service

**For Phase 1 (simplicity)**, start with a hybrid approach:

1. **API routes in `apps/web`** — receive the config JSON, validate, write to shared volume, return job ID, poll status
2. **Processor in `apps/export-processor`** — standalone Node.js app that watches for config files and runs FFmpeg

This gives us isolation without over-engineering. The web app handles HTTP; the processor handles FFmpeg.

### Communication: File-based (Phase 1)

```
Web writes:    /data/media/exports/{jobId}/config.json     (status: "pending")
Processor:     picks up config, updates status.json         (status: "processing")
Processor:     runs FFmpeg, writes output.mp4
Processor:     updates status.json                          (status: "completed")
Web reads:     /data/media/exports/{jobId}/status.json      (polling)
```

No message queue needed for Phase 1. The processor polls the exports directory for new jobs.

### Communication: Redis queue (Phase 2)

When scaling matters, switch to Redis + BullMQ:
- Web pushes job to Redis queue
- Processor(s) consume from queue
- Status stored in Redis for fast polling

---

## Export Processor Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Runtime | **Node.js 20** (not Bun) | Better FFmpeg child_process support, more battle-tested for server workloads |
| FFmpeg | **System FFmpeg** (apt install) | Full-featured, hardware accel support, not WASM-limited |
| File watching | **fs.watch** or polling | Simple, no dependencies |
| Config parsing | **Zod** | Already used in the web app, shared validation |
| Logging | **console + file** | Simple for Phase 1 |
| Docker base | **node:20-slim + ffmpeg** | Minimal image size |

### Why Node.js (not Bun) for the processor

- Bun's `child_process` and streaming support is less mature
- FFmpeg process management (kill, pipe stderr for progress) is well-proven in Node
- The processor is a simple script, not a web framework — Node is plenty fast
- Can switch to Bun later if needed

---

## Project Structure

```
apps/
  web/                          # Existing Next.js app
    src/app/api/export/
      route.ts                  # POST: receive config, create job
      [jobId]/
        status/route.ts         # GET: poll status
        download/route.ts       # GET: download result
        route.ts                # DELETE: cancel/cleanup

  export-processor/             # NEW: FFmpeg processor
    package.json
    tsconfig.json
    Dockerfile
    src/
      index.ts                  # Entry: watch for jobs, process them
      processor.ts              # FFmpeg cut + concat logic
      config.ts                 # Config JSON validation (Zod)
      progress.ts               # Parse FFmpeg stderr for progress %
      types.ts                  # Shared types (or import from packages/)

packages/
  export-config/                # NEW: shared types between web + processor
    package.json
    src/
      schema.ts                 # Zod schema for config JSON
      types.ts                  # TypeScript types
```

### Shared Types Package

Both `apps/web` and `apps/export-processor` import from `@opencut/export-config`:

```typescript
import { ExportConfigSchema, type ExportConfig } from "@opencut/export-config";

// Web: validate before writing
const config = ExportConfigSchema.parse(requestBody);

// Processor: validate before processing
const config = ExportConfigSchema.parse(JSON.parse(fileContents));
```

---

## Docker Changes

```yaml
# docker-compose.yml additions

services:
  export-processor:
    build:
      context: .
      dockerfile: ./apps/export-processor/Dockerfile
    restart: unless-stopped
    volumes:
      - media_data:/data/media
    environment:
      - NODE_ENV=production
      - MEDIA_BASE_PATH=/data/media
      - POLL_INTERVAL_MS=2000

  web:
    volumes:
      - media_data:/data/media       # ADD: shared volume

volumes:
  media_data:                         # ADD: shared volume
```

---

## Implementation Order

1. `packages/export-config` — shared Zod schema + types
2. `apps/web/src/app/api/export/` — API routes
3. `apps/export-processor/` — FFmpeg processor
4. `docker-compose.yml` — shared volume + new container
5. Frontend `export-button.tsx` — detect multicam, use backend path
6. `multicam-manager.ts` — `generateExportConfig()` method

---

## Open Questions

- [ ] For local dev (no Docker), should the processor run as a separate `bun run dev:export` script?
- [ ] Should we support cancellation in Phase 1? (kill FFmpeg process mid-export)
- [ ] Max concurrent exports per processor instance?
- [ ] Export file retention policy? (auto-delete after download?)
