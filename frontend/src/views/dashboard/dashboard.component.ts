/**
 * Dashboard Component
 *
 * Main dashboard with statistics and navigation to different data views
 */

import { Component, signal, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MarkdownModule } from 'ngx-markdown';
import { LoggerService } from '../../core/logger.service';
import { ApiService } from '../../core/api.service';
import { DuckdbUsersComponent } from '../duckdb/duckdb-users.component';
import { DuckdbProductsComponent } from '../duckdb/duckdb-products.component';
import { DuckdbOrdersComponent } from '../duckdb/duckdb-orders.component';

export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  activeUsers: number;
  pendingOrders: number;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  active: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MarkdownModule,
    DuckdbUsersComponent,
    DuckdbProductsComponent,
    DuckdbOrdersComponent,
  ],
  template: `
    <div class="dashboard-container">
      <!-- First Panel: Dot Pills Switcher -->
      <aside class="panel-first" [class.hidden]="isMobileView() && showContent()">
        <!-- Docs Section -->
        <div class="pill-section">
          <button class="section-header" (click)="toggleDocsSection()">
            <span class="section-title">Documentation</span>
            <span class="section-toggle">{{ docsOpen() ? '▼' : '▶' }}</span>
          </button>
          @if (docsOpen()) {
            <div class="pill-container">
              @for (item of docItems(); track item.id) {
                <button
                  class="dot-pill"
                  [class.active]="activeView() === item.id"
                  (click)="onNavClick(item.id)"
                >
                  <span class="pill-dot"></span>
                  <span class="pill-text">{{ item.label }}</span>
                </button>
              }
            </div>
          }
        </div>

        <!-- Thirdparty Demo Section -->
        <div class="pill-section">
          <button class="section-header" (click)="toggleDemoSection()">
            <span class="section-title">Thirdparty Demos</span>
            <span class="section-toggle">{{ demoOpen() ? '▼' : '▶' }}</span>
          </button>
          @if (demoOpen()) {
            <div class="pill-container">
              @for (item of demoItems(); track item.id) {
                <button
                  class="dot-pill"
                  [class.active]="activeView() === item.id"
                  (click)="onNavClick(item.id)"
                >
                  <span class="pill-dot"></span>
                  <span class="pill-text">{{ item.label }}</span>
                </button>
              }
            </div>
          }
        </div>
      </aside>

      <!-- Second Panel: Content -->
      <main class="panel-second" [class.visible]="isMobileView() && showContent()">
        <!-- Mobile Close Button -->
        <button class="mobile-close-btn" (click)="goBackToMenu()">
          <span class="close-icon">←</span>
          <span class="close-text">Menu</span>
        </button>

        <!-- Content Area -->
        <div class="content-area" #contentArea>
          @if (activeView() === 'demo_duckdb') {
            <app-duckdb-users [items]="users()" (statsChange)="onStatsUpdate($any($event))"></app-duckdb-users>
          } @else if (activeView() === 'demo_sqlite') {
            <app-duckdb-products [items]="products()" (statsChange)="onStatsUpdate($any($event))"></app-duckdb-products>
          } @else if (activeView() === 'demo_websocket') {
            <app-duckdb-orders [items]="orders()" (statsChange)="onStatsUpdate($any($event))"></app-duckdb-orders>
          } @else {
            <markdown 
              [src]="currentMarkdownPath()" 
              (load)="onMarkdownLoad($event)" 
              (error)="onMarkdownError($event)">
            </markdown>
          }
        </div>
      </main>


    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      height: 100vh;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      overflow: hidden;
    }

    /* First Panel: Dot Pills */
    .panel-first {
      width: 320px;
      background: rgba(15, 23, 42, 0.95);
      border-right: 1px solid rgba(148, 163, 184, 0.1);
      display: flex;
      flex-direction: column;
      padding: 24px 16px;
      backdrop-filter: blur(10px);
    }

    .pill-section {
      margin-bottom: 16px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 10px 12px;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 8px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 10px;
    }

    .section-header:hover {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
      color: #fff;
    }

    .section-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-toggle {
      font-size: 10px;
      opacity: 0.7;
    }

    .pill-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-content: flex-start;
    }

    .dot-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: transparent;
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 20px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 13px;
    }

    .dot-pill:hover {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
      color: #fff;
    }

    .dot-pill.active {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border-color: transparent;
      color: #fff;
      box-shadow: 0 4px 15px rgba(6, 182, 212, 0.4);
    }

    .pill-dot {
      width: 8px;
      height: 8px;
      min-width: 8px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.6;
      transition: all 0.3s;
    }

    .dot-pill.active .pill-dot {
      opacity: 1;
      background: #fff;
    }

    .pill-text {
      font-size: 14px;
      font-weight: 500;
    }

    /* Second Panel: Content */
    .panel-second {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #0f172a;
    }

    .drawer-handle {
      display: none;
      width: 100%;
      padding: 12px 20px;
      background: rgba(30, 41, 59, 0.8);
      border: none;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      cursor: pointer;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .handle-bar {
      width: 40px;
      height: 4px;
      background: rgba(148, 163, 184, 0.4);
      border-radius: 2px;
    }

    .current-view-label {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      padding: 24px 32px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 12px;
      transition: all 0.3s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    }

    .stat-icon {
      font-size: 40px;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
    }

    .stat-label {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
    }

    .stat-primary .stat-icon { background: rgba(59, 130, 246, 0.2); }
    .stat-success .stat-icon { background: rgba(16, 185, 129, 0.2); }
    .stat-warning .stat-icon { background: rgba(245, 158, 11, 0.2); }
    .stat-info .stat-icon { background: rgba(6, 182, 212, 0.2); }

    /* Content Area */
    .content-area {
      flex: 1;
      overflow-y: auto;
      padding: 0 32px 32px;
    }

    /* Markdown Styles */
    .content-area ::ng-deep markdown {
      color: #e2e8f0;
      line-height: 1.7;
    }

    .content-area ::ng-deep markdown h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #fff;
      margin: 0 0 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    }

    .content-area ::ng-deep markdown h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 2rem 0 1rem;
    }

    .content-area ::ng-deep markdown h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #e2e8f0;
      margin: 1.5rem 0 0.75rem;
    }

    .content-area ::ng-deep markdown p {
      margin: 0 0 1rem;
    }

    .content-area ::ng-deep markdown ul, .content-area ::ng-deep markdown ol {
      margin: 0 0 1rem;
      padding-left: 1.5rem;
    }

    .content-area ::ng-deep markdown li {
      margin-bottom: 0.5rem;
    }

    .content-area ::ng-deep markdown code {
      background: rgba(30, 41, 59, 0.8);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
      font-size: 0.9em;
      color: #06b6d4;
    }

    .content-area ::ng-deep markdown pre {
      background: #1e293b;
      border-radius: 8px;
      padding: 1rem;
      overflow-x: auto;
      margin: 0 0 1rem;
    }

    .content-area ::ng-deep markdown pre code {
      background: transparent;
      padding: 0;
      color: #e2e8f0;
    }

    .content-area ::ng-deep markdown blockquote {
      border-left: 4px solid #06b6d4;
      padding-left: 1rem;
      margin: 0 0 1rem;
      color: #94a3b8;
      font-style: italic;
    }

    .content-area ::ng-deep markdown table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 1rem;
    }

    .content-area ::ng-deep markdown th, .content-area ::ng-deep markdown td {
      padding: 0.75rem;
      border: 1px solid rgba(148, 163, 184, 0.2);
      text-align: left;
    }

    .content-area ::ng-deep markdown th {
      background: rgba(30, 41, 59, 0.5);
      font-weight: 600;
    }

    .content-area ::ng-deep markdown a {
      color: #06b6d4;
      text-decoration: none;
    }

    .content-area ::ng-deep markdown a:hover {
      text-decoration: underline;
    }

    .content-area ::ng-deep markdown hr {
      border: none;
      border-top: 1px solid rgba(148, 163, 184, 0.2);
      margin: 2rem 0;
    }

    /* Mobile Close Button */
    .mobile-close-btn {
      display: none;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      margin: 16px;
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
    }

    .mobile-close-btn:hover {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
      color: #fff;
    }

    .close-icon {
      font-size: 18px;
    }
    .drawer-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 99;
    }

    /* Responsive */
    @media (max-width: 1200px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .dashboard-container {
        flex-direction: column;
      }

      .panel-first {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100vw;
        z-index: 100;
        transform: translateX(0);
        transition: transform 0.3s ease;
        padding: 20px 16px;
        overflow-y: auto;
      }

      .panel-first.hidden {
        transform: translateX(-100%);
        pointer-events: none;
      }

      .pill-container {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }

      .pill-section {
        margin-bottom: 20px;
      }

      .section-header {
        padding: 12px 16px;
        font-size: 13px;
      }

      .dot-pill {
        padding: 12px 14px;
        font-size: 13px;
        justify-content: center;
      }

      .panel-second {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        height: 100vh;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        z-index: 50;
      }

      .panel-second.visible {
        transform: translateX(0);
      }

      .mobile-close-btn {
        display: flex;
        margin: 12px;
        padding: 12px 16px;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        padding: 12px;
      }

      .stat-card {
        padding: 14px;
      }

      .stat-icon {
        width: 44px;
        height: 44px;
        font-size: 28px;
      }

      .stat-value {
        font-size: 22px;
      }

      .content-area {
        padding: 0 12px 12px;
      }
    }

    @media (max-width: 480px) {
      .pill-container {
        grid-template-columns: 1fr;
      }

      .card-title {
        font-size: 1.2rem;
      }

      .title-icon {
        font-size: 1.5rem;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly logger = inject(LoggerService);
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  @ViewChild('contentArea') contentArea!: ElementRef<HTMLElement>;

  activeView = signal<string>('README');
  isLoading = signal(false);
  isMobileView = signal(false);
  showContent = signal(false);
  
  users = signal<any[]>([]);
  products = signal<any[]>([]);
  orders = signal<any[]>([]);

  docsOpen = signal(true);
  demoOpen = signal(true);

  docItems = signal<NavItem[]>([
    { id: 'README', label: 'Overview', icon: '📖', active: true },
    { id: 'IMPLEMENTATION_SUMMARY', label: 'Implementation', icon: '📋', active: false },
    { id: 'REFACTORING_SUMMARY', label: 'Refactoring', icon: '♻️', active: false },
    { id: 'TESTING', label: 'Testing', icon: '🧪', active: false },
    { id: 'BACKEND_TESTING', label: 'Backend Tests', icon: '⚙️', active: false },
    { id: 'DUCKDB_INTEGRATION', label: 'DuckDB Integration', icon: '🦆', active: false },
    { id: 'DUCKDB_QUERY_BUILDER', label: 'Query Builder', icon: '🔨', active: false },
    { id: 'DOCUMENTATION_GAP_ANALYSIS', label: 'Doc Gaps', icon: '📝', active: false },
    { id: 'ENTERPRISE_READINESS_AUDIT', label: 'Enterprise', icon: '🏢', active: false },
    { id: 'backend_README', label: 'Backend', icon: '🔙', active: false },
    { id: 'backend_di-system', label: 'DI System', icon: '📦', active: false },
    { id: 'frontend_README', label: 'Frontend', icon: '🎨', active: false },
  ]);

  demoItems = signal<NavItem[]>([
    { id: 'demo_duckdb', label: 'DuckDB', icon: '🦆', active: false },
    { id: 'demo_sqlite', label: 'SQLite', icon: '🗃️', active: false },
    { id: 'demo_websocket', label: 'WebSocket', icon: '🔌', active: false },
    { id: 'demo_chart', label: 'Charts', icon: '📊', active: false },
    { id: 'demo_pdf', label: 'PDF Viewer', icon: '📄', active: false },
    { id: 'demo_maps', label: 'Maps', icon: '🗺️', active: false },
  ]);

  currentPageTitle = signal('Overview');
  currentMarkdownPath = signal('assets/docs/README.md');
  stats = signal({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });

  ngOnInit(): void {
    this.loadData();
    this.checkMobileView();
    window.addEventListener('resize', () => this.checkMobileView());
  }

  checkMobileView(): void {
    this.isMobileView.set(window.innerWidth <= 768);
    if (!this.isMobileView()) {
      this.showContent.set(false);
    }
  }

  goBackToMenu(): void {
    this.showContent.set(false);
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [usersData, productsData, ordersData] = await Promise.all([
        this.api.callOrThrow<any[]>('getUsers').catch(() => []),
        this.api.callOrThrow<any[]>('getProducts').catch(() => []),
        this.api.callOrThrow<any[]>('getOrders').catch(() => []),
      ]);
      this.users.set(usersData);
      this.products.set(productsData);
      this.orders.set(ordersData);
      this.stats.set({
        totalUsers: usersData.length,
        totalProducts: productsData.length,
        totalOrders: ordersData.length,
        totalRevenue: ordersData.reduce((sum: number, o: any) => sum + (o.total || 0), 0),
      });
    } catch (error) {
      this.logger.error('Failed to load data', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  setActiveView(viewId: string): void {
    this.activeView.set(viewId);
    const docItem = this.docItems().find(i => i.id === viewId);
    const demoItem = this.demoItems().find(i => i.id === viewId);
    const item = docItem || demoItem;
    this.currentPageTitle.set(item ? item.label : viewId);
    
    if (viewId.startsWith('demo_')) {
      this.currentMarkdownPath.set('');
    } else {
      const path = viewId.includes('_') && !viewId.startsWith('demo_')
        ? `assets/docs/${viewId.replace('_', '/')}.md`
        : `assets/docs/${viewId}.md`;
      this.currentMarkdownPath.set(path);
    }
    
    // On mobile, show content panel
    if (this.isMobileView()) {
      this.showContent.set(true);
    }
    
    if (this.contentArea) {
      this.contentArea.nativeElement.scrollTop = 0;
    }
  }

  onNavClick(viewId: string): void {
    this.setActiveView(viewId);
  }

  toggleDocsSection(): void {
    this.docsOpen.update(v => !v);
  }

  toggleDemoSection(): void {
    this.demoOpen.update(v => !v);
  }

  onMarkdownLoad(event: any): void {
    this.logger.info('Markdown loaded successfully');
  }

  onMarkdownError(error: any): void {
    this.logger.error('Failed to load markdown', error);
  }

  onStatsUpdate(event: { type: string; count: number }): void {
    this.stats.update(s => ({ ...s, [event.type]: event.count }));
    this.loadData();
  }
}
