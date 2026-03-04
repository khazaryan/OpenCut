# Backend Export System

Server-side video export for multicam podcast editing with large (4K, 15GB+) source files.

## Overview

The browser editor handles editing with lightweight proxy files. When the user clicks "Export", the frontend generates a **config JSON** describing how to cut and join source videos. A backend processor uses **FFmpeg stream copy** (`-c copy`) to produce the final output — no re-encoding, near-instant processing.

```
┌──────────────────────────────────────┐
│  Browser (Editor)                     │
│  - Multicam: record switch points     │
│  - Export: generateExportConfig()     │
│  - POST config to /api/export         │
│  - Poll /api/export/{id}/status       │
│  - Download /api/export/{id}/download │
└──────────────┬───────────────────────┘
               │
        POST /api/export
               │
┌──────────────▼───────────────────────┐
│  Next.js API Routes (apps/web)        │
│  - Validate config (Zod schema)       │
│  - Verify source files exist          │
│  - Write config.json + status.json    │
│  - Return job ID                      │
└──────────────┬───────────────────────┘
               │
       MEDIA_BASE_PATH (shared dir)
       apps/export-processor/data/
               │
┌──────────────▼───────────────────────┐
│  FFmpeg Processor (apps/export-       │
│  processor)                           │
│  - Polls exports/ for pending jobs    │
│  - Cuts segments with FFmpeg -c copy  │
│  - Concatenates into single output    │
│  - Updates status.json → completed    │
└──────────────────────────────────────┘
```

## File Structure

```
apps/export-processor/
├── package.json
├── tsconfig.json
├── Dockerfile
├── data/
│   ├── .gitignore              # ignores media files
│   ├── sources/                # drop source video files here
│   │   └── .gitkeep
│   └── exports/                # processor writes output here
│       └── .gitkeep
└── src/
    ├── index.ts                # entry: poll loop for pending jobs
    ├── processor.ts            # FFmpeg cut + concat logic
    ├── progress.ts             # parse FFmpeg stderr for progress %
    └── status.ts               # read/write status.json

packages/export-config/
├── package.json
└── src/
    ├── schema.ts               # Zod schemas for config validation
    ├── types.ts                # TypeScript types (inferred from Zod)
    └── index.ts                # barrel export

apps/web/src/
├── lib/
│   └── export-paths.ts         # shared MEDIA_BASE_PATH resolution
├── app/api/export/
│   ├── route.ts                # POST: submit export job
│   └── [jobId]/
│       ├── status/route.ts     # GET: poll job status
│       ├── download/route.ts   # GET: stream output file
│       └── route.ts            # DELETE: cancel/cleanup
├── core/managers/
│   └── multicam-manager.ts     # generateExportConfig() method
└── components/editor/
    └── export-button.tsx        # UI: backend export for multicam
```

## Path Resolution

Config JSON uses **plain filenames** (e.g. `"Studio CAM 1 01.mp4"`), not full paths. Both the API and processor resolve them against `MEDIA_BASE_PATH`:

```
Config:      "filePath": "Studio CAM 1 01.mp4"
Resolved to: {MEDIA_BASE_PATH}/sources/Studio CAM 1 01.mp4

Config:      "filePath": "exports/{jobId}/output.mp4"
Resolved to: {MEDIA_BASE_PATH}/exports/{jobId}/output.mp4
```

**`MEDIA_BASE_PATH`** defaults to `{project_root}/apps/export-processor/data`.
Override via `MEDIA_BASE_PATH` env var (for Docker: `/data/media`, for S3: mount point).

The API routes use `findProjectRoot()` in `apps/web/src/lib/export-paths.ts` to locate the monorepo root (walks up from `process.cwd()` looking for `package.json` with `workspaces`). This handles the fact that Next.js `cwd` is `apps/web/`, not the project root.

## How to Run (Local Dev)

### 1. Add source videos
```bash
cp *.mp4 apps/export-processor/data/sources/
```

### 2. Start the web app
```bash
bun run dev
```

### 3. Start the processor (separate terminal)
```bash
bun run apps/export-processor/src/index.ts
```

### 4. Submit a job via curl
```bash
curl -s -X POST http://localhost:3000/api/export \
  -H "Content-Type: application/json" \
  -d @apps/export-processor/data/sources/my-config.json
```

### 5. Check status
```bash
curl -s http://localhost:3000/api/export/{jobId}/status
```

### 6. Play the output
```bash
ffplay apps/export-processor/data/exports/{jobId}/output.mp4
```

## Verified Test Results (Feb 2026)

### Test 1: Synthetic videos
- 3 segments from 2 test videos (blue/red, 10s each)
- Output: 369KB, 1280x720, H.264, 30fps
- Status: ✅ Passed

### Test 2: Real studio files (3× Studio CAM, ~11GB each)
- 3 segments (0→30s, 30→60s, 60→90s) across 2 cameras
- Output: 327MB, 1:32, 1080p, ~29Mbps
- Processing speed: 300x (stream copy)
- Status: ✅ Passed

### Test 3: Full multicam session (3 cameras, ~28GB total)
- 155 segments across 3 cameras, ~70 min total
- Output: 9.5GB, 1:11:07, 1080p, ~18.6Mbps
- Processing time: ~2 minutes for 155 cuts + concat
- Status: ✅ Passed

### Test 4: Frontend → API → Processor flow
- Multicam edit in browser → Export button → POST config → processor picks up → completed
- Config correctly generates plain filenames
- Status polling works
- Status: ✅ Passed

## Git History

```
b0816c8 feat: backend export system — shared types, FFmpeg processor, API routes, Docker setup, frontend integration
8adf0b3 docs: update todo.md with completed items + review, add lesson about task tracking
64b8e23 docs: update todo.md with local processor test results
d528bf4 fix: resolve relative file paths against MEDIA_BASE_PATH
7da30d8 docs: add lesson about relative filenames + server-side path resolution
461e63a fix: reliable project root detection for MEDIA_BASE_PATH
d5a6dec fix: download route - resolve relative output path + stream large files
```

## Phases

### Phase 1 — Local Server (Current) ✅
- Source files on local filesystem in `apps/export-processor/data/sources/`
- Synchronous FFmpeg processing (one job at a time)
- File-based communication via shared directory
- No job queue

### Phase 2 — Docker (Next)
- Containerize export-processor with FFmpeg
- Shared `media_data` Docker volume between web + processor
- `docker-compose.yml` already prepared

### Phase 3 — S3 Integration (Future)
- Source files on AWS S3
- Mount S3 bucket to `MEDIA_BASE_PATH` or use s3fs
- Presigned download URLs

### Phase 4 — Async Job Queue (Future)
- Redis/BullMQ for job management
- Webhook notifications on completion
- Concurrent processing

## Related Docs

- [Technology Decision](./technology-decision.md) — why separate Node.js + FFmpeg service
- [Config JSON Schema](./config-schema.md) — the JSON format for export jobs
- [FFmpeg Processing](./ffmpeg-processing.md) — cut + concat strategy
- [API Endpoints](./api-endpoints.md) — REST API for submitting/polling/downloading
- [Docker Setup](./docker-setup.md) — containers, shared volume, Dockerfile
- [Future Roadmap](./roadmap.md) — Phase 1–5 plan
