# Actions System

Actions are the trigger layer for user-initiated operations. They connect keyboard shortcuts, UI buttons, and context menus to editor functionality.

## Overview

The actions system provides a unified interface for all user-triggered operations in OpenCut. Instead of calling editor methods directly from UI components, you invoke actions that:

1. **Validate** the operation
2. **Execute** the appropriate command
3. **Provide feedback** (toasts, error messages)
4. **Support keyboard shortcuts** automatically

## Action Flow

```
User Input (keyboard/button/menu)
    ↓
invokeAction('action-name', args?)
    ↓
Action Handler (useActionHandler)
    ↓
Validation & Feedback
    ↓
Command Execution (if state-changing)
    ↓
Editor State Update
```

## Adding a New Action

### Step 1: Define the Action

Add an entry to the `ACTIONS` object in `src/lib/actions/definitions.ts`:

```typescript
export const ACTIONS = {
  // ... existing actions ...
  
  "my-action": {
    description: "What the action does",
    category: "editing",           // playback | navigation | editing | selection | history | timeline | controls
    defaultShortcuts: ["ctrl+m"],  // optional - keyboard shortcuts
    args: { someValue: "number" }, // optional - only if it takes args
  },
};
```

**Categories:**
- `playback` - Playback controls (play, pause, seek)
- `navigation` - Navigation (zoom, scroll, focus)
- `editing` - Editing operations (cut, copy, paste, split)
- `selection` - Selection operations (select all, deselect)
- `history` - Undo/redo operations
- `timeline` - Timeline operations (add track, remove track)
- `controls` - General controls (save, export)

### Step 2: Register the Handler

Add the handler in `src/hooks/actions/use-editor-actions.ts`:

```typescript
useActionHandler(
  "my-action",
  () => {
    // Validate
    if (!canPerformAction()) {
      toast.error("Cannot perform action");
      return;
    }
    
    // Create and execute command
    const command = new MyCommand({ value: someValue });
    editor.command.execute(command);
    
    // Optional: Show success feedback
    toast.success("Action completed");
  },
  undefined, // isActive: MutableRefObject<boolean> | boolean | undefined
);
```

### Step 3: Register Argument Types (if needed)

Only required if your action accepts arguments. Add to `src/lib/actions/types.ts`:

```typescript
export type TActionArgsMap = {
  // ... existing actions ...
  "my-action": { someValue: number } | undefined; // | undefined = optional args
};
```

## Invoking Actions

### From UI Components

Use `invokeAction()` for any user-triggered operation:

```typescript
import { invokeAction } from "@/lib/actions";

// Simple action
<Button onClick={() => invokeAction("play-pause")}>
  Play/Pause
</Button>

// Action with arguments
<Button onClick={() => invokeAction("seek-forward", { seconds: 5 })}>
  Skip 5s
</Button>

// Action in event handler
const handleSplit = () => {
  invokeAction("split-selected");
};
```

### Why Use Actions?

**Good - Uses action system:**
```typescript
const handleDelete = () => invokeAction("delete-selected");
```

**Avoid - Bypasses UX layer:**
```typescript
const handleDelete = () => editor.timeline.deleteElements(selectedIds);
```

Benefits of using actions:
- ✅ Automatic keyboard shortcut support
- ✅ Consistent validation and error handling
- ✅ User feedback (toasts, notifications)
- ✅ Centralized operation logic
- ✅ Easier to test and maintain

## Action Handler Parameters

### `useActionHandler(actionId, handler, isActive?)`

**Parameters:**

1. **`actionId`** (string): The action identifier from `ACTIONS`
2. **`handler`** (function): The function to execute when action is invoked
3. **`isActive`** (optional): Controls when the handler is active

### The `isActive` Parameter

Controls when the action handler is active:

**`undefined`** - Always active (default):
```typescript
useActionHandler("save-project", () => {
  editor.project.save();
});
```

**`boolean`** - Statically enabled/disabled:
```typescript
useActionHandler("export-video", () => {
  startExport();
}, canExport); // Only active if canExport is true
```

**`MutableRefObject<boolean>`** - Reactive, toggled at runtime:
```typescript
const isPanelFocused = useRef(false);

useActionHandler("panel-specific-action", () => {
  doSomething();
}, isPanelFocused); // Only active when panel is focused
```

## Action Categories

### Playback Actions

Control video playback:

```typescript
invokeAction("play-pause");
invokeAction("play");
invokeAction("pause");
invokeAction("seek-forward", { seconds: 5 });
invokeAction("seek-backward", { seconds: 5 });
invokeAction("seek-to-start");
invokeAction("seek-to-end");
```

### Editing Actions

Edit timeline content:

```typescript
invokeAction("split-selected");
invokeAction("delete-selected");
invokeAction("duplicate-selected");
invokeAction("cut-selected");
invokeAction("copy-selected");
invokeAction("paste");
```

### Selection Actions

Manage element selection:

```typescript
invokeAction("select-all");
invokeAction("deselect-all");
invokeAction("select-next");
invokeAction("select-previous");
```

### History Actions

Undo/redo operations:

```typescript
invokeAction("undo");
invokeAction("redo");
```

### Timeline Actions

Manage timeline structure:

```typescript
invokeAction("add-track", { type: "video" });
invokeAction("remove-track", { trackId: "track-1" });
invokeAction("zoom-in");
invokeAction("zoom-out");
```

## Keyboard Shortcuts

### Default Shortcuts

Shortcuts are defined in action definitions:

```typescript
"play-pause": {
  description: "Play or pause playback",
  category: "playback",
  defaultShortcuts: ["space", "k"],
},
```

### Custom Shortcuts

Users can customize shortcuts through the keyboard shortcuts settings panel. Shortcuts are stored in the `keybindings-store`.

### Shortcut Modifiers

Supported modifiers:
- `ctrl` - Control key
- `shift` - Shift key
- `alt` - Alt/Option key
- `meta` - Command (Mac) / Windows key

Examples:
```typescript
defaultShortcuts: ["ctrl+s"]        // Ctrl+S
defaultShortcuts: ["ctrl+shift+s"]  // Ctrl+Shift+S
defaultShortcuts: ["meta+z"]        // Cmd+Z (Mac) / Win+Z (Windows)
```

## Advanced Patterns

### Conditional Actions

Execute different logic based on conditions:

```typescript
useActionHandler("context-menu-action", () => {
  const selected = editor.selection.getSelected();
  
  if (selected.length === 0) {
    toast.error("No elements selected");
    return;
  }
  
  if (selected.length === 1) {
    // Single element action
    handleSingleElement(selected[0]);
  } else {
    // Multiple elements action
    handleMultipleElements(selected);
  }
});
```

### Async Actions

Handle asynchronous operations:

```typescript
useActionHandler("export-video", async () => {
  try {
    toast.info("Starting export...");
    await editor.project.export();
    toast.success("Export completed!");
  } catch (error) {
    toast.error("Export failed");
    console.error(error);
  }
});
```

### Actions with Confirmation

Require user confirmation for destructive actions:

```typescript
useActionHandler("delete-all", () => {
  if (confirm("Are you sure you want to delete all elements?")) {
    const command = new DeleteAllCommand();
    editor.command.execute(command);
  }
});
```

### Batch Actions

Execute multiple commands as one action:

```typescript
useActionHandler("apply-preset", () => {
  const commands = [
    new UpdatePropertyCommand({ property: "opacity", value: 0.8 }),
    new UpdatePropertyCommand({ property: "scale", value: 1.2 }),
    new UpdatePropertyCommand({ property: "rotation", value: 45 }),
  ];
  
  const batch = new BatchCommand(commands);
  editor.command.execute(batch);
});
```

## Testing Actions

### Unit Test Example

```typescript
import { invokeAction } from '@/lib/actions';
import { EditorCore } from '@/core';

describe('Actions', () => {
  let editor: EditorCore;
  
  beforeEach(() => {
    editor = EditorCore.getInstance();
  });
  
  it('should execute split action', () => {
    // Setup
    editor.timeline.addElement({ id: 'el-1', duration: 10 });
    editor.selection.select(['el-1']);
    editor.playback.seek(5);
    
    // Execute action
    invokeAction('split-selected');
    
    // Verify
    const elements = editor.timeline.getElements();
    expect(elements).toHaveLength(2);
  });
});
```

## Best Practices

1. **Always use actions for user operations**: Don't call editor methods directly from UI
2. **Provide feedback**: Show toasts or notifications for important actions
3. **Validate before executing**: Check if action can be performed
4. **Handle errors gracefully**: Catch and display errors to users
5. **Use descriptive action IDs**: Make action names clear and consistent
6. **Group related actions**: Use categories to organize actions
7. **Document complex actions**: Add comments for non-obvious logic
8. **Test your actions**: Write tests for action handlers
9. **Keep handlers focused**: Each action should do one thing well
10. **Use commands for state changes**: Wrap state changes in commands for undo/redo

## Debugging Actions

### Log Action Invocations

Add logging to track action calls:

```typescript
// In invokeAction function
console.log(`Invoking action: ${actionId}`, args);
```

### Inspect Action Registry

Check registered actions:

```typescript
import { getRegisteredActions } from '@/lib/actions/registry';

console.log(getRegisteredActions());
```

### Test Actions in Console

Invoke actions from browser console:

```typescript
// Make invokeAction available globally (dev only)
window.invokeAction = invokeAction;

// Then in console:
invokeAction('play-pause');
invokeAction('split-selected');
```

## Common Patterns

### Pattern 1: Simple Action

```typescript
useActionHandler("simple-action", () => {
  editor.doSomething();
});
```

### Pattern 2: Action with Validation

```typescript
useActionHandler("validated-action", () => {
  if (!isValid()) {
    toast.error("Cannot perform action");
    return;
  }
  
  performAction();
});
```

### Pattern 3: Action with Command

```typescript
useActionHandler("command-action", () => {
  const command = new MyCommand(args);
  editor.command.execute(command);
});
```

### Pattern 4: Action with Feedback

```typescript
useActionHandler("feedback-action", async () => {
  try {
    await performAsyncOperation();
    toast.success("Success!");
  } catch (error) {
    toast.error("Failed!");
  }
});
```

## Related Documentation

- [Commands System](./commands.md) - How commands work with actions
- [Architecture](./architecture.md) - Overall system architecture
- [Component System](./components.md) - Using actions in components
