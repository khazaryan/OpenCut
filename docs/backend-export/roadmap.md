# Roadmap

## Phase 1: Local Server (Current)

Files on local server filesystem, simple synchronous processing.

### Tasks

1. **Export Config JSON Schema** ✅
   - Define TypeScript types for the config
   - Create `types/export-config.ts`

2. **Frontend: Generate Export Config**
   - Add `generateExportConfig()` to `MulticamManager`
   - Converts switch points → ordered segments with file paths + cut times
   - Maps angles → source file paths

3. **Next.js API Routes**
   - `POST /api/export` — receive config, validate, trigger processing
   - `GET /api/export/[jobId]/status` — poll job status
   - `GET /api/export/[jobId]/download` — download result
   - `DELETE /api/export/[jobId]` — cancel/cleanup

4. **FFmpeg Processor**
   - Simple Node.js script using `child_process.spawn`
   - Cut segments → concat → output
   - Update status file with progress

5. **Docker Setup**
   - Add shared volume `media_data` to `docker-compose.yml`
   - Mount on both `web` and `export-processor` containers

6. **Export Button UI**
   - Detect multicam project → use backend export path
   - Show progress from polling
   - Download result when done

### Implementation Order

```
types/export-config.ts          → JSON schema types
multicam-manager.ts             → generateExportConfig()
app/api/export/route.ts         → POST handler
app/api/export/[jobId]/...      → status + download + cancel
services/export/processor.ts    → FFmpeg logic
docker-compose.yml              → shared volume
export-button.tsx               → UI changes
```

---

## Phase 2: S3 Integration

- Source files on S3 with presigned URLs
- Proxy files served via CloudFront CDN
- FFmpeg reads from S3 directly (HTTP range requests)
- Output uploaded back to S3
- Presigned download URLs for results

---

## Phase 3: Async Job Queue

- Redis + BullMQ for job management
- Multiple export-processor workers
- Priority queues (premium users first)
- Webhook callbacks on completion
- Job timeout and retry logic

---

## Phase 4: Advanced Features

- **Re-encoding** — when sources have different codecs/resolutions
- **Transitions** — crossfade/dissolve between segments
- **Audio override** — use external mic audio instead of camera audio
- **Watermark** — overlay branding on output
- **Thumbnail generation** — extract frame for preview
- **Multiple output formats** — export same edit in different resolutions

---

## Phase 5: Proxy Workflow

- Auto-generate proxy files on upload (720p/1080p)
- Browser edits with proxies for smooth playback
- Backend exports with original 4K files
- Proxy generation as background job via FFmpeg

---

## Open Questions

- [ ] How will source files get to the server initially? (upload UI, API, manual copy?)
- [ ] What's the max concurrent exports? (affects Docker resource limits)
- [ ] Do we need user authentication on export endpoints?
- [ ] Should completed exports auto-delete after N days?
