import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';
import { DOCS_MANIFEST, DocGroup, DocSection } from '../../assets/docs/docs-manifest';

@Component({
  selector: 'app-docs-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MarkdownModule],
  template: `
    <div class="docs-home">
      <header class="docs-header">
        <h1>📚 Production-Ready CRUD Integration Docs</h1>
        <p class="subtitle">Complete guides for DuckDB and SQLite integration with Zig + Angular</p>
      </header>

      <div class="search-box">
        <input
          type="text"
          placeholder="Search documentation..."
          class="search-input"
          #searchInput
          (input)="filterDocs(searchInput.value)"
        />
      </div>

      <div class="doc-groups">
        <div class="doc-group" *ngFor="let group of filteredGroups">
          <div class="group-header">
            <span class="group-icon">{{ group.icon }}</span>
            <div>
              <h2>{{ group.title }}</h2>
              <p>{{ group.description }}</p>
            </div>
          </div>

          <div class="section-grid">
            <a
              [routerLink]="['/docs', group.id, section.id]"
              class="section-card"
              *ngFor="let section of group.sections"
            >
              <div class="section-icon">{{ section.icon }}</div>
              <div class="section-content">
                <h3>{{ section.title }}</h3>
                <p>{{ section.description }}</p>
              </div>
              <div class="section-arrow">→</div>
            </a>
          </div>
        </div>
      </div>

      <!-- Auto-discovered docs notice -->
      <footer class="docs-footer">
        <p>
          📝 Documentation is auto-discovered from markdown files in 
          <code>src/assets/docs/</code>
        </p>
        <p class="footer-hint">
          To add new documentation: create a .md file and add an entry to docs-manifest.ts
        </p>
      </footer>
    </div>
  `,
  styles: [`
    .docs-home {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .docs-header {
      text-align: center;
      margin-bottom: 3rem;
    }

    .docs-header h1 {
      font-size: 3rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      font-size: 1.2rem;
      color: #6b7280;
    }

    .search-box {
      max-width: 600px;
      margin: 0 auto 3rem;
    }

    .search-input {
      width: 100%;
      padding: 1rem 1.5rem;
      font-size: 1.1rem;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      transition: all 0.3s;

      &:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
    }

    .doc-groups {
      display: flex;
      flex-direction: column;
      gap: 3rem;
    }

    .doc-group {
      background: white;
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .group-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #f3f4f6;
    }

    .group-icon {
      font-size: 2.5rem;
    }

    .group-header h2 {
      font-size: 1.8rem;
      margin-bottom: 0.25rem;
      color: #1f2937;
    }

    .group-header p {
      color: #6b7280;
      font-size: 1rem;
    }

    .section-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .section-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      background: #f9fafb;
      border-radius: 12px;
      text-decoration: none;
      color: inherit;
      transition: all 0.3s;
      border: 2px solid transparent;

      &:hover {
        background: white;
        border-color: #667eea;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
      }

      .section-icon {
        font-size: 2rem;
        flex-shrink: 0;
      }

      .section-content {
        flex: 1;

        h3 {
          font-size: 1.1rem;
          margin-bottom: 0.25rem;
          color: #1f2937;
        }

        p {
          font-size: 0.9rem;
          color: #6b7280;
          margin: 0;
        }
      }

      .section-arrow {
        font-size: 1.5rem;
        color: #9ca3af;
        transition: transform 0.3s;
      }

      &:hover .section-arrow {
        transform: translateX(5px);
        color: #667eea;
      }
    }

    .docs-footer {
      margin-top: 4rem;
      padding: 2rem;
      background: rgba(102, 126, 234, 0.05);
      border-radius: 12px;
      text-align: center;

      p {
        margin: 0.5rem 0;
        color: #6b7280;
        font-size: 0.9rem;

        code {
          background: rgba(102, 126, 234, 0.1);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-family: 'Monaco', 'Consolas', monospace;
          font-size: 0.85em;
          color: #667eea;
        }
      }

      .footer-hint {
        font-size: 0.85rem;
        font-style: italic;
      }
    }
  `]
})
export class DocsHomeComponent implements OnInit {
  // Load docs from manifest (dynamically populated)
  docGroups: DocGroup[] = [];
  filteredGroups: DocGroup[] = [];

  ngOnInit() {
    // Clone and sort the manifest
    this.docGroups = JSON.parse(JSON.stringify(DOCS_MANIFEST));
    this.filteredGroups = [...this.docGroups].sort((a, b) => a.order - b.order);
    this.filteredGroups.forEach(group => {
      group.sections.sort((a, b) => a.order - b.order);
    });
  }

  filterDocs(searchTerm: string) {
    const term = searchTerm.toLowerCase();

    if (!term) {
      this.filteredGroups = [...this.docGroups].sort((a, b) => a.order - b.order);
      this.filteredGroups.forEach(group => {
        group.sections.sort((a, b) => a.order - b.order);
      });
      return;
    }

    this.filteredGroups = this.docGroups
      .map(group => ({
        ...group,
        sections: group.sections.filter(section =>
          section.title.toLowerCase().includes(term) ||
          section.description.toLowerCase().includes(term) ||
          section.tags?.some(tag => tag.toLowerCase().includes(term))
        )
      }))
      .filter(group =>
        group.title.toLowerCase().includes(term) ||
        group.description.toLowerCase().includes(term) ||
        group.sections.length > 0
      )
      .sort((a, b) => a.order - b.order);
  }
}
