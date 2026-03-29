# Developer Experience (DX) Improvement Plan

## Current Pain Points Analysis

### 1. **Slow Build Times** 🐌
- **Frontend**: ~25 seconds for full build
- **Backend**: C compilation (sqlite3.c, webui.c) adds ~15-20 seconds
- **Full rebuild**: ~40-50 seconds total
- **Problem**: Every code change requires full rebuild cycle

### 2. **Heavy Dependencies** 📦
- **node_modules**: 1185 packages, ~500MB
- **Bundle size**: 825KB (main.js), 217KB estimated transfer
- **Problem**: Slow installs, large download, memory intensive

### 3. **Complex Build Orchestration** 🔧
- **run.sh**: 366 lines, builds everything every time
- **No incremental builds**: Frontend rebuilds even for backend changes
- **No parallel builds**: Sequential frontend → backend
- **Problem**: Wasted time rebuilding unchanged components

### 4. **Poor Development Workflow** 😓
- **No hot reload**: Must restart app for every change
- **No watch mode**: Manual rebuild triggers
- **No dev server**: Can't test frontend independently
- **Problem**: High friction for iterative development

### 5. **Testing Friction** 🧪
- **Backend**: Only 1 test, no test runner integration
- **Frontend**: Playwright requires browser, slow E2E
- **No unit test culture**: Tests not integrated into workflow
- **Problem**: Developers skip testing

---

## Recommended Improvements (Prioritized)

### 🚀 Phase 1: Quick Wins (1-2 days)

#### 1.1 Add Watch Mode for Development

**Problem**: Manual rebuilds for every change

**Solution**: Add file watching with automatic rebuilds

```bash
# New commands
./run.sh watch          # Watch both frontend and backend
./run.sh watch:frontend # Watch frontend only
./run.sh watch:backend  # Watch backend only
```

**Implementation**:
- Frontend: `bun run rspack serve --watch`
- Backend: `zig build --watch` (Zig 0.14+)

---

#### 1.2 Parallel Builds

**Problem**: Sequential builds waste time

**Solution**: Build frontend and backend in parallel

```bash
# Current: ~45 seconds
frontend build (25s) → backend build (20s) = 45s total

# Parallel: ~25 seconds
frontend build (25s) ↘
                      → 25s total
backend build (20s) ↗
```

**Implementation**: Update `run.sh` to use background processes

---

#### 1.3 Incremental Build Detection

**Problem**: Rebuilding unchanged components

**Solution**: Only rebuild what changed

```bash
# Check if frontend changed
if [ frontend/src/**/* newer than dist/**/* ]; then
    build_frontend
fi

# Check if backend changed  
if [ src/**/* newer than zig-out/**/* ]; then
    build_backend
fi
```

---

#### 1.4 Lightweight Frontend for Development

**Problem**: Full Angular build is slow for backend development

**Solution**: Create minimal HTML/JS stub for backend-only work

```html
<!-- frontend/dev-stub/index.html -->
<!DOCTYPE html>
<html>
<head><title>Dev Mode</title></head>
<body>
    <h1>Backend Dev Mode</h1>
    <div id="output"></div>
    <script>
        // Minimal WebUI bridge for testing
        async function call(fn, ...args) {
            return await window[fn](...args);
        }
    </script>
</body>
</html>
```

**Usage**:
```bash
./run.sh --backend-only  # Use stub, skip Angular build
```

**Time saved**: 25 seconds per backend-only iteration

---

### ⚡ Phase 2: Medium Improvements (1 week)

#### 2.1 Hot Module Replacement (HMR)

**Problem**: Full page reload on every change

**Solution**: Enable Rspack HMR for instant updates

```javascript
// rspack.config.js
devServer: {
  hot: true,      // Enable HMR
  liveReload: false, // Don't full reload
  // ...
}
```

**Benefit**: Changes appear in <1 second without full reload

---

#### 2.2 Separate Dev Dependencies

**Problem**: 1185 packages for development

**Solution**: Split into runtime + dev dependencies

```json
{
  "dependencies": {
    "@angular/core": "^21.1.5",
    "@angular/common": "^21.1.5",
    "rxjs": "~7.8.2",
    "zone.js": "~0.15.1"
  },
  "devDependencies": {
    "@angular/cli": "^21.1.4",
    "@rspack/cli": "^1.7.6",
    "typescript": "~5.9.0"
  }
}
```

**Production install** (CI/CD):
```bash
bun install --production  # Only runtime deps (~200 packages)
```

---

#### 2.3 Build Caching

**Problem**: Recompiling unchanged C libraries

**Solution**: Cache compiled static libraries

```zig
// build.zig
const sqlite_lib = b.addStaticLibrary(.{
    .name = "sqlite3",
    .target = target,
    .optimize = optimize,
    .use_llvm_cache = true, // Enable LLVM cache
});
```

**Benefit**: Second build ~5 seconds (vs 20 seconds)

---

#### 2.4 Faster Test Runner

**Problem**: Playwright E2E tests are slow (browser startup)

**Solution**: Add Vitest for fast unit tests

```bash
# Install
bun add -d vitest @vitest/ui

# Add to package.json
{
  "scripts": {
    "test:unit": "vitest",
    "test:unit:ui": "vitest --ui"
  }
}
```

**Speed**: 
- Playwright: ~5 seconds per test (browser)
- Vitest: ~50ms per test (in-memory)

---

### 🎯 Phase 3: Advanced Improvements (2-3 weeks)

#### 3.1 Micro-Frontend Architecture

**Problem**: Full Angular rebuild for small changes

**Solution**: Split into lazy-loaded feature modules

```typescript
// app.routes.ts
export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./views/home/home.component')
      .then(m => m.HomeComponent)
  },
  { 
    path: 'sqlite', 
    loadChildren: () => import('./views/sqlite/sqlite.module')
      .then(m => m.SqliteModule)
  },
];
```

**Benefit**: 
- Initial bundle: ~150KB (vs 825KB)
- Only load what you use

---

#### 3.2 Backend Code Generation

**Problem**: Manual WebUI binding boilerplate

**Solution**: Generate bindings from annotations

```zig
// Before: Manual binding
_ = webui.bind(window, "ping", handlePing);
_ = webui.bind(window, "getData", handleGetData);

// After: Auto-generated
@webui_export("ping")
fn handlePing(event: ?*webui.Event) callconv(.c) void { ... }

@webui_export("getData")  
fn handleGetData(event: ?*webui.Event) callconv(.c) void { ... }

// Build step generates all bindings
```

**Time saved**: 5-10 minutes per new endpoint

---

#### 3.3 Docker Dev Environment

**Problem**: Inconsistent dev environments

**Solution**: Pre-configured Docker container

```dockerfile
# Dockerfile.dev
FROM zig:0.14.1
RUN apt-get install -y chromium bun
WORKDIR /app
COPY . .
CMD ["./run.sh", "dev"]
```

**Usage**:
```bash
docker-compose up dev  # Consistent environment
```

---

#### 3.4 UI Component Library

**Problem**: Building common components from scratch

**Solution**: Use Angular Material or similar

```bash
bun add @angular/material @angular/cdk
```

**Benefit**: 
- Pre-built components (tables, forms, dialogs)
- Consistent design system
- Faster prototyping

---

### 🚀 Phase 4: Enterprise Features (1-2 months)

#### 4.1 Monorepo with Nx

**Problem**: No dependency graph, rebuild everything

**Solution**: Nx monorepo tooling

```bash
bun add -d nx @nx/angular @nx/zig
```

**Benefit**:
- Affected builds (only what changed)
- Dependency graph visualization
- Distributed task execution

---

#### 4.2 Storybook for Components

**Problem**: No component documentation/isolation

**Solution**: Storybook for Angular

```bash
bun add -d storybook @storybook/angular
```

**Benefit**:
- Component catalog
- Visual testing
- Living documentation

---

#### 4.3 Performance Monitoring

**Problem**: No visibility into app performance

**Solution**: Add metrics and tracing

```zig
// Backend instrumentation
const metrics = Metrics.init();
metrics.timer("db_query", query_duration);
metrics.counter("api_calls", 1);
```

**Dashboard**: Grafana + Prometheus

---

## Implementation Priority Matrix

| Improvement | Impact | Effort | Priority |
|-------------|--------|--------|----------|
| Watch Mode | ⭐⭐⭐⭐ | ⭐ | **P0** |
| Parallel Builds | ⭐⭐⭐ | ⭐ | **P0** |
| Backend-Only Mode | ⭐⭐⭐⭐ | ⭐ | **P0** |
| Build Caching | ⭐⭐⭐ | ⭐⭐ | **P1** |
| HMR | ⭐⭐⭐⭐ | ⭐⭐ | **P1** |
| Faster Tests | ⭐⭐⭐ | ⭐⭐ | **P1** |
| Lazy Loading | ⭐⭐⭐ | ⭐⭐⭐ | **P2** |
| Code Generation | ⭐⭐ | ⭐⭐⭐ | **P2** |
| Docker Dev | ⭐⭐ | ⭐⭐ | **P2** |
| Monorepo (Nx) | ⭐⭐⭐ | ⭐⭐⭐⭐ | **P3** |

---

## Quick Start: Immediate Improvements

### Step 1: Add Watch Mode (15 minutes)

```bash
# frontend/package.json
{
  "scripts": {
    "dev": "rspack serve --watch",
    "dev:hmr": "rspack serve --hot"
  }
}
```

### Step 2: Parallel Builds (10 minutes)

```bash
# run.sh - Add parallel execution
build_frontend &
FRONTEND_PID=$!

build_backend &
BACKEND_PID=$!

wait $FRONTEND_PID
wait $BACKEND_PID
```

### Step 3: Backend-Only Mode (20 minutes)

```bash
# run.sh - Add flag
if [ "$BACKEND_ONLY" = "true" ]; then
    FRONTEND_PATH="${SCRIPT_DIR}/frontend/dev-stub"
else
    build_frontend
fi
```

### Step 4: Build Caching (30 minutes)

```bash
# Enable Zig build cache
export ZIG_GLOBAL_CACHE_DIR=/tmp/zig-cache

# Enable LLVM cache
export LLVM_CACHE_DIR=/tmp/llvm-cache
```

---

## Expected Time Savings

### Before Improvements
```
Full build cycle: 45 seconds
Daily iterations: ~50
Daily build time: 37.5 minutes
Weekly build time: 3.1 hours
```

### After Phase 1 (Quick Wins)
```
Watch mode: Instant (<1s)
Parallel builds: 25 seconds
Backend-only: 5 seconds
Daily build time: ~10 minutes
Weekly build time: 50 minutes
Time saved: 2.2 hours/week
```

### After Phase 2 (Medium)
```
HMR: <1 second
Cached builds: 5 seconds
Daily build time: ~5 minutes
Weekly build time: 25 minutes
Time saved: 2.75 hours/week
```

### After Phase 3 (Advanced)
```
Lazy loading: Faster dev server
Code gen: 5 min saved per endpoint
Docker: 30 min saved per onboarding
Weekly time saved: 4+ hours
```

---

## Metrics to Track

### Build Performance
- [ ] Initial build time
- [ ] Incremental build time
- [ ] Hot reload latency
- [ ] Cache hit rate

### Developer Productivity
- [ ] Code change → visible time
- [ ] Test execution time
- [ ] PR review cycle time
- [ ] Onboarding time

### Code Quality
- [ ] Test coverage %
- [ ] Lint errors fixed
- [ ] Bug detection time
- [ ] Technical debt ratio

---

## Next Steps

1. **Start with Phase 1** (this week)
   - Implement watch mode
   - Add parallel builds
   - Create backend-only stub

2. **Measure baseline metrics**
   - Time current build cycle
   - Count daily iterations
   - Track pain points

3. **Iterate on feedback**
   - Survey developers weekly
   - Prioritize highest-impact items
   - Remove low-value steps

4. **Phase 2+ as time permits**
   - HMR for frontend
   - Build caching
   - Faster test infrastructure

---

## Resources

### Tools
- [Rspack Dev Server](https://rspack.dev/guide/dev-server.html)
- [Zig Build System](https://ziglang.org/documentation/master/#Build-System)
- [Vitest](https://vitest.dev/)
- [Nx Monorepo](https://nx.dev/)

### Reading
- [The Developer Experience Manifesto](https://dxmanifesto.dev/)
- [Accelerate: Building and Scaling High Performing Technology Organizations](https://www.amazon.com/Accelerate-Performing-Technology-Organizations-Productivity/dp/1942788339)
- [Continuous Delivery](https://continuousdelivery.com/)

---

## Contact

For questions or suggestions, open an issue or contact the maintainers.
