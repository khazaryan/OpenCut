# Component System

This document describes the component organization and patterns used in OpenCut.

## Component Organization

Components are organized in `src/components/`:

```
components/
├── editor/                   # Editor-specific components
│   ├── timeline/            # Timeline components
│   ├── preview/             # Preview panel components
│   ├── assets/              # Asset panel components
│   ├── properties/          # Properties panel components
│   ├── toolbar/             # Toolbar components
│   └── ...
├── ui/                      # Reusable UI components
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── input.tsx
│   └── ...
├── providers/               # React context providers
│   └── editor-provider.tsx
├── header.tsx               # App header
├── footer.tsx               # App footer
└── theme-toggle.tsx         # Theme switcher
```

## Component Categories

### 1. Editor Components (`components/editor/`)

Domain-specific components for the video editor:

#### Timeline Components
- **Timeline**: Main timeline container
- **Track**: Individual track component
- **TimelineElement**: Clip/element on timeline
- **Playhead**: Current time indicator
- **TimelineRuler**: Time ruler with markers
- **TrackControls**: Track settings and controls

#### Preview Components
- **Preview**: Main preview panel
- **PreviewCanvas**: Canvas for rendering
- **PreviewControls**: Playback controls
- **PreviewOverlay**: UI overlay on preview

#### Assets Components
- **AssetsPanel**: Media library panel
- **AssetGrid**: Grid of media assets
- **AssetItem**: Individual asset card
- **AssetUpload**: Upload interface

#### Properties Components
- **PropertiesPanel**: Element properties editor
- **PropertyGroup**: Grouped properties
- **PropertyField**: Individual property input

### 2. UI Components (`components/ui/`)

Reusable, generic UI components based on Radix UI and styled with TailwindCSS:

- **Button**: Button component with variants
- **Dialog**: Modal dialog
- **DropdownMenu**: Dropdown menu
- **Input**: Text input
- **Select**: Select dropdown
- **Checkbox**: Checkbox input
- **Tooltip**: Tooltip overlay
- **Separator**: Visual separator
- **Accordion**: Collapsible sections
- **Command**: Command palette
- **Drawer**: Bottom drawer (mobile)

### 3. Providers (`components/providers/`)

React context providers for global state:

- **EditorProvider**: Provides editor instance to components

## Component Patterns

### Pattern 1: Using the Editor Hook

All editor components should use the `useEditor()` hook to access editor state:

```typescript
import { useEditor } from '@/hooks/use-editor';

export function MyComponent() {
  const editor = useEditor();
  
  // Access editor state
  const tracks = editor.timeline.getTracks();
  const isPlaying = editor.playback.isPlaying();
  
  // Call editor methods
  const handlePlay = () => {
    editor.playback.play();
  };
  
  return (
    <div>
      <button onClick={handlePlay}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <div>Tracks: {tracks.length}</div>
    </div>
  );
}
```

The hook automatically subscribes to editor changes and triggers re-renders.

### Pattern 2: Using Actions

For user-initiated operations, use `invokeAction()`:

```typescript
import { invokeAction } from '@/lib/actions';

export function Toolbar() {
  return (
    <div>
      <Button onClick={() => invokeAction('split-selected')}>
        Split
      </Button>
      <Button onClick={() => invokeAction('delete-selected')}>
        Delete
      </Button>
      <Button onClick={() => invokeAction('undo')}>
        Undo
      </Button>
    </div>
  );
}
```

### Pattern 3: Controlled Components

Use controlled components for form inputs:

```typescript
export function PropertyInput({ elementId, property }: Props) {
  const editor = useEditor();
  const element = editor.timeline.getElement(elementId);
  const value = element[property];
  
  const handleChange = (newValue: string) => {
    invokeAction('update-element-property', {
      elementId,
      property,
      value: newValue
    });
  };
  
  return (
    <Input
      value={value}
      onChange={(e) => handleChange(e.target.value)}
    />
  );
}
```

### Pattern 4: Memoization

Use `useMemo` and `useCallback` to prevent unnecessary re-renders:

```typescript
import { useMemo, useCallback } from 'react';

export function TimelineTrack({ trackId }: Props) {
  const editor = useEditor();
  
  // Memoize derived data
  const elements = useMemo(() => {
    return editor.timeline.getElementsInTrack(trackId);
  }, [editor, trackId]);
  
  // Memoize callbacks
  const handleDrop = useCallback((item: DragItem) => {
    invokeAction('add-element-to-track', {
      trackId,
      element: item.element
    });
  }, [trackId]);
  
  return (
    <div onDrop={handleDrop}>
      {elements.map(el => <Element key={el.id} element={el} />)}
    </div>
  );
}
```

### Pattern 5: Compound Components

Use compound components for complex UI:

```typescript
// Parent component
export function PropertyPanel({ children }: Props) {
  return <div className="property-panel">{children}</div>;
}

// Child components
PropertyPanel.Group = function Group({ title, children }: Props) {
  return (
    <div className="property-group">
      <h3>{title}</h3>
      {children}
    </div>
  );
};

PropertyPanel.Field = function Field({ label, children }: Props) {
  return (
    <div className="property-field">
      <label>{label}</label>
      {children}
    </div>
  );
};

// Usage
<PropertyPanel>
  <PropertyPanel.Group title="Transform">
    <PropertyPanel.Field label="X">
      <Input value={x} onChange={setX} />
    </PropertyPanel.Field>
    <PropertyPanel.Field label="Y">
      <Input value={y} onChange={setY} />
    </PropertyPanel.Field>
  </PropertyPanel.Group>
</PropertyPanel>
```

## Styling

### TailwindCSS

All components use TailwindCSS for styling:

```typescript
export function Button({ variant = 'default' }: Props) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-md font-medium transition-colors',
        variant === 'default' && 'bg-blue-500 text-white hover:bg-blue-600',
        variant === 'outline' && 'border border-gray-300 hover:bg-gray-100'
      )}
    >
      Click me
    </button>
  );
}
```

### Class Variance Authority (CVA)

For complex variants, use CVA:

```typescript
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  'px-4 py-2 rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-blue-500 text-white hover:bg-blue-600',
        outline: 'border border-gray-300 hover:bg-gray-100',
        ghost: 'hover:bg-gray-100'
      },
      size: {
        sm: 'text-sm px-3 py-1',
        md: 'text-base px-4 py-2',
        lg: 'text-lg px-6 py-3'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md'
    }
  }
);

export function Button({ variant, size, className, ...props }: Props) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

### cn() Utility

Use the `cn()` utility to merge class names:

```typescript
import { cn } from '@/lib/utils';

<div className={cn('base-class', isActive && 'active-class', className)} />
```

## Icons

### Lucide React

Use Lucide React for icons:

```typescript
import { Play, Pause, SkipForward } from 'lucide-react';

export function PlaybackControls() {
  return (
    <div>
      <Button><Play size={20} /></Button>
      <Button><Pause size={20} /></Button>
      <Button><SkipForward size={20} /></Button>
    </div>
  );
}
```

### Hugeicons

Alternative icon library:

```typescript
import { PlayIcon, PauseIcon } from '@hugeicons/react';

<Button><PlayIcon size={20} /></Button>
```

## Accessibility

### Keyboard Navigation

Ensure all interactive elements are keyboard accessible:

```typescript
export function MenuItem({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      tabIndex={0}
    >
      Menu Item
    </button>
  );
}
```

### ARIA Attributes

Use appropriate ARIA attributes:

```typescript
export function Dialog({ isOpen, onClose, title, children }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-hidden={!isOpen}
    >
      <h2 id="dialog-title">{title}</h2>
      {children}
    </div>
  );
}
```

### Focus Management

Manage focus for better UX:

```typescript
import { useRef, useEffect } from 'react';

export function Modal({ isOpen }: Props) {
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      firstFocusableRef.current?.focus();
    }
  }, [isOpen]);
  
  return (
    <div>
      <button ref={firstFocusableRef}>First Button</button>
    </div>
  );
}
```

## Performance

### React.memo

Memoize components that render frequently:

```typescript
import { memo } from 'react';

export const TimelineElement = memo(function TimelineElement({ element }: Props) {
  return <div>{element.name}</div>;
});
```

### Virtual Lists

Use virtual lists for large datasets:

```typescript
import { FixedSizeList } from 'react-window';

export function AssetGrid({ assets }: Props) {
  return (
    <FixedSizeList
      height={600}
      itemCount={assets.length}
      itemSize={120}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <AssetItem asset={assets[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

### Lazy Loading

Lazy load heavy components:

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

## Testing Components

### Unit Tests

Test component rendering and behavior:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Integration Tests

Test component interactions with editor:

```typescript
import { render, screen } from '@testing-library/react';
import { EditorProvider } from '@/components/providers/editor-provider';
import { Timeline } from './Timeline';

describe('Timeline', () => {
  it('displays tracks', () => {
    render(
      <EditorProvider>
        <Timeline />
      </EditorProvider>
    );
    
    // Test timeline rendering
    expect(screen.getByRole('region', { name: 'Timeline' })).toBeInTheDocument();
  });
});
```

## Common Components

### Button

```typescript
<Button variant="default" size="md" onClick={handleClick}>
  Click me
</Button>
```

### Dialog

```typescript
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    <DialogDescription>
      Dialog content goes here
    </DialogDescription>
  </DialogContent>
</Dialog>
```

### Dropdown Menu

```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={handleAction1}>
      Action 1
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleAction2}>
      Action 2
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Tooltip

```typescript
<Tooltip>
  <TooltipTrigger asChild>
    <Button>Hover me</Button>
  </TooltipTrigger>
  <TooltipContent>
    Tooltip text
  </TooltipContent>
</Tooltip>
```

## Best Practices

1. **Keep components small**: Each component should have a single responsibility
2. **Use TypeScript**: Always type your props and state
3. **Avoid prop drilling**: Use context or composition instead
4. **Memoize expensive computations**: Use `useMemo` and `useCallback`
5. **Handle loading and error states**: Always show feedback to users
6. **Make components accessible**: Use semantic HTML and ARIA attributes
7. **Test your components**: Write unit and integration tests
8. **Use the editor hook**: Access editor state through `useEditor()`
9. **Use actions for user operations**: Don't call editor methods directly from UI
10. **Follow naming conventions**: Use PascalCase for components, camelCase for functions
