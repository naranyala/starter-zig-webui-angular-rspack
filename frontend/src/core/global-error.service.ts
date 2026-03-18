// Global error service - stub for error state management
import { Injectable, signal } from '@angular/core';
import { ErrorValue, ErrorCode } from '../types';

export interface RootErrorState {
  title: string;
  userMessage: string;
  error: ErrorValue;
  source?: string;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class GlobalErrorService {
  private readonly errorState = signal<RootErrorState | null>(null);

  readonly currentError = this.errorState.asReadonly();

  setError(error: RootErrorState): void {
    this.errorState.set(error);
  }

  setErrorFromErrorValue(errorValue: ErrorValue, title?: string): void {
    this.errorState.set({
      title: title ?? 'Error',
      userMessage: errorValue.message,
      error: errorValue,
      timestamp: Date.now(),
    });
  }

  clearError(): void {
    this.errorState.set(null);
  }
}
