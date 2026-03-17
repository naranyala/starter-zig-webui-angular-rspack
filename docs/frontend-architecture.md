# Frontend Architecture

This document describes the Angular frontend application structure and architecture.

## Overview

The frontend is built with:

- **Framework**: Angular 21
- **Bundler**: Rspack
- **Package Manager**: Bun
- **Language**: TypeScript

## Project Structure

```
frontend/
├── src/
│   ├── main.ts                 # Application bootstrap
│   ├── index.html              # Main HTML template
│   ├── styles.css              # Global styles
│   │
│   ├── core/                   # Core services
│   │   ├── api.service.ts      # Backend communication
│   │   ├── webui-bridge.service.ts  # WebUI bridge wrapper
│   │   ├── websocket.service.ts     # WebSocket client
│   │   ├── logger.service.ts   # Logging service
│   │   ├── config.service.ts   # Configuration service
│   │   └── ...
│   │
│   ├── views/                  # Components and views
│   │   ├── app.component.ts    # Root component
│   │   ├── app.component.html  # Root template
│   │   └── ...
│   │
│   ├── models/                 # Data models
│   │   └── *.ts
│   │
│   └── types/                  # Type definitions
│       └── *.ts
│
├── angular.json                # Angular configuration
├── rspack.config.js            # Rspack bundler config
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
└── biome.json                  # Linter config
```

## Core Modules

### App Module

The root Angular module that bootstraps the application.

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './views/app.component';

bootstrapApplication(AppComponent).catch(err => console.error(err));
```

### Core Services

Services in the `core/` directory provide application-wide functionality.

#### ApiService

Handles communication with the Zig backend via WebUI bridge.

```typescript
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiService {
  async call<T>(functionName: string, args: unknown[] = []): Promise<T> {
    const backendFn = (window as any)[functionName];
    return backendFn(...args);
  }
  
  async callOrThrow<T>(functionName: string, args: unknown[] = []): Promise<T> {
    const result = await this.call<T>(functionName, args);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }
}
```

#### WebuiBridgeService

Wraps WebUI bridge functionality with Angular signals.

```typescript
@Injectable({ providedIn: 'root' })
export class WebuiBridgeService {
  private readonly connected = signal(false);
  readonly isConnected = this.connected.asReadonly();
  
  async call<T>(functionName: string, args: unknown[] = []): Promise<T> {
    // Implementation
  }
  
  onEvent(event: string, handler: (data: unknown) => void): () => void {
    // Implementation
  }
}
```

#### WebSocketService

Provides pure WebSocket communication for real-time features.

```typescript
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  connect(url: string): void {
    this.ws = new WebSocket(url);
  }
  
  async request<T>(method: string, params?: unknown): Promise<T> {
    // Request/Response pattern
  }
  
  onEvent(topic: string, callback: (data: unknown) => void): () => void {
    // Event subscription
  }
}
```

## Component Architecture

### Component Structure

```typescript
import { Component, signal, inject } from '@angular/core';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
  standalone: true,
})
export class ExampleComponent {
  private readonly api = inject(ApiService);
  
  // State with signals
  readonly data = signal<Data | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  
  async loadData() {
    this.loading.set(true);
    try {
      const result = await this.api.callOrThrow<Data>('getData');
      this.data.set(result);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      this.loading.set(false);
    }
  }
}
```

### Template Example

```html
<div class="example-container">
  @if (loading()) {
    <div class="loading">Loading...</div>
  } @else if (error()) {
    <div class="error">{{ error() }}</div>
  } @else if (data()) {
    <div class="content">
      <h2>{{ data().title }}</h2>
      <p>{{ data().description }}</p>
    </div>
  }
</div>
```

## State Management

### Signals

Angular signals are used for reactive state management.

```typescript
// Mutable signal
const count = signal(0);

// Update value
count.set(1);
count.update(c => c + 1);

// Read value
console.log(count());

// Computed signal
const double = computed(() => count() * 2);
```

### Service State

Services maintain application state using signals.

```typescript
@Injectable({ providedIn: 'root' })
export class StateService {
  private readonly state = signal<AppState>({
    user: null,
    settings: defaultSettings,
  });
  
  readonly user = computed(() => this.state().user);
  readonly settings = computed(() => this.state().settings);
  
  setUser(user: User) {
    this.state.update(s => ({ ...s, user }));
  }
}
```

## Routing

### Route Configuration

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./views/home.component'),
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
```

## Styling

### Global Styles

Defined in `src/styles.css`:

```css
/* Global variables */
:root {
  --primary-color: #1976d2;
  --background-color: #f5f5f5;
}

/* Reset */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Base styles */
body {
  font-family: system-ui, -apple-system, sans-serif;
  background-color: var(--background-color);
}
```

### Component Styles

Each component can have its own styles:

```css
/* example.component.css */
.container {
  padding: 16px;
}

.title {
  color: var(--primary-color);
  font-size: 24px;
}
```

## Build Configuration

### Rspack Configuration

Key settings in `rspack.config.js`:

```javascript
module.exports = {
  entry: './src/main.ts',
  output: {
    path: path.resolve(__dirname, 'dist/browser'),
    filename: '[name].[contenthash].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@views': path.resolve(__dirname, 'src/views'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'esbuild-loader',
      },
    ],
  },
};
```

### TypeScript Configuration

Key settings in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "experimentalDecorators": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
  }
}
```

## Development

### Commands

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build:rspack

# Run tests
bun test

# Lint code
bun run lint

# Format code
bun run format:fix
```

## Testing

### Unit Tests

```typescript
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  
  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiService);
  });
  
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
```

## Best Practices

1. **Use Standalone Components**: Prefer standalone over NgModules
2. **Use Signals**: Prefer signals over RxJS for state
3. **Inject Dependencies**: Use `inject()` over constructor injection
4. **Type Safety**: Always use TypeScript types
5. **Error Handling**: Handle errors gracefully with user feedback
6. **Lazy Loading**: Lazy load routes and components
7. **Code Splitting**: Use dynamic imports for large modules

## Related Documentation

- [Communication](communication.md)
- [Build System](build-system.md)
- [Backend Architecture](backend-architecture.md)
