# Development Quick Reference

## 🚀 Fast Development Commands

### Normal Development
```bash
# Full build (parallel, ~25 seconds)
./run-fast.sh dev

# Backend only (skip Angular, ~5 seconds) ⚡ FASTEST
./run-fast.sh backend-only

# Frontend only
./run-fast.sh frontend-only
```

### Watch Mode (Auto-rebuild)
```bash
# Watch both frontend and backend
./run-fast.sh watch

# Watch frontend only (HMR)
cd frontend && bun run dev

# Watch backend only
cd frontend && bun run watch
```

### Clean Build
```bash
# Clean everything and rebuild
./run-fast.sh --clean dev

# Clean Zig only
rm -rf zig-out .zig-cache && zig build

# Clean frontend only  
rm -rf frontend/dist && cd frontend && bun run build
```

---

## 📊 Build Time Comparison

| Command | Time | Use Case |
|---------|------|----------|
| `./run-fast.sh backend-only` | ~5s | Backend logic changes |
| `./run-fast.sh dev` | ~25s | Full stack changes |
| `./run-fast.sh watch` | Instant | Active development |
| `./run.sh dev` (old) | ~45s | ❌ Slow, don't use |

---

## 🔧 VS Code Setup

### Recommended Extensions
```
Zig (ziglang.vscode-zig)
Angular Language Service (angular.ng-template)
Biome (biomejs.biome)
```

### Tasks (`.vscode/tasks.json`)
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build Backend",
      "type": "shell",
      "command": "zig build",
      "group": "build"
    },
    {
      "label": "Build Frontend",
      "type": "shell",
      "command": "cd frontend && bun run build",
      "group": "build"
    },
    {
      "label": "Run Dev (Backend Only)",
      "type": "shell",
      "command": "./run-fast.sh backend-only",
      "group": {
        "kind": "build",
        "isDefault": true
      }
    },
    {
      "label": "Watch Mode",
      "type": "shell",
      "command": "./run-fast.sh watch",
      "problemMatcher": []
    }
  ]
}
```

### Keybindings (`.vscode/keybindings.json`)
```json
[
  {
    "key": "ctrl+shift+b",
    "command": "workbench.action.tasks.runTask",
    "args": "Run Dev (Backend Only)"
  },
  {
    "key": "ctrl+shift+t",
    "command": "workbench.action.tasks.runTask",
    "args": "Watch Mode"
  }
]
```

---

## 🧪 Testing Commands

### Backend Tests
```bash
# Run all tests
zig build test

# Run specific test
zig build test -- --test-filter "test name"
```

### Frontend Tests
```bash
# Unit tests (fast)
cd frontend && bun test

# Unit tests with coverage
cd frontend && bun test --coverage

# E2E tests (slow)
cd frontend && bun test:e2e

# E2E with UI
cd frontend && bun test:e2e:ui
```

### Quick Test Template

**Backend** (`src/test_example.zig`):
```zig
const testing = std.testing;

test "your function" {
    const result = yourFunction(input);
    try testing.expectEqual(expected, result);
}
```

**Frontend** (`src/**/*.test.ts`):
```typescript
import { describe, it, expect } from 'bun:test';

describe('YourComponent', () => {
  it('should work', () => {
    expect(yourFunction()).toBe(expected);
  });
});
```

---

## 📁 Project Structure Quick Ref

```
project/
├── src/                    # Zig backend
│   ├── main.zig           # Entry point
│   ├── di.zig             # Dependency injection
│   ├── handlers/          # WebUI handlers
│   └── utils/             # Utilities
│
├── frontend/src/          # Angular frontend
│   ├── core/              # Services
│   ├── views/             # Components
│   └── app.component.ts   # Main component
│
├── run-fast.sh            # ⚡ Fast build script
├── run.sh                 # Original build script
└── DX_IMPROVEMENTS.md     # DX documentation
```

---

## 🐛 Common Issues

### "Frontend not built"
```bash
./run-fast.sh frontend-only
```

### "Binary not found"
```bash
./run-fast.sh --clean backend-only
```

### "Port 4200 in use"
```bash
lsof -ti:4200 | xargs kill -9
```

### "Zig cache corrupted"
```bash
rm -rf .zig-cache && zig build
```

### "Node modules broken"
```bash
cd frontend && rm -rf node_modules && bun install
```

---

## ⚡ Performance Tips

### 1. Use Backend-Only Mode
When working on backend logic, skip Angular:
```bash
./run-fast.sh backend-only  # 5 seconds
```

### 2. Enable Watch Mode
For active development:
```bash
./run-fast.sh watch  # Auto-rebuild on changes
```

### 3. Keep Dev Dependencies Minimal
```bash
# Install only what you need
bun add <package>

# Remove unused
bun remove <package>
```

### 4. Use Build Cache
```bash
# Zig cache (automatic)
~/.cache/zig/

# Rspack cache (automatic)
frontend/.rspack_cache/
```

### 5. Parallel Builds
```bash
# Default in run-fast.sh
./run-fast.sh dev --parallel
```

---

## 📈 Metrics Dashboard

Track your development speed:

```bash
# Time a build
time ./run-fast.sh dev

# Count dependencies
cd frontend && bun install --frozen-lockfile 2>&1 | grep "Checked"

# Check bundle size
ls -lh frontend/dist/browser/*.js
```

**Target Metrics:**
- Backend build: <5 seconds
- Frontend build: <20 seconds  
- Hot reload: <1 second
- Test execution: <100ms per test

---

## 🎯 Workflow Examples

### Backend Feature Development
```bash
# 1. Start in backend-only mode
./run-fast.sh backend-only

# 2. Make changes to src/*.zig
# 3. App reloads in 5 seconds
# 4. Test in browser
# 5. Repeat
```

### Frontend Component Development
```bash
# 1. Start frontend dev server
cd frontend && bun run dev

# 2. Open http://localhost:4200
# 3. Make changes to components
# 4. HMR updates instantly
# 5. Test in browser
```

### Full-Stack Integration
```bash
# 1. Start watch mode
./run-fast.sh watch

# 2. Make changes to both frontend and backend
# 3. Both auto-rebuild
# 4. Test integration
```

---

## 📚 Additional Resources

- [DX_IMPROVEMENTS.md](./DX_IMPROVEMENTS.md) - Full DX improvement plan
- [CHANGELOG.md](./CHANGELOG.md) - Recent changes
- [CRITICAL_FIXES_SUMMARY.md](./CRITICAL_FIXES_SUMMARY.md) - Bug fixes
- [README.md](./README.md) - Project overview
