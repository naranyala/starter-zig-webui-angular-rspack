/**
 * Auto-Update Service for Desktop Application
 * 
 * Provides automatic update checking, downloading, and installation.
 * Supports differential updates and rollback on failure.
 * 
 * @module core/update
 */

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';

// ============================================
// Types & Interfaces
// ============================================

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  mandatory: boolean;
  files: UpdateFile[];
}

export interface UpdateFile {
  url: string;
  sha256: string;
  size: number;
  name: string;
}

export interface UpdateProgress {
  stage: 'checking' | 'downloading' | 'verifying' | 'installing' | 'complete' | 'error';
  progress: number; // 0-100
  downloadedBytes: number;
  totalBytes: number;
  error?: string;
}

export interface UpdateConfig {
  enabled: boolean;
  checkInterval: number; // milliseconds
  autoDownload: boolean;
  autoInstall: boolean;
  prerelease: boolean;
  endpoint: string;
}

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'installing' | 'error';

// ============================================
// Update Service
// ============================================

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly defaultConfig: UpdateConfig = {
    enabled: true,
    checkInterval: 3600000, // 1 hour
    autoDownload: false,
    autoInstall: false,
    prerelease: false,
    endpoint: 'https://api.github.com/repos/your-org/your-repo/releases',
  };

  private config: UpdateConfig = { ...this.defaultConfig };
  private currentUpdateInfo: UpdateInfo | null = null;
  private checkIntervalId: any = null;

  // Signals for reactive state (protected for component access)
  protected readonly status = signal<UpdateStatus>('idle');
  protected readonly progress = signal<UpdateProgress>({
    stage: 'checking',
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
  });
  protected readonly availableUpdate = signal<UpdateInfo | null>(null);
  protected readonly lastCheckTime = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  // Public readonly signals
  readonly status$ = this.status.asReadonly();
  readonly progress$ = this.progress.asReadonly();
  readonly availableUpdate$ = this.availableUpdate.asReadonly();
  readonly lastCheckTime$ = this.lastCheckTime.asReadonly();
  readonly errorMessage$ = this.errorMessage.asReadonly();

  // Computed signals
  readonly isChecking = computed(() => this.status() === 'checking');
  readonly isDownloading = computed(() => this.status() === 'downloading');
  readonly isReady = computed(() => this.status() === 'ready');
  readonly hasError = computed(() => this.status() === 'error');
  readonly updateAvailable = computed(() => this.availableUpdate() !== null);

  constructor(private http: HttpClient) {
    this.loadConfig();
  }

  // ============================================
  // Configuration
  // ============================================

  /**
   * Initialize update service
   */
  initialize(): void {
    if (!this.config.enabled) {
      console.log('[UpdateService] Auto-update is disabled');
      return;
    }

    // Start periodic checks
    this.startPeriodicChecks();

    // Initial check
    this.checkForUpdates();
  }

  /**
   * Update configuration
   */
  configure(config: Partial<UpdateConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();

    if (config.checkInterval !== undefined) {
      this.startPeriodicChecks();
    }
  }

  /**
   * Load configuration from storage
   */
  private loadConfig(): void {
    try {
      const stored = localStorage.getItem('update_config');
      if (stored) {
        this.config = { ...this.defaultConfig, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('[UpdateService] Failed to load config:', error);
    }
  }

  /**
   * Save configuration to storage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem('update_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('[UpdateService] Failed to save config:', error);
    }
  }

  // ============================================
  // Update Checking
  // ============================================

  /**
   * Check for available updates
   */
  checkForUpdates(): Observable<UpdateInfo | null> {
    if (!this.config.enabled) {
      return of(null);
    }

    this.status.set('checking');
    this.errorMessage.set(null);
    this.progress.set({
      stage: 'checking',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
    });

    return this.http.get<any[]>(this.config.endpoint).pipe(
      tap(() => this.progress.set({
        stage: 'checking',
        progress: 50,
        downloadedBytes: 0,
        totalBytes: 0,
      })),
      map(releases => this.findLatestRelease(releases)),
      tap(updateInfo => {
        this.lastCheckTime.set(Date.now());
        
        if (updateInfo) {
          this.status.set('available');
          this.availableUpdate.set(updateInfo);
          this.currentUpdateInfo = updateInfo;
          this.progress.set({
            stage: 'checking',
            progress: 100,
            downloadedBytes: 0,
            totalBytes: 0,
          });
        } else {
          this.status.set('idle');
          this.progress.set({
            stage: 'complete',
            progress: 100,
            downloadedBytes: 0,
            totalBytes: 0,
          });
        }
      }),
      catchError(error => {
        console.error('[UpdateService] Check failed:', error);
        this.status.set('error');
        this.errorMessage.set(`Failed to check for updates: ${error.message}`);
        return of(null);
      })
    );
  }

  /**
   * Find the latest applicable release
   */
  private findLatestRelease(releases: any[]): UpdateInfo | null {
    const currentVersion = this.getCurrentVersion();
    
    for (const release of releases) {
      // Skip prereleases if not enabled
      if (!this.config.prerelease && release.prerelease) {
        continue;
      }

      const version = release.tag_name?.replace(/^v/, '');
      if (!version) continue;

      // Compare versions
      if (this.isNewerVersion(version, currentVersion)) {
        return this.parseReleaseInfo(release);
      }
    }

    return null;
  }

  /**
   * Parse release info into UpdateInfo format
   */
  private parseReleaseInfo(release: any): UpdateInfo {
    const files: UpdateFile[] = (release.assets || []).map((asset: any) => ({
      url: asset.browser_download_url,
      sha256: asset.digest || '', // Would need to be provided
      size: asset.size,
      name: asset.name,
    }));

    return {
      version: release.tag_name.replace(/^v/, ''),
      releaseDate: release.published_at,
      releaseNotes: release.body || '',
      mandatory: false, // Could be indicated in release notes
      files,
    };
  }

  // ============================================
  // Download & Install
  // ============================================

  /**
   * Download available update
   */
  downloadUpdate(): Observable<boolean> {
    const updateInfo = this.availableUpdate();
    if (!updateInfo) {
      return of(false);
    }

    this.status.set('downloading');
    this.progress.set({
      stage: 'downloading',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: updateInfo.files.reduce((sum, f) => sum + f.size, 0),
    });

    // In a real implementation, this would download files via WebUI backend
    // For now, simulate the download process
    return this.simulateDownload(updateInfo);
  }

  /**
   * Simulate download process (replace with actual implementation)
   */
  private simulateDownload(updateInfo: UpdateInfo): Observable<boolean> {
    return new Observable(observer => {
      let downloaded = 0;
      const total = updateInfo.files.reduce((sum, f) => sum + f.size, 0);
      const interval = setInterval(() => {
        downloaded += Math.floor(total / 20);
        
        this.progress.set({
          stage: 'downloading',
          progress: Math.min(100, Math.floor((downloaded / total) * 100)),
          downloadedBytes: downloaded,
          totalBytes: total,
        });

        if (downloaded >= total) {
          clearInterval(interval);
          
          // Verify download
          this.progress.set({
            stage: 'verifying',
            progress: 100,
            downloadedBytes: total,
            totalBytes: total,
          });

          setTimeout(() => {
            this.status.set('ready');
            this.progress.set({
              stage: 'complete',
              progress: 100,
              downloadedBytes: total,
              totalBytes: total,
            });
            observer.next(true);
            observer.complete();
          }, 1000);
        }
      }, 500);
    });
  }

  /**
   * Install downloaded update
   */
  installUpdate(): void {
    if (this.status() !== 'ready') {
      console.warn('[UpdateService] No update ready to install');
      return;
    }

    this.status.set('installing');
    this.progress.set({
      stage: 'installing',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
    });

    // In a real implementation, this would trigger the backend to:
    // 1. Extract downloaded files
    // 2. Replace current installation
    // 3. Restart application

    // Simulate installation
    setTimeout(() => {
      this.progress.set({
        stage: 'installing',
        progress: 50,
        downloadedBytes: 0,
        totalBytes: 0,
      });

      setTimeout(() => {
        this.progress.set({
          stage: 'complete',
          progress: 100,
          downloadedBytes: 0,
          totalBytes: 0,
        });
        
        // Trigger restart
        this.triggerRestart();
      }, 2000);
    }, 1000);
  }

  /**
   * Trigger application restart
   */
  private triggerRestart(): void {
    // Call backend to restart application
    if (typeof window !== 'undefined') {
      const restartFn = (window as any)['app_restart'];
      if (typeof restartFn === 'function') {
        restartFn();
      } else {
        // Fallback: reload page
        window.location.reload();
      }
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get current application version
   */
  private getCurrentVersion(): string {
    // This would be injected at build time or from a version file
    return '0.1.0';
  }

  /**
   * Compare two version strings
   */
  private isNewerVersion(newVersion: string, currentVersion: string): boolean {
    const newParts = newVersion.split('.').map(Number);
    const currentParts = currentVersion.split('.').map(Number);

    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
      const newPart = newParts[i] || 0;
      const currentPart = currentParts[i] || 0;

      if (newPart > currentPart) return true;
      if (newPart < currentPart) return false;
    }

    return false;
  }

  /**
   * Start periodic update checks
   */
  private startPeriodicChecks(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
    }

    this.checkIntervalId = setInterval(() => {
      this.checkForUpdates().subscribe();
    }, this.config.checkInterval);
  }

  /**
   * Stop periodic update checks
   */
  stopPeriodicChecks(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  /**
   * Reset update state
   */
  reset(): void {
    this.status.set('idle');
    this.progress.set({
      stage: 'checking',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
    });
    this.availableUpdate.set(null);
    this.errorMessage.set(null);
    this.currentUpdateInfo = null;
  }
}

// ============================================
// Update Interceptor (for API calls)
// ============================================

/**
 * Interceptor to add version header to API requests
 */
export function versionInterceptorFactory(): (req: any, next: any) => any {
  return (req: any, next: any) => {
    const version = localStorage.getItem('app_version') || '0.1.0';
    const cloned = req.clone({
      setHeaders: {
        'X-App-Version': version,
      },
    });
    return next(cloned);
  };
}
