# Runtime Architecture: Bun vs Node.js

This document explains which parts of the OpenCut codebase use Bun vs Node.js and why.

## Overview

| Component | Runtime | Package Manager | Why |
|-----------|---------|-----------------|-----|
| **Monorepo root** | Bun | Bun | Workspace management, faster installs |
| **Next.js app** (`apps/web`) | Bun | Bun | Dev server, API routes, builds |
| **Export processor** (`apps/export-processor`) | Bun | Bun | FFmpeg orchestration service |
| **Shared packages** (`packages/*`) | N/A | Bun | Type-only packages, no runtime |

## Detailed Breakdown

### 1. Monorepo Root

**Runtime:** Bun  
**Location:** `/package.json`

```json
{
  "packageManager": "bun@1.2.18",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:web": "turbo run dev --filter=@opencut/web",
    "test": "bun test"
  }
}
```

**Uses Bun for:**
- Package installation (`bun install`)
- Workspace resolution
- Running Turborepo commands
- Test runner

**Why Bun:**
- 10-20x faster than npm/yarn for installs
- Native workspace support
- Built-in test runner
- TypeScript support out of the box

---

### 2. Next.js Web App (`apps/web`)

**Runtime:** Bun  
**Location:** `apps/web/`

```json
{
  "packageManager": "bun@1.2.18",
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start"
  }
}
```

**Backend code in `apps/web`:**

#### **API Routes** (`apps/web/src/app/api/`)

All API routes run on Bun runtime:

| Route | Purpose | Key Operations |
|-------|---------|----------------|
| `/api/health` | Health check | Simple OK response |
| `/api/auth/[...all]` | Authentication | better-auth integration |
| `/api/sounds/search` | Sound library | Freesound API proxy with rate limiting |
| `/api/export` | Export job submission | Validate config, verify files, create job |
| `/api/export/[jobId]/status` | Export status polling | Read status.json from disk |
| `/api/export/[jobId]/download` | Export download | Stream large video files (10GB+) |
| `/api/export/[jobId]` | Export cancellation | DELETE endpoint for cleanup |

**Backend responsibilities in `apps/web`:**
- ✅ HTTP request handling
- ✅ Authentication & sessions (better-auth)
- ✅ Database queries (Drizzle ORM + Postgres)
- ✅ Redis caching (Upstash)
- ✅ Rate limiting
- ✅ File I/O (reading status files, streaming downloads)
- ✅ External API proxying (Freesound)
- ✅ Export config validation (Zod)
- ✅ Path resolution (`findProjectRoot()`)

**What it does NOT do:**
- ❌ Video processing (delegated to export-processor)
- ❌ FFmpeg operations
- ❌ Heavy CPU/memory operations

**Why Bun:**
- Next.js officially supports Bun runtime
- Faster cold starts
- Better TypeScript performance
- Consistent with monorepo

---

### 3. Export Processor (`apps/export-processor`)

**Runtime:** Bun (Docker) / Node.js (local dev - inconsistent)  
**Location:** `apps/export-processor/`

#### **Production (Docker):**

```dockerfile
FROM oven/bun:1.3 AS base
RUN apt-get install -y ffmpeg
CMD ["bun", "run", "apps/export-processor/src/index.ts"]
```

**Uses Bun in production container**

#### **Local Dev (package.json):**

```json
{
  "scripts": {
    "dev": "node --watch --loader tsx src/index.ts",
    "start": "node --loader tsx src/index.ts"
  }
}
```

**⚠️ Inconsistency:** Local dev scripts use Node.js with `tsx` loader, but Docker uses Bun.

**Backend responsibilities:**
- ✅ Poll for pending export jobs (file-based)
- ✅ Spawn FFmpeg child processes
- ✅ Cut video segments (`ffmpeg -c copy`)
- ✅ Concatenate segments
- ✅ Update status.json (processing → completed/failed)
- ✅ Clean up temporary files
- ✅ Parse FFmpeg stderr for progress

**Why Bun (in Docker):**
- Matches monorepo runtime
- TypeScript support without transpilation
- Faster startup
- Successfully tested with 28GB real files

**Original plan was Node.js because:**
- Better `child_process` stability (historically)
- More battle-tested for FFmpeg spawning
- But Bun works fine in practice

---

### 4. Shared Packages (`packages/export-config`)

**Runtime:** N/A (type-only)  
**Location:** `packages/export-config/`

```json
{
  "dependencies": {
    "zod": "^3.25.67"
  }
}
```

**No runtime scripts** — just Zod schemas and TypeScript types.

Consumed by:
- `apps/web` (API routes validate incoming configs)
- `apps/export-processor` (validates before processing)

---

## Backend Code Distribution

### In `apps/web` (Next.js):

```
apps/web/src/
├── app/api/                    # Backend API routes (Bun runtime)
│   ├── auth/[...all]/         # Authentication
│   ├── export/                # Export job management
│   ├── sounds/search/         # Sound library proxy
│   └── health/                # Health check
├── lib/
│   ├── export-paths.ts        # Path resolution utilities
│   ├── rate-limit.ts          # Rate limiting logic
│   └── db/                    # Database schema & queries
└── core/managers/             # Business logic (runs in browser + server)
    └── multicam-manager.ts    # generateExportConfig() method
```

**Backend operations:**
- HTTP routing
- Auth/sessions
- Database CRUD
- File verification
- Config validation
- Status polling
- File streaming

---

### In `apps/export-processor`:

```
apps/export-processor/src/
├── index.ts                   # Entry: poll loop
├── processor.ts               # FFmpeg cut + concat
├── progress.ts                # Parse FFmpeg stderr
└── status.ts                  # Read/write status.json
```

**Backend operations:**
- FFmpeg orchestration
- Video processing
- File I/O (segments, concat lists)
- Status updates

---

## Recommendation: Align to Bun

**Current inconsistency:**
- Dockerfile uses Bun ✅
- Local dev scripts use Node.js ❌

**Fix:**

```json
// apps/export-processor/package.json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun run src/index.ts"
  },
  "devDependencies": {
    "@types/node": "^24.2.1",
    "typescript": "^5.8.3"
    // Remove: "tsx": "^4.7.1"
  }
}
```

**Benefits:**
- Consistent with monorepo
- Matches production runtime
- Simpler dependencies
- Faster startup

**Verified:** The processor already works with Bun (tested with 155 segments, 28GB sources, 9.5GB output).

---

## Summary

**All backend code runs on Bun:**
- ✅ Next.js API routes
- ✅ Export processor (Docker)
- ✅ Monorepo tooling

**Only exception:**
- ⚠️ Export processor local dev scripts (should be updated to Bun)

**Backend is split across two apps:**
1. **`apps/web`** — HTTP interface, auth, DB, validation, streaming
2. **`apps/export-processor`** — FFmpeg orchestration, video processing

**Communication:** File-based via shared directory (Phase 1), Redis queue planned for Phase 2.
