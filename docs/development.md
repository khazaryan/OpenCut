# Development Workflow

This guide covers development best practices, workflows, and conventions for contributing to OpenCut.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/docs/installation) v1.2.18+
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (optional)
- Node.js 18+ (for compatibility)

### Initial Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/opencut.git
cd opencut
```

2. **Copy environment file**

```bash
cp apps/web/.env.example apps/web/.env.local
```

3. **Start database and Redis** (optional)

```bash
docker compose up -d db redis serverless-redis-http
```

4. **Install dependencies**

```bash
bun install
```

5. **Start development server**

```bash
bun dev:web
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Project Scripts

### Root Level

```bash
# Development
bun dev:web              # Start web app in dev mode
bun dev:tools            # Start tools app in dev mode

# Building
bun build:web            # Build web app for production
bun build:tools          # Build tools app

# Linting & Formatting
bun lint:web             # Lint web app
bun lint:web:fix         # Lint and fix web app
bun format:web           # Format web app code

# Testing
bun test                 # Run tests

# Database
cd apps/web
bun db:generate          # Generate migrations
bun db:migrate           # Run migrations
bun db:push:local        # Push schema to local DB
bun db:push:prod         # Push schema to production DB
```

### Web App

```bash
cd apps/web

# Development
bun dev                  # Start dev server

# Building
bun build                # Build for production
bun start                # Start production server

# Code Quality
bun lint                 # Lint code
bun lint:fix             # Lint and fix
bun format               # Format code
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/my-feature
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `chore/` - Maintenance tasks

### 2. Make Changes

Follow the coding conventions and patterns described in this documentation.

### 3. Test Your Changes

```bash
# Run tests
bun test

# Lint code
bun lint:web

# Format code
bun format:web
```

### 4. Commit Changes

Use conventional commit messages:

```bash
git commit -m "feat: add timeline zoom controls"
git commit -m "fix: resolve playback sync issue"
git commit -m "docs: update architecture documentation"
```

Commit types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

### 5. Push and Create PR

```bash
git push origin feature/my-feature
```

Then create a Pull Request on GitHub.

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` type - use `unknown` or proper types
- Use interfaces for object shapes
- Use type aliases for unions and primitives

```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

// Avoid
const user: any = { ... };
```

### Naming Conventions

- **Components**: PascalCase (`MyComponent.tsx`)
- **Functions**: camelCase (`myFunction`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_DURATION`)
- **Types/Interfaces**: PascalCase (`MyType`, `IMyInterface`)
- **Files**: kebab-case (`my-component.tsx`)

### File Organization

```typescript
// 1. Imports - external first, then internal
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// 2. Types/Interfaces
interface Props {
  title: string;
}

// 3. Constants
const MAX_ITEMS = 100;

// 4. Component
export function MyComponent({ title }: Props) {
  // 4a. Hooks
  const [count, setCount] = useState(0);
  
  // 4b. Derived state
  const isMax = count >= MAX_ITEMS;
  
  // 4c. Event handlers
  const handleClick = () => {
    setCount(count + 1);
  };
  
  // 4d. Render
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={handleClick}>Count: {count}</button>
    </div>
  );
}

// 5. Helper functions (if needed)
function helperFunction() {
  // ...
}
```

### Formatting

Use Biome for consistent formatting:

```bash
bun format:web
```

Configuration is in `biome.json`.

## Adding New Features

### Adding an Action

See [Actions System](./actions.md) for detailed instructions.

**Quick steps:**

1. Add to `src/lib/actions/definitions.ts`
2. Add handler in `src/hooks/actions/use-editor-actions.ts`
3. Add types in `src/lib/actions/types.ts` (if needed)

### Adding a Command

See [Commands System](./commands.md) for detailed instructions.

**Quick steps:**

1. Create command class in `src/lib/commands/[domain]/`
2. Export from `src/lib/commands/index.ts`
3. Use in action handler

### Adding a Manager Method

1. Add method to appropriate manager in `src/core/managers/`
2. Emit change event if state changes
3. Update TypeScript types

```typescript
// src/core/managers/timeline-manager.ts
export class TimelineManager extends EventEmitter {
  myNewMethod(args: Args) {
    // Update state
    this.state.something = args.value;
    
    // Emit change event
    this.emit('change');
  }
}
```

### Adding a Component

See [Component System](./components.md) for detailed instructions.

**Quick steps:**

1. Create component in `src/components/[category]/`
2. Use `useEditor()` hook for editor access
3. Use `invokeAction()` for user operations
4. Style with TailwindCSS

## Testing

### Unit Tests

Test individual functions and components:

```typescript
import { describe, it, expect } from 'bun:test';
import { myFunction } from './my-function';

describe('myFunction', () => {
  it('should return correct value', () => {
    expect(myFunction(5)).toBe(10);
  });
});
```

### Component Tests

Test React components:

```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Integration Tests

Test interactions between systems:

```typescript
describe('Timeline Integration', () => {
  it('should add element when dropped', async () => {
    const editor = EditorCore.getInstance();
    
    // Perform action
    await editor.timeline.addElement({ ... });
    
    // Verify result
    const elements = editor.timeline.getElements();
    expect(elements).toHaveLength(1);
  });
});
```

## Debugging

### Browser DevTools

Use React DevTools and browser console for debugging:

```typescript
// Add debug logging
console.log('Current state:', editor.timeline.getState());

// Use debugger
debugger;
```

### Editor State Inspection

Access editor state in console:

```typescript
// In browser console
const editor = window.__EDITOR_CORE__;
console.log(editor.timeline.getTracks());
console.log(editor.playback.getCurrentTime());
```

### Command History

Inspect undo/redo history:

```typescript
console.log(editor.command.canUndo());
console.log(editor.command.canRedo());
```

## Performance

### Profiling

Use React DevTools Profiler to identify performance issues:

1. Open React DevTools
2. Go to Profiler tab
3. Click record
4. Perform actions
5. Stop recording
6. Analyze flame graph

### Optimization Tips

1. **Memoize expensive computations**
```typescript
const result = useMemo(() => expensiveCalculation(data), [data]);
```

2. **Memoize callbacks**
```typescript
const handleClick = useCallback(() => {
  doSomething();
}, []);
```

3. **Use React.memo for pure components**
```typescript
export const MyComponent = memo(function MyComponent(props) {
  return <div>{props.value}</div>;
});
```

4. **Virtualize long lists**
```typescript
import { FixedSizeList } from 'react-window';
```

5. **Lazy load heavy components**
```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

## Database

### Migrations

Generate migrations after schema changes:

```bash
cd apps/web
bun db:generate
```

Apply migrations:

```bash
bun db:migrate
```

Push schema directly (development only):

```bash
bun db:push:local
```

### Drizzle Studio

Explore database with Drizzle Studio:

```bash
cd apps/web
bunx drizzle-kit studio
```

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/opencut

# Auth
BETTER_AUTH_SECRET=your-secret-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Redis (optional)
UPSTASH_REDIS_REST_URL=http://localhost:8079
UPSTASH_REDIS_REST_TOKEN=example_token
```

### Optional Variables

```bash
# CMS
NEXT_PUBLIC_MARBLE_API_URL=https://api.marblecms.com
MARBLE_WORKSPACE_KEY=your-workspace-key

# Sound Library
FREESOUND_CLIENT_ID=your-client-id
FREESOUND_API_KEY=your-api-key

# Storage
CLOUDFLARE_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name

# Transcription
MODAL_TRANSCRIPTION_URL=your-transcription-url
```

## Common Tasks

### Adding a New Page

1. Create file in `src/app/[route]/page.tsx`
2. Export default component
3. Add metadata

```typescript
// src/app/my-page/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Page',
  description: 'Page description'
};

export default function MyPage() {
  return <div>My Page</div>;
}
```

### Adding a New API Route

1. Create file in `src/app/api/[route]/route.ts`
2. Export HTTP method handlers

```typescript
// src/app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Hello' });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({ received: body });
}
```

### Adding a Database Table

1. Define schema in `src/lib/db/schema.ts`

```typescript
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const myTable = pgTable('my_table', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});
```

2. Generate migration

```bash
bun db:generate
```

3. Apply migration

```bash
bun db:migrate
```

### Adding a Zustand Store

1. Create store in `src/stores/`

```typescript
// src/stores/my-store.ts
import { create } from 'zustand';

interface MyStore {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useMyStore = create<MyStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 }))
}));
```

2. Use in component

```typescript
import { useMyStore } from '@/stores/my-store';

export function MyComponent() {
  const { count, increment } = useMyStore();
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

## Troubleshooting

### Common Issues

**Issue: Port already in use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Issue: Database connection failed**
```bash
# Restart Docker containers
docker compose restart db
```

**Issue: Module not found**
```bash
# Clear cache and reinstall
rm -rf node_modules bun.lock
bun install
```

**Issue: TypeScript errors**
```bash
# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P -> "TypeScript: Restart TS Server"
```

## Best Practices

1. **Follow the architecture**: Use EditorCore → Managers → Actions → Commands
2. **Use TypeScript**: Type everything properly
3. **Write tests**: Test your code before submitting
4. **Keep components small**: Single responsibility principle
5. **Avoid prop drilling**: Use context or composition
6. **Memoize when needed**: Prevent unnecessary re-renders
7. **Handle errors**: Always handle error cases
8. **Document complex logic**: Add comments for non-obvious code
9. **Use semantic HTML**: Improve accessibility
10. **Follow naming conventions**: Consistent naming across the codebase

## Code Review Checklist

Before submitting a PR, ensure:

- [ ] Code follows TypeScript best practices
- [ ] All tests pass
- [ ] Code is properly formatted (run `bun format:web`)
- [ ] No linting errors (run `bun lint:web`)
- [ ] Components use `useEditor()` hook
- [ ] User actions use `invokeAction()`
- [ ] State changes use commands for undo/redo
- [ ] New features have tests
- [ ] Documentation is updated if needed
- [ ] No console errors or warnings
- [ ] Accessibility is considered
- [ ] Performance is acceptable

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs)
- [Bun Documentation](https://bun.sh/docs)

## Getting Help

- **GitHub Issues**: Report bugs or request features
- **GitHub Discussions**: Ask questions and share ideas
- **Discord**: Join our community (if available)
- **Documentation**: Check this docs folder first

## Contributing Guidelines

See [.github/CONTRIBUTING.md](../.github/CONTRIBUTING.md) for detailed contribution guidelines.

### Focus Areas

**Good to contribute:**
- Timeline functionality
- Project management
- Performance optimizations
- Bug fixes
- UI improvements (outside preview panel)

**Avoid for now:**
- Preview panel enhancements (fonts, stickers, effects)
- Export functionality (being refactored)
