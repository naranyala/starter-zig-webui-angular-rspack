/**
 * Form Input Component
 * 
 * Reusable form input with label, validation, and error display
 */

import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="form-input-container" [class.has-error]="error">
      @if (label) {
        <label class="form-label" [for]="id">
          {{ label }}
          @if (required) {
            <span class="required">*</span>
          }
        </label>
      }
      
      <div class="input-wrapper">
        @if (prefix) {
          <span class="input-prefix">{{ prefix }}</span>
        }
        
        @if (type === 'textarea') {
          <textarea
            [id]="id"
            [value]="value"
            (input)="onInput($event)"
            (blur)="onTouched()"
            [placeholder]="placeholder"
            [disabled]="disabled"
            [readonly]="readonly"
            [rows]="rows"
            class="form-textarea"
            [class.has-error]="error"></textarea>
        } @else {
          <input
            [id]="id"
            [type]="type"
            [value]="value"
            (input)="onInput($event)"
            (blur)="onTouched()"
            [placeholder]="placeholder"
            [disabled]="disabled"
            [readonly]="readonly"
            [min]="min"
            [max]="max"
            [step]="step"
            [attr.minlength]="minlength"
            [attr.maxlength]="maxlength"
            class="form-input"
            [class.has-error]="error" />
        }
        
        @if (suffix) {
          <span class="input-suffix">{{ suffix }}</span>
        }
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
    .form-input-container {
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

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .form-input,
    .form-textarea {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.8);
      color: #fff;
      font-size: 14px;
      transition: all 0.2s;
    }

    .form-input:focus,
    .form-textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-input.has-error,
    .form-textarea.has-error {
      border-color: #ef4444;
    }

    .form-input.has-error:focus,
    .form-textarea.has-error:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .form-input:disabled,
    .form-textarea:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .form-textarea {
      resize: vertical;
      font-family: inherit;
    }

    .input-prefix,
    .input-suffix {
      position: absolute;
      font-size: 13px;
      color: #94a3b8;
      pointer-events: none;
    }

    .input-prefix {
      left: 12px;
    }

    .input-suffix {
      right: 12px;
    }

    .form-input.has-prefix {
      padding-left: 32px;
    }

    .form-input.has-suffix {
      padding-right: 32px;
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
export class FormInputComponent implements ControlValueAccessor {
  @Input() id = `input-${Math.random().toString(36).substr(2, 9)}`;
  @Input() label = '';
  @Input() type: 'text' | 'email' | 'number' | 'password' | 'tel' | 'url' | 'textarea' | 'date' | 'datetime-local' | 'time' = 'text';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() min?: number | string;
  @Input() max?: number | string;
  @Input() step?: number;
  @Input() minlength?: number;
  @Input() maxlength?: number;
  @Input() rows = 4;
  @Input() prefix = '';
  @Input() suffix = '';
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
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const value = this.type === 'number' ? parseFloat(target.value) : target.value;
    this.value = value;
    this.onChange(value);
    this.valueChange.emit(value);
  }
}
