/**
 * Loading Spinner Component
 * 
 * Reusable loading spinner with customizable size and color
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="spinner-container" 
      [class.centered]="centered"
      [style.width]="size"
      [style.height]="size">
      <div class="spinner" [class]="'spinner-' + color"></div>
      @if (label) {
        <span class="spinner-label">{{ label }}</span>
      }
    </div>
  `,
  styles: [`
    .spinner-container {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .spinner-container.centered {
      display: flex;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
    }

    .spinner {
      border: 3px solid transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .spinner-primary {
      border-top-color: #3b82f6;
      border-right-color: #3b82f6;
      border-bottom-color: rgba(59, 130, 246, 0.2);
      border-left-color: rgba(59, 130, 246, 0.2);
    }

    .spinner-success {
      border-top-color: #10b981;
      border-right-color: #10b981;
      border-bottom-color: rgba(16, 185, 129, 0.2);
      border-left-color: rgba(16, 185, 129, 0.2);
    }

    .spinner-warning {
      border-top-color: #f59e0b;
      border-right-color: #f59e0b;
      border-bottom-color: rgba(245, 158, 11, 0.2);
      border-left-color: rgba(245, 158, 11, 0.2);
    }

    .spinner-danger {
      border-top-color: #ef4444;
      border-right-color: #ef4444;
      border-bottom-color: rgba(239, 68, 68, 0.2);
      border-left-color: rgba(239, 68, 68, 0.2);
    }

    .spinner-label {
      font-size: 14px;
      color: #94a3b8;
      font-weight: 500;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class LoadingSpinnerComponent {
  @Input() size = '40px';
  @Input() color: 'primary' | 'success' | 'warning' | 'danger' = 'primary';
  @Input() centered = false;
  @Input() label?: string;
}
