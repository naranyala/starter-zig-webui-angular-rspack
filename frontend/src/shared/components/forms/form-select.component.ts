/**
 * Form Select Component
 * 
 * Reusable form select with label, validation, and error display
 */

import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: string;
}

@Component({
  selector: 'app-form-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormSelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="form-select-container" [class.has-error]="error">
      @if (label) {
        <label class="form-label" [for]="id">
          {{ label }}
          @if (required) {
            <span class="required">*</span>
          }
        </label>
      }
      
      <div class="select-wrapper">
        <select
          [id]="id"
          [value]="value"
          (input)="onInput($event)"
          (blur)="onTouched()"
          [disabled]="disabled"
          class="form-select"
          [class.has-error]="error">
          @if (placeholder) {
            <option value="" disabled>{{ placeholder }}</option>
          }
          @for (option of options; track option.value) {
            <option 
              [value]="option.value" 
              [disabled]="option.disabled">
              @if (option.icon) {
                {{ option.icon }} 
              }
              {{ option.label }}
            </option>
          }
        </select>
        <span class="select-arrow">▼</span>
      </div>
      
      @if (error) {
        <span class="error-message">{{ error }}</span>
      }
      
      @if (hint && !error) {
        <span class="hint-message">{{ hint }}</span>
      }
    </div>
  `,
  styles: [`
    .form-select-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .required {
      color: #ef4444;
    }

    .select-wrapper {
      position: relative;
    }

    .form-select {
      width: 100%;
      padding: 10px 36px 10px 14px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.8);
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
    }

    .form-select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-select.has-error {
      border-color: #ef4444;
    }

    .form-select.has-error:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .form-select:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .select-arrow {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 10px;
      color: #94a3b8;
      pointer-events: none;
    }

    .error-message {
      font-size: 12px;
      color: #ef4444;
    }

    .hint-message {
      font-size: 12px;
      color: #64748b;
    }
  `]
})
export class FormSelectComponent implements ControlValueAccessor {
  @Input() id = `select-${Math.random().toString(36).substr(2, 9)}`;
  @Input() label = '';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() options: SelectOption[] = [];
  @Input() error = '';
  @Input() hint = '';

  @Output() valueChange = new EventEmitter<string | number>();

  value: string | number = '';

  onChange: (value: string | number) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: string | number): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string | number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    this.value = value;
    this.onChange(value);
    this.valueChange.emit(value);
  }
}
