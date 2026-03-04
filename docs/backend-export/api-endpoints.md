# API Endpoints

Next.js API routes for the backend export system.

## Endpoints

### `POST /api/export`

Submit a new export job.

**Request:**
```json
{
  "version": 1,
  "id": "export-abc123",
  "projectId": "7c98c8d8-...",
  "projectName": "My Podcast Episode 12",
  "createdAt": "2026-02-27T11:16:00.000Z",
  "sources": [ ... ],
  "segments": [ ... ],
  "output": { ... },
  "status": "pending"
}
```

**Response (200):**
```json
{
  "jobId": "export-abc123",
  "status": "pending",
  "message": "Export job created"
}
```

**Response (400):**
```json
{
  "error": "Invalid config: missing sources"
}
```

**What it does:**
1. Validates the config JSON against Zod schema (`@opencut/export-config`)
2. Resolves source `filePath` values against `MEDIA_BASE_PATH/sources/` (plain filenames) or uses them directly (absolute paths)
3. Verifies source files exist on disk via `fs.access()`
4. Creates the export working directory (`{MEDIA_BASE_PATH}/exports/{jobId}/`)
5. Writes `config.json` and `status.json` (pending) to the job directory
6. Returns job ID — the processor polls for pending jobs and picks them up

---

### `GET /api/export/[jobId]/status`

Poll the status of an export job.

**Response (200):**
```json
{
  "jobId": "export-abc123",
  "status": "processing",
  "progress": 0.45,
  "message": "Processing segment 5 of 10"
}
```

**Status values:**
- `pending` — job queued, not started
- `processing` — FFmpeg is running, `progress` field available
- `completed` — output file ready for download
- `failed` — processing failed, check `error` field

**When completed:**
```json
{
  "jobId": "export-abc123",
  "status": "completed",
  "progress": 1.0,
  "downloadUrl": "/api/export/export-abc123/download"
}
```

**When failed:**
```json
{
  "jobId": "export-abc123",
  "status": "failed",
  "error": "FFmpeg error: codec mismatch between sources"
}
```

---

### `GET /api/export/[jobId]/download`

Download the completed export file.

**Response:** Binary file stream with appropriate headers:
```
Content-Type: video/mp4
Content-Disposition: attachment; filename="My Podcast Episode 12.mp4"
Content-Length: 1234567890
```

**Response (404):**
```json
{
  "error": "Export not found or not completed"
}
```

---

### `DELETE /api/export/[jobId]`

Cancel a running export or clean up a completed one.

**Response (200):**
```json
{
  "jobId": "export-abc123",
  "status": "cancelled",
  "message": "Export cancelled and files cleaned up"
}
```

**What it does:**
1. If processing: kills the FFmpeg process
2. Removes temporary segment files
3. Removes the output file (if exists)
4. Removes the working directory

---

## Path Resolution

All API routes import `MEDIA_BASE_PATH`, `EXPORTS_DIR`, and `SOURCES_DIR` from `apps/web/src/lib/export-paths.ts`.

`MEDIA_BASE_PATH` defaults to `{project_root}/apps/export-processor/data`. Override via `MEDIA_BASE_PATH` env var.

The `findProjectRoot()` function walks up from `process.cwd()` looking for a `package.json` with `workspaces` to handle the fact that Next.js runs from `apps/web/`, not the monorepo root.

**Source file resolution:**
- Relative path (e.g. `"Studio CAM 1.mp4"`) → `{MEDIA_BASE_PATH}/sources/Studio CAM 1.mp4`
- Absolute path (e.g. `"/mnt/s3/file.mp4"`) → used as-is

**Output file resolution:**
- Relative path (e.g. `"exports/{jobId}/output.mp4"`) → `{MEDIA_BASE_PATH}/exports/{jobId}/output.mp4`
- Absolute path → used as-is

## File Structure on Server

```
apps/export-processor/data/        # MEDIA_BASE_PATH
├── sources/
│   ├── camera1_wide.mp4            # Source files (user drops here)
│   ├── camera2_close.mp4
│   └── camera3_guest.mp4
└── exports/
    └── export-abc123/
        ├── config.json             # The export config
        ├── status.json             # Current job status + progress
        ├── segment_0.mp4           # Temporary (cleaned up after concat)
        ├── segment_1.mp4
        ├── concat_list.txt         # Temporary (cleaned up after concat)
        └── output.mp4              # Final output
```

## Frontend Flow

```javascript
// 1. Generate config from multicam state
const config = editor.multicam.generateExportConfig({
  format: "mp4",
  includeAudio: true,
});

// 2. Submit export job
const { jobId } = await fetch("/api/export", {
  method: "POST",
  body: JSON.stringify(config),
}).then(r => r.json());

// 3. Poll status
const poll = setInterval(async () => {
  const status = await fetch(`/api/export/${jobId}/status`).then(r => r.json());
  updateProgress(status.progress);

  if (status.status === "completed") {
    clearInterval(poll);
    window.location.href = `/api/export/${jobId}/download`;
  }
  if (status.status === "failed") {
    clearInterval(poll);
    showError(status.error);
  }
}, 2000);
```
