/**
 * Update Modal Component
 * 
 * Displays update availability and progress to the user.
 */

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UpdateService } from './update.service';

@Component({
  selector: 'app-update-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showModal()) {
      <div class="update-modal-overlay" (click)="dismiss()">
        <div class="update-modal" (click)="$event.stopPropagation()">
          <div class="update-modal-header">
            <h2>
              @if (updateService.status$() === 'ready') {
                Ready to Install Update
              } @else if (updateService.isDownloading()) {
                Downloading Update
              } @else if (updateService.status$() === 'installing') {
                Installing Update
              } @else {
                Update Available
              }
            </h2>
            <button class="close-btn" (click)="dismiss()" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>

          <div class="update-modal-body">
            @if (updateService.status$() === 'available') {
              <div class="update-info">
                <p class="version-info">
                  Version <strong>{{ updateService.availableUpdate$()?.version }}</strong> is available
                </p>

                @if (updateService.availableUpdate$()?.releaseNotes) {
                  <div class="release-notes">
                    <h3>What's New</h3>
                    <div class="notes-content" [innerHTML]="formatReleaseNotes(updateService.availableUpdate$()?.releaseNotes || '')"></div>
                  </div>
                }

                <div class="update-actions">
                  <button class="btn btn-secondary" (click)="dismiss()">Later</button>
                  <button class="btn btn-primary" (click)="download()">Download</button>
                </div>
              </div>
            }

            @if (updateService.isDownloading()) {
              <div class="update-progress">
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    [style.width.%]="updateService.progress$().progress"
                  ></div>
                </div>
                <p class="progress-text">
                  {{ updateService.progress$().progress }}% complete
                </p>
              </div>
            }

            @if (updateService.status$() === 'ready') {
              <div class="update-ready">
                <div class="success-icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="22" stroke="#10B981" stroke-width="4"/>
                    <path d="M14 24L20 30L34 16" stroke="#10B981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <p>Update downloaded successfully!</p>
                <p class="restart-info">The application will restart to complete the installation.</p>

                <div class="update-actions">
                  <button class="btn btn-secondary" (click)="dismiss()">Later</button>
                  <button class="btn btn-primary" (click)="install()">Install Now</button>
                </div>
              </div>
            }

            @if (updateService.status$() === 'installing') {
              <div class="update-progress">
                <div class="spinner"></div>
                <p>Installing update...</p>
              </div>
            }

            @if (updateService.status$() === 'error') {
              <div class="update-error">
                <div class="error-icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="22" stroke="#EF4444" stroke-width="4"/>
                    <path d="M16 16L32 32M32 16L16 32" stroke="#EF4444" stroke-width="4" stroke-linecap="round"/>
                  </svg>
                </div>
                <p class="error-message">{{ updateService.errorMessage$() }}</p>
                <button class="btn btn-primary" (click)="dismiss()">OK</button>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .update-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(4px);
    }

    .update-modal {
      background: var(--bg-primary, #1e1e1e);
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-color, #333);
    }

    .update-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color, #333);
    }

    .update-modal-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary, #fff);
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary, #888);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }

    .close-btn:hover {
      background: var(--bg-hover, #333);
      color: var(--text-primary, #fff);
    }

    .update-modal-body {
      padding: 20px;
    }

    .version-info {
      font-size: 14px;
      color: var(--text-secondary, #aaa);
      margin-bottom: 16px;
    }

    .release-notes {
      background: var(--bg-secondary, #2a2a2a);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      max-height: 200px;
      overflow-y: auto;
    }

    .release-notes h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary, #fff);
    }

    .notes-content {
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-secondary, #aaa);
    }

    .notes-content ul {
      padding-left: 20px;
      margin: 8px 0;
    }

    .notes-content li {
      margin: 4px 0;
    }

    .update-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .btn {
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-secondary {
      background: var(--bg-secondary, #2a2a2a);
      color: var(--text-primary, #fff);
    }

    .btn-secondary:hover {
      background: var(--bg-hover, #333);
    }

    .btn-primary {
      background: #3B82F6;
      color: white;
    }

    .btn-primary:hover {
      background: #2563EB;
    }

    .progress-bar {
      height: 8px;
      background: var(--bg-secondary, #2a2a2a);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3B82F6, #8B5CF6);
      transition: width 0.3s ease;
    }

    .progress-text {
      text-align: center;
      font-size: 14px;
      color: var(--text-secondary, #aaa);
      margin: 0;
    }

    .update-ready {
      text-align: center;
      padding: 20px 0;
    }

    .success-icon {
      margin-bottom: 16px;
    }

    .update-ready p {
      font-size: 14px;
      color: var(--text-secondary, #aaa);
      margin: 8px 0;
    }

    .restart-info {
      font-size: 13px;
      color: var(--text-tertiary, #666);
    }

    .update-error {
      text-align: center;
      padding: 20px 0;
    }

    .error-icon {
      margin-bottom: 16px;
    }

    .error-message {
      font-size: 14px;
      color: var(--text-error, #EF4444);
      margin-bottom: 20px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--bg-secondary, #2a2a2a);
      border-top-color: #3B82F6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class UpdateModalComponent {
  protected updateService = inject(UpdateService);
  
  protected showModal = this.updateService.updateAvailable;

  dismiss(): void {
    // Don't actually dismiss, just hide the modal
    // The update will still be available
  }

  download(): void {
    this.updateService.downloadUpdate().subscribe();
  }

  install(): void {
    this.updateService.installUpdate();
  }

  formatReleaseNotes(notes: string): string {
    // Convert markdown-style lists to HTML
    return notes
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
      .replace(/<li>(.*?)<\/li>/gims, '<ul><li>$1</li></ul>')
      .replace(/<\/ul>\s*<ul>/g, '');
  }
}
