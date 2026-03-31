/**
 * Confirm Dialog Component
 * 
 * Reusable confirmation dialog with customizable title, message, and buttons
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
      <div class="dialog-overlay" (click)="onOverlayClick()">
        <div class="dialog-container" [class]="'dialog-' + type" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <span class="dialog-icon">{{ getIcon() }}</span>
            <h3 class="dialog-title">{{ title }}</h3>
          </div>
          
          <div class="dialog-content">
            <p class="dialog-message">{{ message }}</p>
            @if (details) {
              <p class="dialog-details">{{ details }}</p>
            }
          </div>
          
          <div class="dialog-actions">
            <button 
              class="btn btn-cancel" 
              (click)="cancel.emit()"
              [disabled]="loading">
              {{ cancelLabel }}
            </button>
            <button 
              class="btn btn-confirm" 
              [class]="'btn-confirm-' + type"
              (click)="confirm.emit()"
              [disabled]="loading">
              @if (loading) {
                <span class="spinner-small"></span>
              }
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease;
    }

    .dialog-container {
      background: rgba(30, 41, 59, 0.95);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 16px;
      padding: 24px;
      max-width: 480px;
      width: 90%;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      animation: slideIn 0.3s ease;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .dialog-icon {
      font-size: 32px;
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }

    .dialog-content {
      margin-bottom: 24px;
    }

    .dialog-message {
      font-size: 15px;
      color: #e2e8f0;
      margin: 0 0 8px;
      line-height: 1.6;
    }

    .dialog-details {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-cancel {
      background: rgba(148, 163, 184, 0.1);
      color: #94a3b8;
    }

    .btn-cancel:hover:not(:disabled) {
      background: rgba(148, 163, 184, 0.2);
      color: #fff;
    }

    .btn-confirm {
      color: #fff;
    }

    .btn-confirm-danger {
      background: linear-gradient(135deg, #ef4444, #dc2626);
    }

    .btn-confirm-danger:hover:not(:disabled) {
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
    }

    .btn-confirm-primary {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
    }

    .btn-confirm-primary:hover:not(:disabled) {
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
    }

    .btn-confirm-success {
      background: linear-gradient(135deg, #10b981, #059669);
    }

    .btn-confirm-success:hover:not(:disabled) {
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
    }

    .btn-confirm-warning {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }

    .btn-confirm-warning:hover:not(:disabled) {
      box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
    }

    .spinner-small {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title = 'Confirm';
  @Input() message = 'Are you sure?';
  @Input() details?: string;
  @Input() type: 'primary' | 'success' | 'warning' | 'danger' = 'primary';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() loading = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  getIcon(): string {
    const icons = {
      primary: '❓',
      success: '✅',
      warning: '⚠️',
      danger: '⛔',
    };
    return icons[this.type];
  }

  onOverlayClick(): void {
    this.cancel.emit();
  }
}
