# Backend Export System

This document describes the architecture for server-side video export processing, designed for multicam podcast editing with large (4K, 15GB+) source files.

## Overview

The browser-based editor handles editing with lightweight proxy files. When the user clicks "Export", the frontend generates a **config JSON file** describing exactly how to cut and join the source videos. A backend processor reads this config and uses **FFmpeg** to produce the final output.

```
┌──────────────────────────────────────┐
│  Browser (Editor)                     │
│  - Load proxy files for editing       │
│  - Multicam: record switch points     │
│  - Export: generate config JSON       │
│  - POST config to /api/export         │
│  - Poll status / download result      │
└──────────────┬───────────────────────┘
               │
        POST /api/export
               │
┌──────────────▼───────────────────────┐
│  Next.js API Route                    │
│  - Validate config                    │
│  - Write config to shared volume      │
│  - Trigger FFmpeg processor           │
│  - Return job ID                      │
└──────────────┬───────────────────────┘
               │
       shared Docker volume
        /data/media/
               │
┌──────────────▼───────────────────────┐
│  FFmpeg Processor                     │
│  - Read config JSON                   │
│  - Cut segments from source files     │
│  - Concatenate into single output     │
│  - Update config status               │
└──────────────────────────────────────┘
```

## Phases

### Phase 1 (Current)
- Source files stored on **local server filesystem** in a shared Docker volume
- Simple synchronous FFmpeg processing
- No job queue

### Phase 2 (Future)
- Source files on **AWS S3**
- Async job queue with Redis/BullMQ
- Webhook notifications on completion
- Presigned download URLs

## Related Docs

- [Config JSON Schema](./config-schema.md)
- [FFmpeg Processing](./ffmpeg-processing.md)
- [API Endpoints](./api-endpoints.md)
- [Docker Setup](./docker-setup.md)
- [Future Roadmap](./roadmap.md)
