import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, provideEnvironmentInitializer } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WinBoxService, type WinBoxInstance } from '../core/winbox.service';
import { LucideAngularModule, LucideIconProvider, LUCIDE_ICONS, icons } from 'lucide-angular';

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
export type AppView = 'home' | 'auth' | 'sqlite' | 'devtools';

const TECH_CARDS: Card[] = [
  { id: 1, title: 'Authentication', description: 'Login & Register', icon: 'lock', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', type: 'Feature', date: '2026-03-16' },
  { id: 2, title: 'SQLite CRUD', description: 'Database Operations', icon: 'database', color: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)', type: 'Feature', date: '2026-03-16' },
  { id: 3, title: 'DevTools', description: 'Debugging Tools', icon: 'tool', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', type: 'Tool', date: '2026-03-15' },
  { id: 4, title: 'System Info', description: 'System Monitoring', icon: 'bar-chart-2', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', type: 'Monitor', date: '2026-03-15' },
  { id: 5, title: 'Network', description: 'Network Stats', icon: 'globe', color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', type: 'Monitor', date: '2026-03-14' },
  { id: 6, title: 'Processes', description: 'Process Manager', icon: 'settings', color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', type: 'Tool', date: '2026-03-14' },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(icons) },
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  private readonly winboxService = inject(WinBoxService);

  // Column sizes (percentages, must sum to 100)
  readonly leftColumnSize = signal(25); // Left column (menu)
  readonly middleColumnSize = signal(25); // Middle column (content)
  readonly rightColumnSize = signal(75); // Right column (content)
  
  // Toggle layout mode
  toggleLayoutMode(): void {
    const currentMode = this.layoutMode();
    const newMode = currentMode === 'main-left' ? 'main-right' : 'main-left';
    this.layoutMode.set(newMode);
    
    // Update column sizes based on layout mode
    if (newMode === 'main-left') {
      // Left column 25%, Right column 75%
      this.leftColumnSize.set(25);
      this.rightColumnSize.set(75);
    } else {
      // Left column 75%, Right column 25%
      this.leftColumnSize.set(75);
      this.rightColumnSize.set(25);
    }
  }
  
  // Column collapsed state
  readonly leftColumnCollapsed = signal(true); // Always collapsed

  // Navigation state
  readonly activeNavigation = signal<string>('favorites');
  readonly activeView = signal<AppView>('home');
  readonly searchQuery = signal('');
  readonly viewMode = signal<ViewMode>('grid');
  readonly selectedCard = signal<Card | null>(null);
  readonly fuzzySearchActive = signal(false);
  readonly showAppInfo = signal(false);
  
  // Layout mode for switching between main-left and main-right
  readonly layoutMode = signal<'main-left' | 'main-right'>('main-left');
  
  // Menu search
  readonly menuSearchQuery = signal('');

  // Menu selection state
  readonly selectedMainMenu = signal<number | null>(null);
  readonly selectedSupportMenu = signal<number | null>(null);

   // Menu items definition
   readonly mainMenuItems = [
     { icon: 'chart-column', label: 'Dashboard', value: 1 },
     { icon: 'folder', label: 'Files', value: 2 },
     { icon: 'users', label: 'Users', value: 3 },
     { icon: 'settings', label: 'Settings', value: 4 },
     { icon: 'bell', label: 'Notifications', value: 5 },
     { icon: 'file-text', label: 'Reports', value: 6 },
   ];

   readonly supportMenuItems = [
     { icon: 'circle-question-mark', label: 'Help', value: 1 },
     { icon: 'message-square', label: 'Contact', value: 2 },
     { icon: 'book', label: 'Documentation', value: 3 },
     { icon: 'square-plus', label: 'Updates', value: 4 },
   ];
  
  // Filtered menu items based on search
  readonly filteredMainMenu = computed(() => {
    const query = this.menuSearchQuery().toLowerCase();
    if (!query) {
      return this.mainMenuItems;
    }
    return this.mainMenuItems.filter(item => item.label.toLowerCase().includes(query));
  });
  
  readonly filteredSupportMenu = computed(() => {
    const query = this.menuSearchQuery().toLowerCase();
    if (!query) {
      return this.supportMenuItems;
    }
    return this.supportMenuItems.filter(item => item.label.toLowerCase().includes(query));
  });
  
   // Reactive menu item for second column based on selection
   readonly menuItems = computed(() => {
     const mainId = this.selectedMainMenu();
     const supportId = this.selectedSupportMenu();

     if (mainId === 1) {
       return { icon: 'chart-column', title: 'Overview Dashboard' };
     }
     if (mainId === 2) {
       return { icon: 'folder', title: 'File Manager' };
     }
     if (mainId === 3) {
       return { icon: 'user', title: 'User Management' };
     }
     if (mainId === 4) {
       return { icon: 'settings', title: 'System Settings' };
     }
     if (mainId === 5) {
       return { icon: 'bell', title: 'Notification Center' };
     }
     if (mainId === 6) {
       return { icon: 'file-text', title: 'Reports Dashboard' };
     }
     if (supportId === 1) {
       return { icon: 'circle-question-mark', title: 'Help Center' };
     }
     if (supportId === 2) {
       return { icon: 'message-square', title: 'Contact Support' };
     }
     if (supportId === 3) {
       return { icon: 'book', title: 'Documentation' };
     }
     if (supportId === 4) {
       return { icon: 'refresh-cw', title: 'Updates & Changes' };
     }

     // Default state when nothing is selected
     return { icon: 'list', title: 'Select a menu item' };
   });

  // Window management
  readonly windowEntries = signal<WindowEntry[]>([]);

  // Breadcrumb navigation
  readonly breadcrumbs = signal<{ label: string; icon: string }[]>([
    { label: 'Home', icon: '🏠' },
  ]);

  private existingBoxes: WinBoxInstance[] = [];
  private authWindowId = 'auth-window-1';
  private sqliteWindowId = 'sqlite-window-2';
  private isResizing = false;
  private resizeStartX = 0;
  private resizeStartSize = 0;
  private activeSplitter: 'left' | 'middle' | null = null;

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
     .filter(card => card.score > 0)
     .sort((a, b) => (b.score || 0) - (a.score || 0));
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
   };

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

  toggleAppInfo(): void {
    this.showAppInfo.update(v => !v);
  }

  closeAppInfo(): void {
    this.showAppInfo.set(false);
  }

  selectMainMenu(id: number): void {
    this.selectedMainMenu.set(id);
    this.selectedSupportMenu.set(null);
  }

  selectSupportMenu(id: number): void {
    this.selectedSupportMenu.set(id);
    this.selectedMainMenu.set(null);
  }

  getMainMenuName(id: number): string {
    const names: { [key: number]: string } = {
      1: 'Dashboard',
      2: 'Files',
      3: 'Users',
      4: 'Settings',
      5: 'Notifications',
      6: 'Reports',
    };
    return names[id] || 'Main Menu';
  }

  getMainMenuIcon(id: number): string {
    const icons: { [key: number]: string } = {
      1: 'chart-column',
      2: 'folder',
      3: 'users',
      4: 'settings',
      5: 'bell',
      6: 'file-text',
    };
    return icons[id] || 'chart-column';
  }

  getSupportMenuName(id: number): string {
    const names: { [key: number]: string } = {
      1: 'Help',
      2: 'Contact',
      3: 'Documentation',
      4: 'Updates',
    };
    return names[id] || 'Support';
  }

  getSupportMenuIcon(id: number): string {
    const icons: { [key: number]: string } = {
      1: 'circle-question-mark',
      2: 'message-square',
      3: 'book',
      4: 'square-plus',
    };
    return icons[id] || 'circle-question-mark';
  }

  onMenuSearchChange(): void {
    // The search is handled by the computed properties automatically
  }

  clearMenuSearch(): void {
    this.menuSearchQuery.set('');
  }

  // Resizing logic
  startResize(event: MouseEvent, splitter: 'left' | 'middle'): void {
    this.isResizing = true;
    this.resizeStartX = event.clientX;

    if (splitter === 'left') {
      this.activeSplitter = 'left';
      this.resizeStartSize = this.leftColumnSize();
    } else {
      this.activeSplitter = 'middle';
      this.resizeStartSize = this.middleColumnSize();
    }

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    event.preventDefault();
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isResizing) return;

    const deltaX = event.clientX - this.resizeStartX;
    const windowWidth = window.innerWidth;
    const deltaPercent = (deltaX / windowWidth) * 100;

    if (this.activeSplitter === 'left') {
      const newSize = Math.max(15, Math.min(30, this.resizeStartSize + deltaPercent));
      this.leftColumnSize.set(newSize);
      // Adjust middle column to compensate
      const remaining = 100 - newSize - this.rightColumnSize();
      this.middleColumnSize.set(Math.max(30, remaining));
    } else if (this.activeSplitter === 'middle') {
      const newSize = Math.max(30, Math.min(60, this.resizeStartSize + deltaPercent));
      this.middleColumnSize.set(newSize);
      // Adjust right column to compensate
      const remaining = 100 - this.leftColumnSize() - newSize;
      this.rightColumnSize.set(Math.max(20, remaining));
    }
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
         width: `${windowWidth}px`,
         height: `${windowHeight}px`,
         x: `${x}px`,
         y: `${y}px`,
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
         maximized: true,
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
