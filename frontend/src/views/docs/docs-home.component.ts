import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';

interface DocSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  order: number;
}

interface DocGroup {
  id: string;
  title: string;
  description: string;
  icon: string;
  sections: DocSection[];
  order: number;
}

@Component({
  selector: 'app-docs-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MarkdownModule],
  template: `
    <div class="docs-home">
      <header class="docs-header">
        <h1>📚 Project Documentation</h1>
        <p class="subtitle">Complete guide to building with Zig + Angular + WebUI</p>
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
  `]
})
export class DocsHomeComponent implements OnInit {
  docGroups: DocGroup[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Quick start guides and essential information',
      icon: '🚀',
      order: 1,
      sections: [
        { id: 'overview', title: 'Project Overview', icon: '📋', description: 'What is this project?', order: 1 },
        { id: 'quickstart', title: 'Quick Start', icon: '⚡', description: 'Get running in 5 minutes', order: 2 },
        { id: 'dev-quickstart', title: 'Dev Quickstart', icon: '🛠️', description: 'Daily development commands', order: 3 },
        { id: 'architecture', title: 'Architecture', icon: '🏗️', description: 'System design and structure', order: 4 }
      ]
    },
    {
      id: 'critical-fixes',
      title: 'Critical Fixes',
      description: 'Important security and stability improvements',
      icon: '🔒',
      order: 2,
      sections: [
        { id: 'fixes-summary', title: 'Fixes Summary', icon: '✅', description: 'All critical fixes applied', order: 1 },
        { id: 'input-validation', title: 'Input Validation', icon: '🛡️', description: 'Database security improvements', order: 2 },
        { id: 'thread-safety', title: 'Thread Safety', icon: '🧵', description: 'Signal handlers and concurrency', order: 3 },
        { id: 'memory-safety', title: 'Memory Safety', icon: '🧹', description: 'Leak prevention and cleanup', order: 4 },
        { id: 'error-handling', title: 'Error Handling', icon: '⚠️', description: 'Safe error patterns', order: 5 },
        { id: 'graceful-shutdown', title: 'Graceful Shutdown', icon: '🚪', description: 'Proper resource cleanup', order: 6 }
      ]
    },
    {
      id: 'developer-experience',
      title: 'Developer Experience',
      description: 'Tools and workflows for faster development',
      icon: '🎯',
      order: 3,
      sections: [
        { id: 'dx-summary', title: 'DX Summary', icon: '📊', description: 'Improvements overview', order: 1 },
        { id: 'dx-improvements', title: 'DX Improvements', icon: '📈', description: 'Complete improvement plan', order: 2 },
        { id: 'fast-builds', title: 'Fast Builds', icon: '⚡', description: 'Parallel and incremental builds', order: 3 },
        { id: 'watch-mode', title: 'Watch Mode', icon: '👀', description: 'Auto-rebuild on changes', order: 4 },
        { id: 'backend-only', title: 'Backend-Only Mode', icon: '🎯', description: 'Skip Angular for speed', order: 5 }
      ]
    },
    {
      id: 'backend',
      title: 'Backend Guide',
      description: 'Zig backend development',
      icon: '⚙️',
      order: 4,
      sections: [
        { id: 'backend-architecture', title: 'Architecture', icon: '🏛️', description: 'Backend structure', order: 1 },
        { id: 'dependency-injection', title: 'Dependency Injection', icon: '💉', description: 'DI system guide', order: 2 },
        { id: 'webui-bindings', title: 'WebUI Bindings', icon: '🔗', description: 'Frontend-backend communication', order: 3 },
        { id: 'sqlite-integration', title: 'SQLite Integration', icon: '🗄️', description: 'Database operations', order: 4 },
        { id: 'utilities', title: 'Utilities', icon: '🔧', description: 'Helper modules', order: 5 }
      ]
    },
    {
      id: 'frontend',
      title: 'Frontend Guide',
      description: 'Angular frontend development',
      icon: '🎨',
      order: 5,
      sections: [
        { id: 'frontend-architecture', title: 'Architecture', icon: '🏛️', description: 'Frontend structure', order: 1 },
        { id: 'services', title: 'Services', icon: '📦', description: 'Core services guide', order: 2 },
        { id: 'components', title: 'Components', icon: '🧩', description: 'Component library', order: 3 },
        { id: 'webui-bridge', title: 'WebUI Bridge', icon: '🌉', description: 'Communication layer', order: 4 },
        { id: 'styling', title: 'Styling', icon: '🎨', description: 'CSS and theming', order: 5 }
      ]
    },
    {
      id: 'build-system',
      title: 'Build System',
      description: 'Build configuration and optimization',
      icon: '🔨',
      order: 6,
      sections: [
        { id: 'build-config', title: 'Build Configuration', icon: '⚙️', description: 'Zig and Rspack setup', order: 1 },
        { id: 'module-system', title: 'Module System', icon: '📦', description: 'Shared modules', order: 2 },
        { id: 'optimization', title: 'Optimization', icon: '🚀', description: 'Performance tuning', order: 3 },
        { id: 'troubleshooting', title: 'Troubleshooting', icon: '🔍', description: 'Common issues', order: 4 }
      ]
    },
    {
      id: 'api-reference',
      title: 'API Reference',
      description: 'Complete API documentation',
      icon: '📖',
      order: 7,
      sections: [
        { id: 'backend-api', title: 'Backend API', icon: '🔌', description: 'Backend functions', order: 1 },
        { id: 'frontend-api', title: 'Frontend API', icon: '🎭', description: 'Frontend services', order: 2 },
        { id: 'database-api', title: 'Database API', icon: '🗄️', description: 'Database operations', order: 3 },
        { id: 'events', title: 'Events', icon: '📡', description: 'Event bus reference', order: 4 }
      ]
    },
    {
      id: 'changelog',
      title: 'Changelog',
      description: 'Version history and updates',
      icon: '📝',
      order: 8,
      sections: [
        { id: 'latest', title: 'Latest Changes', icon: '✨', description: 'Most recent updates', order: 1 },
        { id: 'security', title: 'Security Updates', icon: '🔐', description: 'Security improvements', order: 2 },
        { id: 'migration', title: 'Migration Guide', icon: '🔄', description: 'Upgrade instructions', order: 3 }
      ]
    }
  ];

  filteredGroups: DocGroup[] = [];

  ngOnInit() {
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
          section.description.toLowerCase().includes(term)
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
