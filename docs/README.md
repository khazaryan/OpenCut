# OpenCut Documentation

Welcome to the OpenCut documentation. This directory contains comprehensive guides for understanding and contributing to the OpenCut video editor.

## Quick Links

- [Project Overview](#project-overview)
- [Architecture](./architecture.md)
- [Actions System](./actions.md)
- [Commands System](./commands.md)
- [Component System](./components.md)
- [Development Workflow](./development.md)
- [Backend Export System](./backend-export/)

## Project Overview

OpenCut is a privacy-first, open-source video editor built for web, desktop, and mobile platforms. The project emphasizes simplicity, ease of use, and keeping user data local.

### Key Features

- **Privacy-first**: All video processing happens on the user's device
- **Timeline-based editing**: Multi-track support with real-time preview
- **No watermarks**: Completely free without paywalls or subscriptions
- **Modern stack**: Built with Next.js, React 19, TypeScript, and Bun

### Technology Stack

**Frontend:**
- Next.js 16 with Turbopack
- React 19 with TypeScript
- TailwindCSS 4 for styling
- Radix UI for accessible components
- Zustand for state management
- FFmpeg.wasm for video processing

**Backend:**
- PostgreSQL with Drizzle ORM
- Better Auth for authentication
- Upstash Redis for rate limiting
- Cloudflare R2 for storage

**Monorepo:**
- Turborepo for build orchestration
- Bun as package manager and runtime
- Biome for linting and formatting

## Project Structure

```
opencut/
├── apps/
│   ├── web/                    # Main Next.js application
│   │   ├── src/
│   │   │   ├── app/           # Next.js app router pages
│   │   │   ├── components/    # React components
│   │   │   ├── core/          # Editor core system
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── lib/           # Domain logic
│   │   │   ├── services/      # External services
│   │   │   ├── stores/        # Zustand stores
│   │   │   ├── types/         # TypeScript types
│   │   │   └── utils/         # Generic utilities
│   │   └── public/            # Static assets
│   └── export-processor/      # FFmpeg export service
├── packages/
│   ├── env/                   # Environment variables
│   ├── export-config/         # Export configuration
│   └── ui/                    # Shared UI components
├── docs/                      # Documentation (you are here)
└── tasks/                     # Development tasks and notes
```

## Core Concepts

### EditorCore Singleton

The editor is built around a singleton `EditorCore` instance that manages all editor state through specialized managers:

- **PlaybackManager**: Controls video playback
- **TimelineManager**: Manages tracks and timeline elements
- **ScenesManager**: Handles scene composition
- **ProjectManager**: Project-level operations
- **MediaManager**: Media asset management
- **RendererManager**: Canvas rendering
- **CommandManager**: Undo/redo system
- **SaveManager**: Auto-save functionality
- **AudioManager**: Audio processing
- **SelectionManager**: Element selection
- **MulticamManager**: Multi-camera editing

### Actions System

Actions are the trigger layer for user-initiated operations. They connect keyboard shortcuts, UI buttons, and context menus to editor functionality. See [Actions System](./actions.md) for details.

### Commands System

Commands handle undo/redo functionality. Every state-changing operation should be wrapped in a command. See [Commands System](./commands.md) for details.

## Development Guidelines

### Code Organization

- **`lib/`**: Domain-specific logic (specific to OpenCut)
- **`utils/`**: Generic helper functions (reusable in any project)

### When to Use What

**In React Components:**
```typescript
import { useEditor } from '@/hooks/use-editor';

function MyComponent() {
  const editor = useEditor(); // Auto re-renders on state changes
  const tracks = editor.timeline.getTracks();
  return <div>{tracks.length} tracks</div>;
}
```

**Outside React:**
```typescript
import { EditorCore } from '@/core';

const editor = EditorCore.getInstance();
await editor.project.save();
```

**For User Actions:**
```typescript
import { invokeAction } from '@/lib/actions';

// Good - uses action system
invokeAction('split-selected');

// Avoid - bypasses UX layer
editor.timeline.splitElements({ ... });
```

## Getting Started

See the main [README.md](../README.md) for setup instructions.

## Contributing

Focus areas for contributions:
- Timeline functionality
- Project management features
- Performance optimizations
- Bug fixes
- UI improvements (outside preview panel)

Avoid for now:
- Preview panel enhancements (fonts, stickers, effects)
- Export functionality (being refactored)

See [.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md) for detailed guidelines.

## Documentation Index

- [Architecture](./architecture.md) - System architecture and design patterns
- [Actions System](./actions.md) - How to add and use actions
- [Commands System](./commands.md) - Undo/redo implementation
- [Component System](./components.md) - UI component organization
- [Development Workflow](./development.md) - Development best practices
- [Countries Search](./countries-search.md) - Countries data guide
- [Backend Export](./backend-export/) - Export processor documentation
