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
- [x] Create `apps/export-processor/Dockerfile`
- [x] Create `apps/export-processor/src/index.ts` — entry: poll for jobs, process them
- [x] Create `apps/export-processor/src/processor.ts` — FFmpeg cut + concat logic
- [x] Create `apps/export-processor/src/progress.ts` — parse FFmpeg stderr for progress %
- [x] Create `apps/export-processor/src/status.ts` — read/write status.json
- [x] Verify: `bunx tsc --noEmit` passes (exit 0)

## Phase 3: API Routes ✅

- [x] Create `apps/web/src/app/api/export/route.ts` — POST: receive config, validate, write to disk
- [x] Create `apps/web/src/app/api/export/[jobId]/status/route.ts` — GET: read status.json
- [x] Create `apps/web/src/app/api/export/[jobId]/download/route.ts` — GET: stream output file
- [x] Create `apps/web/src/app/api/export/[jobId]/route.ts` — DELETE: cancel/cleanup
- [ ] Verify: curl test POST → status → download flow (needs Docker running)

## Phase 4: Docker Setup ✅

- [x] Update `docker-compose.yml` — add `media_data` volume, mount on `web` + `export-processor`
- [x] Add `export-processor` service to `docker-compose.yml`
- [ ] Verify: `docker compose up` starts all services, shared volume works (not tested yet)

## Phase 5: Frontend Integration ✅

- [x] Add `generateExportConfig()` to `MulticamManager`
- [x] Update `export-button.tsx` — detect multicam, POST config, poll status, download
- [x] Added `@opencut/export-config` workspace dep to `apps/web/package.json`
- [ ] Verify: full end-to-end flow works in browser (needs Docker + source files)

## Review

**Completed:** 2026-02-27
**Branch:** `feature/backend-export` at commit `b0816c8`
**Pushed to:** `https://github.com/khazaryan/OpenCut`

### What was built
- Shared Zod schema package (`@opencut/export-config`) for config validation
- FFmpeg processor service that polls `/data/media/exports/` for pending jobs
- 4 API routes: submit, status, download, cancel
- Docker shared volume between web + export-processor containers
- Frontend: auto-detects multicam → backend export with polling, else client-side

### Verification done
- `bunx tsc --noEmit` on export-processor: clean (exit 0)
- Web app dev server: compiles and serves correctly
- `bun install`: all workspace deps resolve

### Not yet verified (needs Docker + test files)
- Full end-to-end: POST config → FFmpeg processes → download result
- Docker compose up with both containers + shared volume
- curl test of API routes with real config JSON

### Architecture decisions
- See `docs/backend-export/technology-decision.md`
- Separate Node.js + FFmpeg container (not inline in Next.js)
- File-based communication via shared Docker volume (Phase 1)
- Stream copy (`-c copy`) for fast processing without re-encoding
