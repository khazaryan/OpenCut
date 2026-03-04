# Backend Export — Implementation Plan

## Phase 1: Shared Types Package ✅

- [x] Create `packages/export-config/package.json`
- [x] Create `packages/export-config/src/schema.ts` — Zod schema for export config JSON
- [x] Create `packages/export-config/src/types.ts` — TypeScript types (inferred from Zod)
- [x] Create `packages/export-config/src/index.ts` — barrel export
- [x] Verify: `bun install` works, types resolve

## Phase 2: Export Processor Service ✅

- [x] Create `apps/export-processor/package.json`
- [x] Create `apps/export-processor/tsconfig.json`
- [x] Create `apps/export-processor/Dockerfile` (oven/bun base image)
- [x] Create `apps/export-processor/src/index.ts` — entry: poll for jobs, process them
- [x] Create `apps/export-processor/src/processor.ts` — FFmpeg cut + concat logic
- [x] Create `apps/export-processor/src/progress.ts` — parse FFmpeg stderr for progress %
- [x] Create `apps/export-processor/src/status.ts` — read/write status.json
- [x] Create `apps/export-processor/data/` — sources + exports dirs with .gitignore
- [x] Verify: `bunx tsc --noEmit` passes (exit 0)
- [x] Verify: local test with synthetic videos — output.mp4 (369KB, H.264, 30fps)
- [x] Verify: real studio files (3×11GB) — 327MB output, 300x speed
- [x] Verify: full session (155 segments, 3 cameras) — 9.5GB output in ~2min

## Phase 3: API Routes ✅

- [x] Create `apps/web/src/app/api/export/route.ts` — POST: receive config, validate, write to disk
- [x] Create `apps/web/src/app/api/export/[jobId]/status/route.ts` — GET: read status.json
- [x] Create `apps/web/src/app/api/export/[jobId]/download/route.ts` — GET: stream output file
- [x] Create `apps/web/src/app/api/export/[jobId]/route.ts` — DELETE: cancel/cleanup
- [x] Create `apps/web/src/lib/export-paths.ts` — shared MEDIA_BASE_PATH resolution
- [x] Verify: curl POST → status → download flow ✅

## Phase 4: Docker Setup (Code Written)

- [x] Update `docker-compose.yml` — add `media_data` volume, mount on `web` + `export-processor`
- [x] Add `export-processor` service to `docker-compose.yml`
- [ ] Verify: `docker compose up` starts all services, shared volume works

## Phase 5: Frontend Integration ✅

- [x] Add `generateExportConfig()` to `MulticamManager`
- [x] Update `export-button.tsx` — detect multicam, POST config, poll status, download
- [x] Added `@opencut/export-config` workspace dep to `apps/web/package.json`
- [x] Verify: frontend generates correct config with plain filenames
- [x] Verify: export button triggers backend export + polls status

## Post-Implementation Fixes ✅

- [x] Switched Dockerfile from node to oven/bun (monorepo uses Bun)
- [x] Fixed `import.meta.dir` → `path.resolve()` (Bun TS compat)
- [x] Created `apps/export-processor/data/` with sources + exports dirs
- [x] Changed config to use plain filenames, server resolves against MEDIA_BASE_PATH
- [x] Created `apps/web/src/lib/export-paths.ts` — `findProjectRoot()` for reliable path resolution
- [x] Fixed download route: resolve relative output path + stream large files (was reading 11GB into memory)
- [x] All API routes now import paths from shared `@/lib/export-paths`

## Review

**Branch:** `feature/backend-export`
**Latest commit:** `d5a6dec`
**Pushed to:** `https://github.com/khazaryan/OpenCut`

### Git history
```
b0816c8 feat: backend export system — shared types, FFmpeg processor, API routes, Docker setup, frontend integration
8adf0b3 docs: update todo.md with completed items + review, add lesson about task tracking
64b8e23 docs: update todo.md with local processor test results
d528bf4 fix: resolve relative file paths against MEDIA_BASE_PATH
7da30d8 docs: add lesson about relative filenames + server-side path resolution
461e63a fix: reliable project root detection for MEDIA_BASE_PATH
d5a6dec fix: download route - resolve relative output path + stream large files
```

### Verified test results
- ✅ Synthetic test: 3 segments, 2 sources → 369KB output
- ✅ Real studio files: 3 segments, 2×11GB sources → 327MB output, 300x speed
- ✅ Full session: 155 segments, 3 cameras (28GB) → 9.5GB output, ~2min processing
- ✅ API: POST config → status.json → processor picks up → completed + downloadUrl
- ✅ Frontend: multicam edit → export button → backend config generation → works

### Not yet verified
- Docker compose up with both containers + shared volume
- Browser download of large output files (streaming route written but untested)

### Architecture decisions
- See `docs/backend-export/technology-decision.md`
- Separate Node.js + FFmpeg service (not inline in Next.js)
- File-based communication via shared directory
- Stream copy (`-c copy`) for fast processing without re-encoding
- Plain filenames in config JSON, resolved server-side against MEDIA_BASE_PATH
- `findProjectRoot()` handles monorepo cwd differences
