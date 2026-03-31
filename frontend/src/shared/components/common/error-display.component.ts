/**
 * Error Display Component
 * 
 * Reusable error display with icon, message, and retry action
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-error-display',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (error) {
      <div class="error-container" [class.compact]="compact">
        <div class="error-icon">❌</div>
        <div class="error-content">
          @if (title && !compact) {
            <h3 class="error-title">{{ title }}</h3>
          }
          <p class="error-message">{{ error }}</p>
          @if (showDetails && details) {
            <details class="error-details">
              <summary>Show details</summary>
              <pre class="error-stack">{{ details }}</pre>
            </details>
          }
        </div>
        @if (showRetry) {
          <button class="btn-retry" (click)="retry.emit()">
            🔄 Retry
          </button>
        }
        @if (showDismiss) {
          <button class="btn-dismiss" (click)="dismiss.emit()">
            ✕
          </button>
        }
      </div>
    }
  `,
  styles: [`
    .error-container {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 12px;
      align-items: flex-start;
    }

    .error-container.compact {
      padding: 12px;
      gap: 12px;
    }

    .error-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .error-content {
      flex: 1;
      min-width: 0;
    }

    .error-title {
      font-size: 16px;
      font-weight: 600;
      color: #ef4444;
      margin: 0 0 8px;
    }

    .error-message {
      font-size: 14px;
      color: #fca5a5;
      margin: 0;
      word-wrap: break-word;
    }

    .error-details {
      margin-top: 12px;
    }

    .error-details summary {
      font-size: 13px;
      color: #94a3b8;
      cursor: pointer;
    }

    .error-stack {
      margin-top: 8px;
      padding: 12px;
      background: rgba(15, 23, 42, 0.8);
      border-radius: 6px;
      font-family: 'Fira Code', monospace;
      font-size: 12px;
      color: #fca5a5;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .btn-retry {
      padding: 8px 16px;
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      color: #ef4444;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .btn-retry:hover {
      background: rgba(239, 68, 68, 0.3);
    }

    .btn-dismiss {
      padding: 4px 8px;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: #94a3b8;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .btn-dismiss:hover {
      background: rgba(148, 163, 184, 0.1);
      color: #fff;
    }
  `]
})
export class ErrorDisplayComponent {
  @Input() error: string | null = null;
  @Input() title = 'Error';
  @Input() details?: string;
  @Input() compact = false;
  @Input() showRetry = false;
  @Input() showDismiss = false;
  @Input() showDetails = false;

  @Output() retry = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();
}
