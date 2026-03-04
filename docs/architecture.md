# Architecture

This document describes the core architecture of OpenCut's video editor.

## System Overview

OpenCut uses a **singleton-based architecture** with specialized managers handling different aspects of the editor. All state flows through the `EditorCore` singleton, which provides a centralized API for the entire application.

## EditorCore Singleton

The `EditorCore` class is the heart of the application. It's a singleton that manages all editor state through specialized managers.

### Architecture Diagram

```
EditorCore (singleton)
├── command: CommandManager         # Undo/redo system
├── playback: PlaybackManager       # Video playback control
├── timeline: TimelineManager       # Tracks and timeline elements
├── scenes: ScenesManager           # Scene composition
├── project: ProjectManager         # Project-level operations
├── media: MediaManager             # Media asset management
├── renderer: RendererManager       # Canvas rendering
├── save: SaveManager               # Auto-save functionality
├── audio: AudioManager             # Audio processing
├── selection: SelectionManager     # Element selection
└── multicam: MulticamManager       # Multi-camera editing
```

### Manager Responsibilities

#### CommandManager
- Manages undo/redo stack
- Executes commands and tracks history
- Provides `execute()`, `undo()`, `redo()` methods

#### PlaybackManager
- Controls video playback state (play/pause)
- Manages playback position and seeking
- Handles playback speed and looping

#### TimelineManager
- Manages tracks (video, audio, text, etc.)
- Handles timeline elements (clips, text, shapes)
- Provides CRUD operations for timeline items
- Manages element positioning and duration

#### ScenesManager
- Manages scene composition
- Handles scene transitions
- Provides scene-level operations

#### ProjectManager
- Project creation, loading, and saving
- Project metadata management
- Export configuration

#### MediaManager
- Media asset library management
- File upload and processing
- Media metadata extraction

#### RendererManager
- Canvas rendering pipeline
- Frame composition
- Visual effects application

#### SaveManager
- Auto-save functionality
- Project state persistence
- Save conflict resolution

#### AudioManager
- Audio processing and mixing
- Audio effects application
- Waveform generation

#### SelectionManager
- Element selection state
- Multi-selection support
- Selection-based operations

#### MulticamManager
- Multi-camera editing support
- Camera angle switching
- Synchronized playback

## State Management

### EditorCore State

The `EditorCore` singleton holds the canonical state for the editor. Managers emit events when state changes, allowing React components to re-render.

### React Integration

Components access the editor through the `useEditor()` hook:

```typescript
import { useEditor } from '@/hooks/use-editor';

function MyComponent() {
  const editor = useEditor();
  
  // Automatically re-renders when editor state changes
  const tracks = editor.timeline.getTracks();
  
  return <div>{tracks.length} tracks</div>;
}
```

The hook:
- Returns the singleton `EditorCore` instance
- Subscribes to all manager change events
- Triggers re-renders when state changes

### Zustand Stores

Some UI-specific state is managed with Zustand stores:

- **`editor-store`**: Global editor UI state
- **`timeline-store`**: Timeline UI state (zoom, scroll)
- **`preview-store`**: Preview panel state
- **`panel-store`**: Panel visibility and layout
- **`keybindings-store`**: Keyboard shortcut configuration
- **`assets-panel-store`**: Asset panel state
- **`sounds-store`**: Sound library state
- **`stickers-store`**: Sticker library state

**When to use Zustand vs EditorCore:**
- Use `EditorCore` for editor data and operations
- Use Zustand for UI-only state (panel visibility, zoom level, etc.)

## Actions System

Actions are the trigger layer for user-initiated operations. They provide a unified interface for keyboard shortcuts, UI buttons, and context menus.

### Action Flow

```
User Input (keyboard/click)
    ↓
invokeAction('action-name', args?)
    ↓
Action Handler (useActionHandler)
    ↓
Command (if state-changing)
    ↓
EditorCore Manager
    ↓
State Change + Event Emission
    ↓
React Re-render
```

### Key Files

- **`src/lib/actions/definitions.ts`**: Action definitions
- **`src/lib/actions/types.ts`**: TypeScript types
- **`src/hooks/actions/use-editor-actions.ts`**: Action handlers
- **`src/hooks/use-keybindings.ts`**: Keyboard shortcut binding

See [Actions System](./actions.md) for detailed documentation.

## Commands System

Commands implement the Command pattern for undo/redo functionality.

### Command Flow

```
User Action
    ↓
invokeAction('action-name')
    ↓
Action Handler
    ↓
new SomeCommand(args)
    ↓
editor.command.execute(command)
    ↓
command.execute()
    ├── Save current state
    └── Apply changes
    ↓
Command added to undo stack
```

### Command Structure

```typescript
class MyCommand extends Command {
  private previousState: any;
  
  async execute() {
    // Save current state
    this.previousState = getCurrentState();
    
    // Apply changes
    applyChanges();
  }
  
  async undo() {
    // Restore previous state
    restoreState(this.previousState);
  }
}
```

### Command Organization

Commands are organized by domain:

- **`lib/commands/timeline/`**: Timeline operations
- **`lib/commands/scene/`**: Scene operations
- **`lib/commands/media/`**: Media operations
- **`lib/commands/project/`**: Project operations
- **`lib/commands/multicam/`**: Multi-camera operations

See [Commands System](./commands.md) for detailed documentation.

## Rendering Pipeline

### Canvas Rendering

The `RendererManager` handles all canvas rendering:

1. **Frame Composition**: Combines all visible elements
2. **Effect Application**: Applies filters and effects
3. **Canvas Update**: Renders to preview canvas

### Services

Rendering is handled by specialized services:

- **`services/renderer/`**: Core rendering logic
- **`services/storage/`**: Asset storage and caching
- **`services/video-cache/`**: Video frame caching
- **`services/transcription/`**: Audio transcription

## Data Flow

### Typical Operation Flow

1. **User Input**: User clicks button or presses key
2. **Action Invocation**: `invokeAction('action-name')`
3. **Action Handler**: Validates and prepares operation
4. **Command Creation**: Creates command if state-changing
5. **Command Execution**: `editor.command.execute(command)`
6. **Manager Update**: Manager updates internal state
7. **Event Emission**: Manager emits change event
8. **React Re-render**: Components subscribed via `useEditor()` re-render

### Example: Splitting a Clip

```typescript
// 1. User clicks "Split" button
<Button onClick={() => invokeAction('split-selected')}>Split</Button>

// 2. Action handler (in use-editor-actions.ts)
useActionHandler('split-selected', () => {
  const selectedElements = editor.selection.getSelected();
  const currentTime = editor.playback.getCurrentTime();
  
  // 3. Create command
  const command = new SplitElementsCommand({
    elements: selectedElements,
    time: currentTime
  });
  
  // 4. Execute command
  editor.command.execute(command);
});

// 5. Command execution
class SplitElementsCommand extends Command {
  async execute() {
    this.previousState = editor.timeline.getState();
    editor.timeline.splitElements(this.elements, this.time);
  }
  
  async undo() {
    editor.timeline.setState(this.previousState);
  }
}

// 6. Timeline manager updates and emits event
// 7. Components re-render automatically
```

## File Organization

### Core (`src/core/`)

- **`index.ts`**: EditorCore singleton definition
- **`managers/`**: All manager implementations

### Lib (`src/lib/`)

Domain-specific logic:
- **`actions/`**: Action system
- **`commands/`**: Command implementations
- **`timeline/`**: Timeline utilities
- **`scenes.ts`**: Scene utilities
- **`media/`**: Media processing
- **`export.ts`**: Export logic

### Utils (`src/utils/`)

Generic utilities that could be used in any project:
- File manipulation
- String formatting
- Math helpers
- etc.

### Hooks (`src/hooks/`)

React hooks:
- **`use-editor.ts`**: Main editor hook
- **`use-keybindings.ts`**: Keyboard shortcuts
- **`actions/`**: Action-related hooks
- **`timeline/`**: Timeline-specific hooks

### Components (`src/components/`)

React components:
- **`editor/`**: Editor-specific components
- **`ui/`**: Reusable UI components
- **`providers/`**: React context providers

## Design Patterns

### Singleton Pattern

`EditorCore` uses the singleton pattern to ensure a single source of truth for editor state.

```typescript
const editor = EditorCore.getInstance();
```

### Command Pattern

All state-changing operations use the Command pattern for undo/redo support.

```typescript
const command = new MyCommand(args);
editor.command.execute(command);
```

### Observer Pattern

Managers emit events when state changes, allowing components to react:

```typescript
// Manager emits event
this.emit('change');

// Hook subscribes to events
useEditor(); // Auto-subscribes and re-renders on changes
```

### Dependency Injection

Managers receive the `EditorCore` instance in their constructor, allowing them to access other managers:

```typescript
class TimelineManager {
  constructor(private editor: EditorCore) {}
  
  someMethod() {
    // Access other managers
    const currentTime = this.editor.playback.getCurrentTime();
  }
}
```

## Performance Considerations

### State Updates

- Batch state updates when possible
- Use `BatchCommand` for multiple operations
- Avoid unnecessary re-renders with proper memoization

### Canvas Rendering

- Only render visible frames
- Cache rendered frames when possible
- Use requestAnimationFrame for smooth playback

### Memory Management

- Clean up event listeners in components
- Dispose of heavy resources (video elements, canvases)
- Implement proper cleanup in manager destructors

## Testing Strategy

### Unit Tests

- Test individual manager methods
- Test command execute/undo behavior
- Test utility functions

### Integration Tests

- Test action → command → manager flow
- Test multi-manager interactions
- Test state synchronization

### E2E Tests

- Test complete user workflows
- Test keyboard shortcuts
- Test export functionality

## Future Architecture Considerations

### Planned Improvements

- **Web Workers**: Move heavy processing to workers
- **WASM Rendering**: Native rendering for better performance
- **Streaming Export**: Export large videos without memory issues
- **Plugin System**: Allow third-party extensions
