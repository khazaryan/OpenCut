# Commands System

Commands implement the Command pattern to provide undo/redo functionality for all state-changing operations in OpenCut.

## Overview

Every operation that modifies editor state should be wrapped in a command. Commands are responsible for:

1. **Executing** the operation
2. **Saving** the previous state
3. **Undoing** the operation by restoring the previous state

## Command Structure

All commands extend the base `Command` class:

```typescript
import { Command } from '@/lib/commands/base-command';

class MyCommand extends Command {
  private previousState: any;
  private args: MyArgs;
  
  constructor(args: MyArgs) {
    super();
    this.args = args;
  }
  
  async execute() {
    // 1. Save current state
    this.previousState = getCurrentState();
    
    // 2. Apply changes
    applyChanges(this.args);
  }
  
  async undo() {
    // Restore previous state
    restoreState(this.previousState);
  }
}
```

## Command Organization

Commands are organized by domain in `src/lib/commands/`:

```
commands/
├── base-command.ts           # Base Command class
├── batch-command.ts          # Execute multiple commands
├── index.ts                  # Exports
├── timeline/                 # Timeline operations
│   ├── add-track.ts
│   ├── remove-track.ts
│   ├── add-element.ts
│   ├── remove-element.ts
│   ├── move-element.ts
│   ├── resize-element.ts
│   ├── split-element.ts
│   └── ...
├── scene/                    # Scene operations
│   ├── add-scene-element.ts
│   ├── remove-scene-element.ts
│   ├── update-scene-element.ts
│   └── ...
├── media/                    # Media operations
│   ├── add-media.ts
│   ├── remove-media.ts
│   └── ...
├── project/                  # Project operations
│   ├── update-project-settings.ts
│   └── ...
└── multicam/                 # Multi-camera operations
    ├── add-camera-angle.ts
    ├── switch-angle.ts
    └── ...
```

## Creating a New Command

### Step 1: Create the Command Class

Create a new file in the appropriate domain folder:

```typescript
// src/lib/commands/timeline/my-operation.ts
import { Command } from '@/lib/commands/base-command';
import { EditorCore } from '@/core';

interface MyOperationArgs {
  elementId: string;
  value: number;
}

export class MyOperationCommand extends Command {
  private previousValue: number;
  private args: MyOperationArgs;
  
  constructor(args: MyOperationArgs) {
    super();
    this.args = args;
  }
  
  async execute() {
    const editor = EditorCore.getInstance();
    const element = editor.timeline.getElement(this.args.elementId);
    
    // Save previous state
    this.previousValue = element.someProperty;
    
    // Apply changes
    editor.timeline.updateElement(this.args.elementId, {
      someProperty: this.args.value
    });
  }
  
  async undo() {
    const editor = EditorCore.getInstance();
    
    // Restore previous state
    editor.timeline.updateElement(this.args.elementId, {
      someProperty: this.previousValue
    });
  }
}
```

### Step 2: Export the Command

Add the export to `src/lib/commands/index.ts`:

```typescript
export { MyOperationCommand } from './timeline/my-operation';
```

### Step 3: Use in Action Handler

Execute the command in an action handler:

```typescript
// src/hooks/actions/use-editor-actions.ts
import { MyOperationCommand } from '@/lib/commands';

useActionHandler('my-action', () => {
  const command = new MyOperationCommand({
    elementId: selectedElement.id,
    value: 42
  });
  
  editor.command.execute(command);
});
```

## Command Execution

### Basic Execution

```typescript
const command = new MyCommand(args);
await editor.command.execute(command);
```

### Batch Execution

Execute multiple commands as a single undoable operation:

```typescript
import { BatchCommand } from '@/lib/commands';

const commands = [
  new Command1(args1),
  new Command2(args2),
  new Command3(args3)
];

const batch = new BatchCommand(commands);
await editor.command.execute(batch);
```

When undone, all commands in the batch are undone in reverse order.

## Command Manager API

The `CommandManager` provides the following methods:

### `execute(command: Command): Promise<void>`

Executes a command and adds it to the undo stack:

```typescript
await editor.command.execute(command);
```

### `undo(): Promise<void>`

Undoes the last command:

```typescript
await editor.command.undo();
```

### `redo(): Promise<void>`

Redoes the last undone command:

```typescript
await editor.command.redo();
```

### `canUndo(): boolean`

Returns whether there are commands to undo:

```typescript
if (editor.command.canUndo()) {
  await editor.command.undo();
}
```

### `canRedo(): boolean`

Returns whether there are commands to redo:

```typescript
if (editor.command.canRedo()) {
  await editor.command.redo();
}
```

### `clear(): void`

Clears the undo/redo history:

```typescript
editor.command.clear();
```

## Best Practices

### 1. Save Minimal State

Only save what's necessary to undo the operation:

```typescript
// Good - only save what changed
this.previousValue = element.value;

// Bad - saves entire element
this.previousElement = { ...element };
```

### 2. Handle Async Operations

Commands can be async. Use `await` when needed:

```typescript
async execute() {
  this.previousState = await fetchCurrentState();
  await applyChanges();
}
```

### 3. Validate Before Execution

Validate inputs in the constructor or execute method:

```typescript
constructor(args: MyArgs) {
  super();
  if (!args.elementId) {
    throw new Error('elementId is required');
  }
  this.args = args;
}
```

### 4. Use Batch Commands for Multi-Step Operations

When an operation involves multiple state changes, use `BatchCommand`:

```typescript
const commands = [
  new RemoveElementCommand({ id: oldId }),
  new AddElementCommand({ element: newElement })
];

await editor.command.execute(new BatchCommand(commands));
```

### 5. Don't Mutate State Directly

Always go through the appropriate manager:

```typescript
// Good
editor.timeline.updateElement(id, changes);

// Bad - bypasses event system
element.value = newValue;
```

## Common Patterns

### Pattern 1: Simple Property Update

```typescript
class UpdatePropertyCommand extends Command {
  private previousValue: any;
  
  async execute() {
    const element = getElement(this.elementId);
    this.previousValue = element[this.property];
    updateElement(this.elementId, { [this.property]: this.value });
  }
  
  async undo() {
    updateElement(this.elementId, { [this.property]: this.previousValue });
  }
}
```

### Pattern 2: Add/Remove Item

```typescript
class AddItemCommand extends Command {
  async execute() {
    addItem(this.item);
  }
  
  async undo() {
    removeItem(this.item.id);
  }
}

class RemoveItemCommand extends Command {
  private removedItem: Item;
  
  async execute() {
    this.removedItem = getItem(this.itemId);
    removeItem(this.itemId);
  }
  
  async undo() {
    addItem(this.removedItem);
  }
}
```

### Pattern 3: Complex State Change

```typescript
class ComplexOperationCommand extends Command {
  private snapshot: StateSnapshot;
  
  async execute() {
    // Save complete state snapshot
    this.snapshot = createSnapshot();
    
    // Perform complex operation
    performComplexOperation(this.args);
  }
  
  async undo() {
    // Restore from snapshot
    restoreSnapshot(this.snapshot);
  }
}
```

### Pattern 4: Conditional Execution

```typescript
class ConditionalCommand extends Command {
  private wasExecuted = false;
  
  async execute() {
    if (!shouldExecute(this.args)) {
      return; // Skip execution
    }
    
    this.wasExecuted = true;
    this.previousState = getCurrentState();
    applyChanges(this.args);
  }
  
  async undo() {
    if (!this.wasExecuted) {
      return; // Nothing to undo
    }
    
    restoreState(this.previousState);
  }
}
```

## Timeline Commands

Common timeline commands:

- **`AddTrackCommand`**: Add a new track
- **`RemoveTrackCommand`**: Remove a track
- **`AddElementCommand`**: Add element to timeline
- **`RemoveElementCommand`**: Remove element from timeline
- **`MoveElementCommand`**: Move element position/track
- **`ResizeElementCommand`**: Change element duration
- **`SplitElementCommand`**: Split element at time
- **`TrimElementCommand`**: Trim element start/end
- **`DuplicateElementCommand`**: Duplicate element
- **`GroupElementsCommand`**: Group multiple elements
- **`UngroupElementsCommand`**: Ungroup elements

## Scene Commands

Common scene commands:

- **`AddSceneElementCommand`**: Add element to scene
- **`RemoveSceneElementCommand`**: Remove element from scene
- **`UpdateSceneElementCommand`**: Update element properties
- **`MoveSceneElementCommand`**: Change element position
- **`ResizeSceneElementCommand`**: Change element size
- **`RotateSceneElementCommand`**: Rotate element
- **`UpdateTextCommand`**: Update text content
- **`UpdateStyleCommand`**: Update element style

## Media Commands

Common media commands:

- **`AddMediaCommand`**: Add media to library
- **`RemoveMediaCommand`**: Remove media from library
- **`UpdateMediaMetadataCommand`**: Update media metadata

## Project Commands

Common project commands:

- **`UpdateProjectSettingsCommand`**: Update project settings
- **`UpdateExportSettingsCommand`**: Update export configuration

## Debugging Commands

### Enable Command Logging

Add logging to track command execution:

```typescript
async execute() {
  console.log(`Executing ${this.constructor.name}`, this.args);
  // ... rest of execute
}

async undo() {
  console.log(`Undoing ${this.constructor.name}`);
  // ... rest of undo
}
```

### Inspect Command History

Access the command manager's history:

```typescript
const history = editor.command.getHistory(); // If implemented
console.log('Undo stack:', history.undoStack);
console.log('Redo stack:', history.redoStack);
```

## Testing Commands

### Unit Test Example

```typescript
describe('MyCommand', () => {
  let editor: EditorCore;
  
  beforeEach(() => {
    editor = EditorCore.getInstance();
  });
  
  it('should execute and undo correctly', async () => {
    const initialValue = editor.timeline.getElement('id').value;
    
    const command = new MyCommand({ elementId: 'id', value: 42 });
    await command.execute();
    
    expect(editor.timeline.getElement('id').value).toBe(42);
    
    await command.undo();
    
    expect(editor.timeline.getElement('id').value).toBe(initialValue);
  });
});
```

## Relationship with Actions

Commands and actions work together:

1. **Action**: What the user wants to do ("split clip")
2. **Command**: How to do it (and undo it)

```typescript
// Action handler
useActionHandler('split-selected', () => {
  const elements = editor.selection.getSelected();
  const time = editor.playback.getCurrentTime();
  
  // Create and execute command
  const command = new SplitElementsCommand({ elements, time });
  editor.command.execute(command);
});
```

See [Actions System](./actions.md) for more details on the action layer.
