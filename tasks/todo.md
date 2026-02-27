# Backend Export — Implementation Plan

## Phase 1: Shared Types Package

- [ ] Create `packages/export-config/package.json`
- [ ] Create `packages/export-config/tsconfig.json`
- [ ] Create `packages/export-config/src/schema.ts` — Zod schema for export config JSON
- [ ] Create `packages/export-config/src/types.ts` — TypeScript types (inferred from Zod)
- [ ] Create `packages/export-config/src/index.ts` — barrel export
- [ ] Verify: `bun install` works, types resolve from both `apps/web` and `apps/export-processor`

## Phase 2: Export Processor Service

- [ ] Create `apps/export-processor/package.json`
- [ ] Create `apps/export-processor/tsconfig.json`
- [ ] Create `apps/export-processor/Dockerfile`
- [ ] Create `apps/export-processor/src/index.ts` — entry: poll for jobs, process them
- [ ] Create `apps/export-processor/src/processor.ts` — FFmpeg cut + concat logic
- [ ] Create `apps/export-processor/src/progress.ts` — parse FFmpeg stderr for progress %
- [ ] Create `apps/export-processor/src/status.ts` — read/write status.json
- [ ] Verify: can run locally, processes a test config JSON with FFmpeg

## Phase 3: API Routes

- [ ] Create `apps/web/src/app/api/export/route.ts` — POST: receive config, validate, write to disk
- [ ] Create `apps/web/src/app/api/export/[jobId]/status/route.ts` — GET: read status.json
- [ ] Create `apps/web/src/app/api/export/[jobId]/download/route.ts` — GET: stream output file
- [ ] Create `apps/web/src/app/api/export/[jobId]/route.ts` — DELETE: cancel/cleanup
- [ ] Verify: curl test POST → status → download flow

## Phase 4: Docker Setup

- [ ] Update `docker-compose.yml` — add `media_data` volume, mount on `web` + `export-processor`
- [ ] Add `export-processor` service to `docker-compose.yml`
- [ ] Verify: `docker compose up` starts all services, shared volume works

## Phase 5: Frontend Integration

- [ ] Add `generateExportConfig()` to `MulticamManager`
- [ ] Update `export-button.tsx` — detect multicam, POST config, poll status, download
- [ ] Verify: full end-to-end flow works in browser

## Review

_(To be filled after implementation)_
