import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { RootErrorState } from '../../core/global-error.service';
import { ErrorCode } from '../../types';

@Component({
  selector: 'app-error-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (error) {
      <div class="error-backdrop" (click)="dismissed.emit()">
        <section class="error-modal" role="dialog" aria-modal="true" aria-label="Application error" (click)="$event.stopPropagation()">
          <header class="error-header">
            <div class="error-title-wrapper">
              <span class="error-icon">{{ getErrorIcon(error.error.code) }}</span>
              <h2 class="error-title">{{ error.title }}</h2>
            </div>
            <button type="button" class="error-close" (click)="dismissed.emit()" aria-label="Close error dialog" title="Close">✕</button>
          </header>

          <div class="error-body">
            <p class="error-message">{{ error.userMessage }}</p>

            @if (error.error.field) {
              <div class="error-field-badge">
                <span class="field-label">Field:</span>
                <strong>{{ error.error.field }}</strong>
              </div>
            }

            @if (getContextEntries(error.error.context).length > 0) {
              <div class="error-context">
                <h4>Context</h4>
                <div class="context-grid">
                  @for (entry of getContextEntries(error.error.context); track entry.key) {
                    <div class="context-item">
                      <span class="context-key">{{ entry.key }}:</span>
                      <span class="context-value">{{ entry.value }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            @if (error.error.cause) {
              <div class="error-cause">
                <strong>Cause:</strong>
                <span>{{ error.error.cause }}</span>
              </div>
            }
          </div>

          <footer class="error-footer">
            <div class="error-meta">
              <span class="error-code" [title]="error.error.code">
                <span class="code-label">Code:</span>
                {{ error.error.code }}
              </span>
              <span class="error-source" title="Error source">
                <span class="source-label">Source:</span>
                {{ error.source }}
              </span>
              <span class="error-timestamp" [title]="'Occurred at ' + error.timestamp">
                {{ formatTimestamp(error.timestamp) }}
              </span>
            </div>

            @if (error.error.details) {
              <details class="error-details-block">
                <summary>
                  <span class="summary-icon"></span>
                  <span>Technical Details</span>
                  <span class="summary-hint">(Click to expand)</span>
                </summary>
                <div class="error-details-wrapper">
                  <pre class="error-details">{{ formatDetails(error.error.details) }}</pre>
                  <button class="copy-details-btn" (click)="copyDetails(error.error.details)" title="Copy to clipboard">
                    Copy
                  </button>
                </div>
              </details>
            }
          </footer>
        </section>
      </div>
    }
  `,
  styles: [
    `
    .error-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(5, 6, 12, 0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
      box-sizing: border-box;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .error-modal {
      width: min(720px, 100%);
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e6e8ef;
      box-shadow: 0 24px 64px rgba(12, 16, 35, 0.3);
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1d2433;
      overflow: hidden;
    }

    .error-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 24px;
      background: linear-gradient(135deg, #f8f9fc 0%, #ffffff 100%);
      border-bottom: 1px solid #e6e8ef;
    }

    .error-title-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .error-icon {
      font-size: 28px;
      line-height: 1;
    }

    .error-title {
      margin: 0;
      font-size: 20px;
      line-height: 1.3;
      font-weight: 600;
      color: #1d2433;
    }

    .error-close {
      border: none;
      background: #f2f4fa;
      color: #394056;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .error-close:hover {
      background: #e4e7f0;
      transform: scale(1.05);
    }

    .error-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }

    .error-message {
      margin: 0 0 16px;
      line-height: 1.6;
      color: #2a3246;
      font-size: 15px;
      font-weight: 400;
    }

    .error-field-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: #fff4e6;
      border: 1px solid #ffd8a8;
      border-radius: 6px;
      font-size: 13px;
      color: #865b00;
      margin-bottom: 16px;
    }

    .field-label {
      opacity: 0.8;
    }

    .error-context {
      margin: 16px 0;
      padding: 16px;
      background: #f8f9fc;
      border-radius: 8px;
      border: 1px solid #e6e8ef;
    }

    .error-context h4 {
      margin: 0 0 12px;
      font-size: 13px;
      font-weight: 600;
      color: #667089;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .context-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 8px;
    }

    .context-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px;
      background: #ffffff;
      border-radius: 6px;
      border: 1px solid #e6e8ef;
    }

    .context-key {
      font-size: 11px;
      color: #667089;
      font-weight: 500;
    }

    .context-value {
      font-size: 13px;
      color: #1d2433;
      font-family: 'SF Mono', 'Consolas', monospace;
    }

    .error-cause {
      padding: 14px 16px;
      background: #fff5f5;
      border-left: 4px solid #fc8181;
      border-radius: 6px;
      font-size: 14px;
      color: #c53030;
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }

    .error-cause strong {
      flex-shrink: 0;
    }

    .error-footer {
      padding: 20px 24px;
      background: #f8f9fc;
      border-top: 1px solid #e6e8ef;
    }

    .error-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      font-size: 12px;
      color: #667089;
      flex-wrap: wrap;
    }

    .error-code {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: #ffffff;
      border: 1px solid #e6e8ef;
      border-radius: 6px;
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 11px;
    }

    .code-label, .source-label {
      opacity: 0.6;
      font-weight: 400;
    }

    .error-source {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .error-timestamp {
      color: #8892a8;
      margin-left: auto;
    }

    .error-details-block {
      border: 1px solid #e6e8ef;
      border-radius: 8px;
      background: #ffffff;
      overflow: hidden;
    }

    .error-details-block summary {
      padding: 12px 16px;
      cursor: pointer;
      font-size: 13px;
      color: #394056;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f8f9fc;
      transition: background 0.2s;
    }

    .error-details-block summary:hover {
      background: #f2f4fa;
    }

    .summary-icon {
      font-size: 14px;
    }

    .summary-hint {
      margin-left: auto;
      opacity: 0.6;
      font-size: 12px;
    }

    .error-details-wrapper {
      position: relative;
    }

    .error-details {
      margin: 0;
      background: #0f1322;
      color: #e3ecff;
      padding: 16px;
      font-size: 12px;
      line-height: 1.6;
      overflow: auto;
      font-family: 'SF Mono', 'Consolas', monospace;
      max-height: 300px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .copy-details-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: #e3ecff;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .copy-details-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `,
  ],
})
export class ErrorModalComponent {
  @Input() error: RootErrorState | null = null;
  @Output() dismissed = new EventEmitter<void>();

  getErrorIcon(code: ErrorCode): string {
    switch (code) {
      case ErrorCode.ValidationFailed:
        return '!';
      case ErrorCode.ResourceNotFound:
      case ErrorCode.UserNotFound:
      case ErrorCode.EntityNotFound:
        return '?';
      case ErrorCode.DbAlreadyExists:
        return 'DB';
      case ErrorCode.DbConnectionFailed:
      case ErrorCode.DbQueryFailed:
      case ErrorCode.DbConstraintViolation:
        return 'DB';
      case ErrorCode.ConfigNotFound:
      case ErrorCode.ConfigInvalid:
      case ErrorCode.ConfigMissingField:
        return 'CFG';
      case ErrorCode.SerializationFailed:
      case ErrorCode.DeserializationFailed:
      case ErrorCode.InvalidFormat:
        return 'ERR';
      case ErrorCode.InternalError:
      case ErrorCode.LockPoisoned:
        return 'ERR';
      case ErrorCode.Unknown:
        return '?';
      default:
        return 'X';
    }
  }

  getContextEntries(
    context: Record<string, string> | undefined | null
  ): Array<{ key: string; value: string }> {
    if (!context) return [];
    try {
      return Object.entries(context).map(([key, value]) => ({ key, value }));
    } catch {
      return [];
    }
  }

  formatTimestamp(timestamp: string): string {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  }

  formatDetails(details: string): string {
    // Try to format JSON nicely
    try {
      const parsed = JSON.parse(details);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return details;
    }
  }

  copyDetails(details: string): void {
    navigator.clipboard
      .writeText(details)
      .then(() => {})
      .catch(err => {
        console.error('Failed to copy details:', err);
      });
  }
}
