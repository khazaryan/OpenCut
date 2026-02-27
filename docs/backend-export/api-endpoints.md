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
1. Validates the config JSON
2. Verifies source files exist on disk
3. Creates the export working directory (`/data/media/exports/{jobId}/`)
4. Writes the config to disk
5. Triggers FFmpeg processing
6. Returns job ID for status polling

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

## File Structure on Server

```
/data/media/
  camera1_wide.mp4          # Source files
  camera2_close.mp4
  camera3_guest.mp4
  exports/
    export-abc123/
      config.json            # The export config
      segment_0.mp4          # Temporary cut segments
      segment_1.mp4
      segment_2.mp4
      concat_list.txt        # FFmpeg concat input file
      output.mp4             # Final output (after concat)
      status.json            # Current job status + progress
```

## Frontend Flow

```javascript
// 1. Generate config from multicam state
const config = editor.multicam.generateExportConfig({
  format: "mp4",
  quality: "high",
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
