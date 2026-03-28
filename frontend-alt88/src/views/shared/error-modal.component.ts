import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface ErrorModalState {
  title: string;
  userMessage: string;
  error: {
    code: string;
    field?: string;
  };
}

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

            @if (error.error.code) {
              <div class="error-code-block">
                <span class="code-label">Code:</span>
                <code>{{ error.error.code }}</code>
              </div>
            }
          </div>

          <footer class="error-footer">
            <button type="button" class="btn btn--primary" (click)="dismissed.emit()">
              <span>Dismiss</span>
            </button>
          </footer>
        </section>
      </div>
    }
  `,
  styles: [`
    .error-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .error-modal {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      max-width: 450px;
      width: 90%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .error-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.5rem;
      border-bottom: 1px solid #334155;
    }

    .error-title-wrapper {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .error-icon {
      font-size: 1.5rem;
    }

    .error-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    .error-close {
      background: #334155;
      border: none;
      color: #e2e8f0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .error-close:hover {
      background: #475569;
    }

    .error-body {
      padding: 1.5rem;
    }

    .error-message {
      margin: 0 0 1rem 0;
      color: #cbd5e1;
      line-height: 1.6;
    }

    .error-field-badge,
    .error-code-block {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      background: #334155;
      border-radius: 6px;
      font-size: 0.85rem;
      margin-right: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .field-label,
    .code-label {
      color: #94a3b8;
      font-size: 0.75rem;
      text-transform: uppercase;
    }

    .error-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #334155;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .btn {
      padding: 0.6rem 1.25rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }

    .btn--primary {
      background: #3b82f6;
      color: white;
    }

    .btn--primary:hover {
      background: #2563eb;
    }

    .btn--secondary {
      background: #475569;
      color: #e2e8f0;
    }

    .btn--secondary:hover {
      background: #64748b;
    }
  `]
})
export class ErrorModalComponent {
  @Input() error: ErrorModalState | null = null;
  @Output() dismissed = new EventEmitter<void>();

  getErrorIcon(code: string): string {
    if (code?.includes('NETWORK') || code?.includes('CONNECTION')) return '🌐';
    if (code?.includes('AUTH') || code?.includes('PERMISSION')) return '🔒';
    if (code?.includes('VALIDATION') || code?.includes('FIELD')) return '⚠️';
    if (code?.includes('SERVER') || code?.includes('DATABASE')) return '🔥';
    return '❌';
  }
}
