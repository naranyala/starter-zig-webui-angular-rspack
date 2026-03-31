/**
 * Empty State Component
 * 
 * Reusable empty state display with icon, message, and action button
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state" [class.compact]="compact">
      <div class="empty-icon" [style.font-size]="iconSize">
        {{ icon }}
      </div>
      @if (title) {
        <h3 class="empty-title">{{ title }}</h3>
      }
      @if (message) {
        <p class="empty-message">{{ message }}</p>
      }
      @if (actionLabel) {
        <button class="btn-action" (click)="action.emit()">
          {{ actionLabel }}
        </button>
      }
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
    }

    .empty-state.compact {
      padding: 32px 16px;
    }

    .empty-icon {
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 8px;
    }

    .empty-message {
      font-size: 14px;
      color: #94a3b8;
      margin: 0 0 24px;
      max-width: 400px;
    }

    .btn-action {
      padding: 12px 24px;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      border: none;
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s;
    }

    .btn-action:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon = '📭';
  @Input() iconSize = '48px';
  @Input() title = '';
  @Input() message = '';
  @Input() actionLabel = '';
  @Input() compact = false;

  @Output() action = new EventEmitter<void>();
}
