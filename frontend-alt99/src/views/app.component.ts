import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { WinBoxService, type WinBoxInstance } from '../core/winbox.service';
import { LucideAngularModule } from 'lucide-angular';
import { provideLucideIcons, Home, Lock, Database, Settings, Folder, Eye, Search, X, Rocket, Share2, Copy, Tag, Trash2, Menu, Grid, BarChart2, Globe, Info, Maximize2, Minimize2, FileText, Activity } from '../core/lucide-icons.provider';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  count?: number;
}

export interface Card {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  type: string;
  date: string;
  score?: number; // For fuzzy search scoring
}

export interface WindowEntry {
  id: string;
  title: string;
  minimized: boolean;
  focused: boolean;
}

export type ViewMode = 'grid' | 'list';
export type AppView = 'home' | 'auth' | 'sqlite' | 'devtools' | 'settings' | 'help' | 'about';
export type ThirdPanelView = 'details' | 'activity';

export interface MenuGroup {
  label: string;
  items: NavItem[];
}

const TECH_CARDS: Card[] = [
   { id: 1, title: 'Authentication', description: 'Login & Register', icon: 'Lock', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', type: 'Feature', date: '2026-03-16' },
   { id: 2, title: 'SQLite CRUD', description: 'Database Operations', icon: 'Database', color: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)', type: 'Feature', date: '2026-03-16' },
   { id: 3, title: 'DevTools', description: 'Debugging Tools', icon: 'Settings', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', type: 'Tool', date: '2026-03-15' },
   { id: 4, title: 'System Info', description: 'System Monitoring', icon: 'BarChart2', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', type: 'Monitor', date: '2026-03-15' },
   { id: 5, title: 'Network', description: 'Network Stats', icon: 'Globe', color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', type: 'Monitor', date: '2026-03-14' },
   { id: 6, title: 'Processes', description: 'Process Manager', icon: 'Settings', color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', type: 'Tool', date: '2026-03-14' },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  providers: [...provideLucideIcons()],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly winboxService = inject(WinBoxService);

  // Column size (percentage) for the left column (basis in flex: 0 0 leftColumnSize%)
  readonly leftColumnSize = signal(25); // Default 25% for left column

  // Computed right column percentage (remaining space)
  readonly rightColumnSize = computed(() => 100 - this.leftColumnSize());

  // Column collapsed state
  readonly leftColumnCollapsed = signal(false); // Visible by default

  // Navigation state
  readonly activeNavigation = signal<string>('favorites');
  readonly activeView = signal<AppView>('home');
  readonly searchQuery = signal('');
  readonly viewMode = signal<ViewMode>('grid');
  readonly selectedCard = signal<Card | null>(null);
  readonly fuzzySearchActive = signal(false);

  // Window management
  readonly windowEntries = signal<WindowEntry[]>([]);

  // Menu counts
  readonly mainMenuCount = signal(4);
  readonly supportMenuCount = signal(3);

  // Fuzzy search scoring function
  private fuzzyScore(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    if (lowerText === lowerQuery) return 100;
    if (lowerText.startsWith(lowerQuery)) return 80;
    if (lowerText.includes(lowerQuery)) return 60;
    
    let score = 0;
    let queryIndex = 0;
    for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
      if (lowerText[i] === lowerQuery[queryIndex]) {
        score += 5;
        queryIndex++;
      }
    }
    return queryIndex === lowerQuery.length ? score : 0;
  }

  // Filtered menus based on search
  readonly filteredMainMenus = computed<NavItem[]>(() => {
    const query = this.searchQuery().trim();
    if (!query) return this.mainMenus();
    
    return this.mainMenus()
      .map(item => ({ item, score: this.fuzzyScore(item.label, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  });

  readonly filteredSupportMenus = computed<NavItem[]>(() => {
    const query = this.searchQuery().trim();
    if (!query) return this.supportMenus();
    
    return this.supportMenus()
      .map(item => ({ item, score: this.fuzzyScore(item.label, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  });

  // Menu groups (original)
  readonly mainMenus = computed<NavItem[]>(() => [
    { id: 'home', label: 'Home', icon: 'Home' },
    { id: 'auth', label: 'Auth', icon: 'Lock' },
    { id: 'sqlite', label: 'SQLite', icon: 'Database' },
    { id: 'devtools', label: 'DevTools', icon: 'Settings' },
  ]);

  readonly supportMenus = computed<NavItem[]>(() => [
    { id: 'settings', label: 'Settings', icon: 'Settings' },
    { id: 'help', label: 'Help', icon: 'Info' },
    { id: 'about', label: 'About', icon: 'Info' },
  ]);

  // Third panel state
  readonly thirdPanelView = signal<ThirdPanelView>('details');

  // Breadcrumb navigation
  readonly breadcrumbs = signal<{ label: string; icon: any }[]>([
    { label: 'Home', icon: Home },
  ]);

  // Lucide icons for direct use with [img] property
  readonly icons: { [key: string]: any } = {
    Home,
    Lock,
    Database,
    Settings,
    Folder,
    Eye,
    Search,
    X,
    Rocket,
    Share2,
    Copy,
    Tag,
    Trash2,
    Menu,
    Grid,
    BarChart2,
    Globe,
    Info,
    Maximize2,
    Minimize2,
    FileText,
    Activity,
  };

  // Helper method to get icon by name
  getIcon(name: string): any {
    return this.icons[name] || this.icons.Home;
  }

  setActiveView(id: string): void {
    this.activeView.set(id as AppView);
  }

  setThirdPanelView(view: ThirdPanelView): void {
    this.thirdPanelView.set(view);
  }

  private existingBoxes: WinBoxInstance[] = [];
  private authWindowId = 'auth-window-1';
  private sqliteWindowId = 'sqlite-window-2';
  private isResizing = false;
  private resizeStartX = 0;
  private resizeStartSize = 0;
  private activeSplitter: 'left' | null = null;

  // Computed signals
  readonly navigationItems = computed(() => []);
  
  readonly filteredCards = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) {
      return TECH_CARDS.map(c => ({ ...c, score: 0 }));
    }
    
    // Fuzzy search scoring
    return TECH_CARDS.map(card => {
      const title = card.title.toLowerCase();
      const description = card.description.toLowerCase();
      const type = card.type.toLowerCase();
      let score = 0;
      
      // Exact match gets highest score
      if (title === query) score = 100;
      // Starts with query gets high score
      else if (title.startsWith(query)) score = 90;
      // Contains query gets medium score
      else if (title.includes(query)) score = 70;
      // Description match gets lower score
      else if (description.includes(query)) score = 50;
      // Type match gets lowest score
      else if (type.includes(query)) score = 30;
      
      // Bonus for consecutive character matches (fuzzy)
      if (score > 0) {
        let matchCount = 0;
        let queryIndex = 0;
        for (let i = 0; i < title.length && queryIndex < query.length; i++) {
          if (title[i] === query[queryIndex]) {
            matchCount++;
            queryIndex++;
          }
        }
        if (queryIndex === query.length) {
          score += matchCount * 5; // Bonus for sequential matches
        }
      }
      
      return { ...card, score };
    })
    .filter(card => card.score! > 0)
    .sort((a, b) => b.score! - a.score!);
  });

  hasFocusedWindow = computed(() => {
    return this.windowEntries().some(entry => entry.focused);
  });

  ngOnInit(): void {
    this.closeAllWindows();

    // Verify WinBox is available
    const winboxAvailable = this.winboxService.isAvailable() || !!(window as any).WinBox;

    if (typeof document !== 'undefined') {
      (window as any).__WINBOX_DEBUG = {
        serviceHasIt: this.winboxService.isAvailable(),
        windowHasIt: !!(window as any).WinBox,
        winboxConstructor: (window as any).WinBox || null,
        checked: new Date().toISOString(),
      };
    }

    // Add resize event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', (e) => this.onMouseMove(e));
      window.addEventListener('mouseup', () => this.onMouseUp());
      // Add keyboard shortcuts
      window.addEventListener('keydown', (e) => this.onKeyDown(e));
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', (e) => this.onMouseMove(e));
      window.removeEventListener('mouseup', () => this.onMouseUp());
      window.removeEventListener('keydown', (e) => this.onKeyDown(e));
    }
  }

  // Keyboard shortcuts
  onKeyDown(event: KeyboardEvent): void {
    // Cmd/Ctrl + K for fuzzy search focus
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      const searchInput = document.querySelector('.toolbar__search__input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
      this.fuzzySearchActive.set(true);
    }
    
    // Escape to clear fuzzy search
    if (event.key === 'Escape') {
      if (this.fuzzySearchActive()) {
        this.fuzzySearchActive.set(false);
        this.clearSearch();
      }
    }
    
    // Enter to open selected card in window
    if (event.key === 'Enter' && this.searchQuery()) {
      const cards = this.filteredCards();
      if (cards.length > 0) {
        this.openCardWindow(cards[0]);
      }
    }
  }

  // Navigation methods
  updateBreadcrumbs(page: string, icon: string): void {
    this.breadcrumbs.set([
      { label: 'Home', icon: '🏠' },
      { label: page, icon },
    ]);
  }

  // Search
  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  // View mode
  toggleViewMode(): void {
    this.viewMode.update(mode => mode === 'grid' ? 'list' : 'grid');
  }

  refreshMiddleContent(): void {
    // Future: implement refresh logic
    console.log('Refreshing content...');
  }

  // Card selection
  selectCard(card: Card): void {
    this.selectedCard.set(card);
  }

  openCardWindow(card: Card): void {
    if (card.id === 1) {
      this.openAuthWindow();
    } else if (card.id === 2) {
      this.openSqliteWindow();
    } else {
      // For other cards, create a generic window
      this.createWindow(`card-window-${card.id}`, `${card.icon} ${card.title}`, 'generic', card);
    }
  }

  closeRightPanel(): void {
    this.selectedCard.set(null);
  }

  showAppInfo(): void {
    this.createWindow('app-info-window', 'App Info', 'generic', {
      id: 0,
      title: 'Application Info',
      description: 'This is a two-column layout application.',
      icon: 'Info',
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      type: 'App',
      date: new Date().toISOString().split('T')[0],
    });
  }

  toggleColumnWidth(): void {
    this.leftColumnSize.set(this.leftColumnSize() === 25 ? 75 : 25);
  }

  // Resizing logic
  startResize(event: MouseEvent): void {
    this.isResizing = true;
    this.activeSplitter = 'left';
    this.resizeStartX = event.clientX;
    this.resizeStartSize = this.leftColumnSize();
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    event.preventDefault();
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isResizing || this.activeSplitter !== 'left') return;

    const deltaX = event.clientX - this.resizeStartX;
    const windowWidth = window.innerWidth;
    const deltaPercent = (deltaX / windowWidth) * 100;

    const newSize = Math.max(15, Math.min(85, this.resizeStartSize + deltaPercent));
    this.leftColumnSize.set(newSize);
  }

  onMouseUp(): void {
    this.isResizing = false;
    this.activeSplitter = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  // Window management
  closeAllWindows(): void {
    const boxesToClose = [...this.existingBoxes];

    for (const box of boxesToClose) {
      if (box) {
        try {
          if (box.min) {
            box.restore();
          }
          box.focus();
          box.close(true);
        } catch {
          // Ignore errors
        }
      }
    }

    setTimeout(() => {
      const winboxElements = document.querySelectorAll('.winbox');
      winboxElements.forEach((el) => {
        try {
          el.remove();
        } catch {
          // Ignore errors
        }
      });

      this.existingBoxes = [];
      this.windowEntries.set([]);
    }, 50);
  }

  openAuthWindow(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.createWindow(this.authWindowId, '🔐 Authentication', 'auth');
  }

  openSqliteWindow(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.createWindow(this.sqliteWindowId, '🗄️ SQLite CRUD', 'sqlite');
  }

  private createWindow(
    windowId: string,
    title: string,
    type: 'auth' | 'sqlite' | 'generic',
    card?: Card
  ): void {
    const WinBoxConstructor = (window as any).WinBox;

    if (!WinBoxConstructor) {
      console.error('WinBox not available');
      return;
    }

    // Check for existing window
    const existingBox = this.existingBoxes.find(box => box?.__windowId === windowId);
    if (existingBox) {
      if (existingBox.min) existingBox.restore();
      existingBox.focus();
      this.markWindowFocused(windowId, title);
      return;
    }

    try {
      // Calculate window position within available viewport
      const viewport = this.getAvailableViewport();
      const windowWidth = card ? 600 : Math.min(500, viewport.width * 0.8);
      const windowHeight = type === 'auth' ? Math.min(600, viewport.height * 0.7) : Math.min(550, viewport.height * 0.7);
      const x = viewport.left + (viewport.width - windowWidth) / 2;
      const y = viewport.top + (viewport.height - windowHeight) / 2;

      const background = card
        ? card.color
        : type === 'auth'
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)';

       const box = new WinBoxConstructor({
         id: windowId,
         title: title,
         background,
         width: '100%',
         height: '100%',
         x: 0,
         y: 0,
         minwidth: 350,
         minheight: type === 'auth' ? 450 : 400,
         maxwidth: 800,
         maxheight: 700,
         html: this.getWindowHtml(type, card),
         controls: {
           minimize: true,
           maximize: true,
           close: true,
         },
       });

      if (!box) {
        return;
      }

      box.__windowId = windowId;
      box.__cardTitle = title;
      this.existingBoxes.push(box);

      box.onfocus = () => this.markWindowFocused(windowId, title);
      box.onminimize = () => this.markWindowMinimized(windowId, title);
      box.onmaximize = () => {
        (box as any).__isMaximized = true;
      };
      box.onclose = () => {
        const index = this.existingBoxes.indexOf(box);
        if (index > -1) {
          this.existingBoxes.splice(index, 1);
        }
        this.windowEntries.update(entries => entries.filter(entry => entry.id !== windowId));
        return true;
      };

      this.windowEntries.update(entries => [
        ...entries.map(e => ({ ...e, focused: false })),
        {
          id: windowId,
          title: title,
          minimized: false,
          focused: true,
        },
      ]);

      // Focus the new window
      setTimeout(() => {
        box.focus();
      }, 10);
    } catch (error) {
      console.error('Failed to create window:', error);
    }
  }

  private getWindowHtml(type: string, card?: Card): string {
    if (type === 'auth') {
      return `<div id="auth-root-${this.authWindowId}" style="height: 100%; width: 100%; overflow: auto;"></div>`;
    }
    if (type === 'sqlite') {
      return `<div id="sqlite-root-${this.sqliteWindowId}" style="height: 100%; width: 100%; overflow: auto;"></div>`;
    }
    // Generic window for cards
    return `
      <div style="padding: 20px; color: white;">
        <h2 style="margin-bottom: 10px;">${card?.title || 'Window'}</h2>
        <p style="opacity: 0.8;">${card?.description || 'Content coming soon...'}</p>
        <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px;">
          <p style="font-size: 14px;">This is a placeholder for future content.</p>
        </div>
      </div>
    `;
  }

  private getAvailableViewport(): { left: number; top: number; width: number; height: number } {
    const sidebarWidth = this.leftColumnCollapsed() ? 0 : (this.leftColumnSize() / 100) * window.innerWidth;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 800;

    return {
      left: sidebarWidth + 20,
      top: 100, // Account for toolbar
      width: windowWidth - sidebarWidth - 40,
      height: windowHeight - 140, // Account for toolbar and status bar
    };
  }

  activateWindow(windowId: string, event: Event): void {
    event.stopPropagation();
    const box = this.existingBoxes.find(box => box?.__windowId === windowId);
    if (!box) {
      this.windowEntries.update(entries => entries.filter(entry => entry.id !== windowId));
      return;
    }
    if (box.min) box.restore();
    box.focus();
    this.markWindowFocused(windowId, box.__cardTitle || 'Window');
  }

  private markWindowFocused(windowId: string, title: string): void {
    this.windowEntries.update(entries =>
      entries.map(entry => ({
        ...entry,
        focused: entry.id === windowId,
        minimized: entry.id === windowId ? false : entry.minimized,
      }))
    );
  }

  private markWindowMinimized(windowId: string, title: string): void {
    this.windowEntries.update(entries =>
      entries.map(entry =>
        entry.id === windowId ? { ...entry, minimized: true, focused: false } : entry
      )
    );
  }
}
