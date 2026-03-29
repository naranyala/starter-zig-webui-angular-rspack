import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';

interface DocContent {
  title: string;
  icon: string;
  lastUpdated: string;
  readTime: string;
  content: string;
  relatedDocs: string[];
}

@Component({
  selector: 'app-docs-viewer',
  standalone: true,
  imports: [CommonModule, RouterModule, MarkdownModule],
  template: `
    <div class="docs-viewer" *ngIf="docContent; else loading">
      <nav class="breadcrumb">
        <a routerLink="/docs" class="breadcrumb-link">📚 Docs</a>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-current">{{ docContent.title }}</span>
      </nav>

      <article class="doc-article">
        <header class="doc-header">
          <div class="doc-icon">{{ docContent.icon }}</div>
          <h1>{{ docContent.title }}</h1>
          
          <div class="doc-meta">
            <span class="meta-item" *ngIf="docContent.lastUpdated">
              📅 Last updated: {{ docContent.lastUpdated }}
            </span>
            <span class="meta-item" *ngIf="docContent.readTime">
              ⏱️ {{ docContent.readTime }} read
            </span>
          </div>
        </header>

        <div class="doc-content">
          <markdown [data]="docContent.content"></markdown>
        </div>

        <footer class="doc-footer" *ngIf="docContent.relatedDocs?.length">
          <h3>Related Documentation</h3>
          <div class="related-grid">
            <a 
              [routerLink]="link" 
              class="related-card"
              *ngFor="let link of docContent.relatedDocs"
            >
              📄 {{ link }}
            </a>
          </div>
        </footer>
      </article>

      <div class="docs-nav">
        <button class="nav-btn" (click)="scrollToTop()">
          ↑ Back to Top
        </button>
      </div>
    </div>

    <ng-template #loading>
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading documentation...</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .docs-viewer {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 2rem;
      font-size: 0.9rem;
      color: #6b7280;
    }

    .breadcrumb-link {
      color: #667eea;
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
      }
    }

    .breadcrumb-separator {
      color: #9ca3af;
    }

    .doc-article {
      background: white;
      border-radius: 16px;
      padding: 3rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .doc-header {
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 2px solid #f3f4f6;
    }

    .doc-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .doc-header h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      color: #1f2937;
    }

    .doc-meta {
      display: flex;
      gap: 2rem;
      color: #6b7280;
      font-size: 0.9rem;
    }

    .doc-content {
      line-height: 1.8;
      color: #374151;

      :deep(h1) {
        font-size: 2rem;
        margin-top: 2rem;
        margin-bottom: 1rem;
        color: #1f2937;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 0.5rem;
      }

      :deep(h2) {
        font-size: 1.5rem;
        margin-top: 1.5rem;
        margin-bottom: 0.75rem;
        color: #1f2937;
      }

      :deep(h3) {
        font-size: 1.25rem;
        margin-top: 1.25rem;
        margin-bottom: 0.5rem;
        color: #1f2937;
      }

      :deep(p) {
        margin-bottom: 1rem;
      }

      :deep(code) {
        background: #f3f4f6;
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        font-family: 'Monaco', 'Consolas', monospace;
        font-size: 0.9em;
        color: #dc2626;
      }

      :deep(pre) {
        background: #1f2937;
        color: #f9fafb;
        padding: 1.5rem;
        border-radius: 8px;
        overflow-x: auto;
        margin: 1.5rem 0;

        code {
          background: transparent;
          color: inherit;
          padding: 0;
        }
      }

      :deep(blockquote) {
        border-left: 4px solid #667eea;
        padding-left: 1rem;
        margin: 1.5rem 0;
        color: #6b7280;
        font-style: italic;
      }

      :deep(table) {
        width: 100%;
        border-collapse: collapse;
        margin: 1.5rem 0;

        th, td {
          border: 1px solid #e5e7eb;
          padding: 0.75rem;
          text-align: left;
        }

        th {
          background: #f9fafb;
          font-weight: 600;
        }

        tr:nth-child(even) {
          background: #f9fafb;
        }
      }

      :deep(ul), :deep(ol) {
        margin-bottom: 1rem;
        padding-left: 2rem;
      }

      :deep(li) {
        margin-bottom: 0.5rem;
      }

      :deep(a) {
        color: #667eea;
        text-decoration: none;
        
        &:hover {
          text-decoration: underline;
        }
      }
    }

    .doc-footer {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 2px solid #f3f4f6;

      h3 {
        margin-bottom: 1rem;
        color: #1f2937;
      }
    }

    .related-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
    }

    .related-card {
      padding: 1rem;
      background: #f9fafb;
      border-radius: 8px;
      text-decoration: none;
      color: #374151;
      transition: all 0.3s;

      &:hover {
        background: #667eea;
        color: white;
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
    }

    .docs-nav {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
    }

    .nav-btn {
      padding: 1rem 1.5rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 50px;
      font-size: 1rem;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: all 0.3s;

      &:hover {
        background: #5568d3;
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      }
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;

      .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #f3f4f6;
        border-top-color: #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }

      p {
        color: #6b7280;
        font-size: 1.1rem;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class DocsViewerComponent implements OnInit {
  docContent: DocContent | null = null;

  private docContents: Record<string, DocContent> = {
    'overview': {
      title: 'Project Overview',
      icon: '📋',
      lastUpdated: '2026-03-29',
      readTime: '5 min',
      content: `
# Zig WebUI Angular Rspack - Project Overview

A modern desktop application framework combining:
- **Backend**: Zig with WebUI library for native window management
- **Frontend**: Angular 21 with Rspack bundler
- **Communication**: WebSocket-based (NO HTTP/HTTPS) via WebUI bridge
- **Desktop**: Native Chromium-based window

## Key Technologies

| Component | Technology | Version |
|-----------|------------|---------|
| Backend | Zig | 0.14.1+ |
| Frontend | Angular + Rspack | Angular 21 |
| Window | WebUI (Chromium) | 2.5.0-beta.4 |
| Package Manager | Bun | 1.3.10+ |
| Communication | WebSocket | Native |

## Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                    Desktop Application                        │
│                                                              │
│  ┌─────────────────────┐      ┌─────────────────────────┐ │
│  │     Frontend        │      │       Backend            │ │
│  │     (Angular)       │      │       (Zig + WebUI)     │ │
│  │                     │      │                         │ │
│  │  WebuiBridgeService│◄────►│  webui.bind()          │ │
│  │  WebSocketService   │      │  webui.run()           │ │
│  │  API Service       │  WS  │  DI Container          │ │
│  └─────────────────────┘      └─────────────────────────┘ │
│                              │                              │
│                     WebUI Bridge                           │
│                   (Native WebSocket)                        │
└─────────────────────────────────────────────────────────────┘
\`\`\`

## Quick Links

- [Quick Start](/docs/getting-started/quickstart) - Get running in 5 minutes
- [Architecture](/docs/getting-started/architecture) - System design
- [Critical Fixes](/docs/critical-fixes/fixes-summary) - Recent improvements
`,
      relatedDocs: ['/docs/getting-started/quickstart', '/docs/backend/architecture']
    },
    'quickstart': {
      title: 'Quick Start Guide',
      icon: '⚡',
      lastUpdated: '2026-03-29',
      readTime: '3 min',
      content: `
# Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- **Zig** v0.14.1+
- **Bun** v1.3.10+
- **Chromium** browser

## Installation

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd starter-zig-webui-angular-rspack

# Install frontend dependencies
cd frontend
bun install
cd ..

# Build and run
./run-fast.sh dev
\`\`\`

## Build Commands

| Command | Description | Time |
|---------|-------------|------|
| \`./run-fast.sh dev\` | Full debug build | ~25s |
| \`./run-fast.sh backend-only\` | Backend only (fastest) | ~5s |
| \`./run-fast.sh watch\` | Watch mode | Auto |
| \`./run-fast.sh --clean dev\` | Clean build | ~30s |

## Development Workflow

### Backend Development
\`\`\`bash
# Fast iteration (skip Angular)
./run-fast.sh backend-only
\`\`\`

### Frontend Development
\`\`\`bash
# Start dev server with HMR
cd frontend && bun run dev
\`\`\`

### Full Stack
\`\`\`bash
# Watch both frontend and backend
./run-fast.sh watch
\`\`\`

## Project Structure

\`\`\`
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
└── docs/                  # Documentation
\`\`\`

## Next Steps

1. Read the [Architecture](/docs/getting-started/architecture) guide
2. Check out [Dev Quickstart](/docs/getting-started/dev-quickstart)
3. Explore the [API Reference](/docs/api-reference/backend-api)
`,
      relatedDocs: ['/docs/getting-started/overview', '/docs/developer-experience/dx-summary']
    },
    'dev-quickstart': {
      title: 'Developer Quickstart',
      icon: '🛠️',
      lastUpdated: '2026-03-29',
      readTime: '4 min',
      content: `
# Developer Quickstart

Essential commands for daily development.

## Fast Build Commands

\`\`\`bash
# Backend work (fastest - 5 seconds)
./run-fast.sh backend-only

# Full stack (25 seconds)
./run-fast.sh dev

# Watch mode (auto-rebuild)
./run-fast.sh watch

# Clean build
./run-fast.sh --clean dev
\`\`\`

## Build Time Comparison

| Command | Time | Use Case |
|---------|------|----------|
| \`./run-fast.sh backend-only\` | ~5s | Backend logic |
| \`./run-fast.sh dev\` | ~25s | Full changes |
| \`./run-fast.sh watch\` | <1s | Active coding |
| \`./run.sh dev\` (old) | ~45s | ❌ Don't use |

## Testing

### Backend Tests
\`\`\`bash
# Run all tests
zig build test

# Run specific test
zig build test -- --test-filter "test name"
\`\`\`

### Frontend Tests
\`\`\`bash
# Unit tests (fast)
cd frontend && bun test

# With coverage
cd frontend && bun test --coverage

# E2E tests
cd frontend && bun test:e2e
\`\`\`

## VS Code Setup

### Recommended Extensions
- Zig (ziglang.vscode-zig)
- Angular Language Service
- Biome (biomejs.biome)

### Key Tasks
\`\`\`json
{
  "label": "Run Dev (Backend Only)",
  "command": "./run-fast.sh backend-only"
}
\`\`\`

## Common Issues

### "Frontend not built"
\`\`\`bash
./run-fast.sh frontend-only
\`\`\`

### "Binary not found"
\`\`\`bash
./run-fast.sh --clean backend-only
\`\`\`

### "Zig cache corrupted"
\`\`\`bash
rm -rf .zig-cache && zig build
\`\`\`

## Performance Tips

1. **Use backend-only mode** for backend work
2. **Enable watch mode** for active development
3. **Keep dependencies minimal**
4. **Use build cache** (don't clean unless necessary)

## Metrics

Track your development speed:

\`\`\`bash
# Time a build
time ./run-fast.sh dev

# Check bundle size
ls -lh frontend/dist/browser/*.js
\`\`\`

**Target Metrics:**
- Backend build: <5 seconds ✅
- Frontend build: <20 seconds ✅
- Hot reload: <1 second ✅
`,
      relatedDocs: ['/docs/developer-experience/dx-summary', '/docs/build-system/build-config']
    }
  };

  constructor(
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const sectionId = params['sectionId'];
      this.docContent = this.docContents[sectionId] || this.getDocContent(sectionId);
    });
  }

  private getDocContent(sectionId: string): DocContent {
    const title = sectionId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return {
      title: title,
      icon: '📄',
      lastUpdated: '2026-03-29',
      readTime: '5 min',
      content: `# ${title.toUpperCase()}\\n\\nDocumentation content coming soon...\\n\\nThis section is under construction. Please check back later.\\n\\n## Related Links\\n\\n- [Getting Started](/docs/getting-started/overview)\\n- [Critical Fixes](/docs/critical-fixes/fixes-summary)\\n- [Developer Experience](/docs/developer-experience/dx-summary)`,
      relatedDocs: ['/docs/getting-started/overview']
    };
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
