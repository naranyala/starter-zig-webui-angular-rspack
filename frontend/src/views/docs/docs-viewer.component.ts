import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';
import { HttpClient } from '@angular/common/http';

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
  private currentSectionId = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const sectionId = params['sectionId'];
      this.currentSectionId = sectionId;
      this.loadDocContent(sectionId);
    });
  }

  private loadDocContent(sectionId: string) {
    const mdPath = `assets/docs/${sectionId}.md`;
    
    this.http.get(mdPath, { responseType: 'text' }).subscribe({
      next: (content) => {
        this.docContent = {
          title: this.extractTitle(content, sectionId),
          icon: this.extractIcon(sectionId),
          lastUpdated: '2026-03-31',
          readTime: '10 min',
          content: content,
          relatedDocs: this.getRelatedDocs(sectionId)
        };
      },
      error: (error) => {
        console.error('Failed to load documentation:', error);
        this.docContent = {
          title: 'Documentation Not Found',
          icon: '❌',
          lastUpdated: '2026-03-31',
          readTime: '1 min',
          content: `# Documentation Not Found\\n\\nThe requested documentation "${sectionId}" could not be loaded.\\n\\n## Available Documentation\\n\\n- [DuckDB CRUD Integration](/docs/duckdb-crud/DUCKDB_CRUD_INTEGRATION)\\n- [SQLite CRUD Integration](/docs/sqlite-crud/SQLITE_CRUD_INTEGRATION)`,
          relatedDocs: ['/docs/duckdb-crud/DUCKDB_CRUD_INTEGRATION', '/docs/sqlite-crud/SQLITE_CRUD_INTEGRATION']
        };
      }
    });
  }

  private extractTitle(content: string, sectionId: string): string {
    const match = content.match(/^# (.+)$/m);
    return match ? match[1] : sectionId.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
  }

  private extractIcon(sectionId: string): string {
    const iconMap: Record<string, string> = {
      'DUCKDB_CRUD_INTEGRATION': '🦆',
      'SQLITE_CRUD_INTEGRATION': '🗄️',
      'duckdb-vs-sqlite': '⚖️',
      'performance-comparison': '📊',
      'use-cases': '🎯',
      'security-checklist': '🔒',
      'error-handling': '⚠️',
      'testing-guide': '🧪',
      'troubleshooting': '🔍'
    };
    return iconMap[sectionId] || '📄';
  }

  private getRelatedDocs(sectionId: string): string[] {
    if (sectionId.includes('DUCKDB')) {
      return ['/docs/sqlite-crud/SQLITE_CRUD_INTEGRATION', '/docs/comparison/duckdb-vs-sqlite'];
    }
    if (sectionId.includes('SQLITE')) {
      return ['/docs/duckdb-crud/DUCKDB_CRUD_INTEGRATION', '/docs/comparison/duckdb-vs-sqlite'];
    }
    if (sectionId.includes('comparison')) {
      return ['/docs/duckdb-crud/DUCKDB_CRUD_INTEGRATION', '/docs/sqlite-crud/SQLITE_CRUD_INTEGRATION'];
    }
    if (sectionId.includes('production')) {
      return ['/docs/duckdb-crud/DUCKDB_CRUD_INTEGRATION', '/docs/sqlite-crud/SQLITE_CRUD_INTEGRATION'];
    }
    return [];
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
