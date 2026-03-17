import { Injectable, signal } from '@angular/core';

export interface RootErrorState {
  title: string;
  userMessage: string;
  error: {
    code: string;
    message: string;
    details?: string;
    field?: string;
    cause?: string;
    context?: Record<string, string>;
  };
  source: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class GlobalErrorService {
  private readonly currentError = signal<RootErrorState | null>(null);

  readonly error$ = this.currentError.asReadonly();

  setError(error: RootErrorState): void {
    this.currentError.set(error);
  }

  clearError(): void {
    this.currentError.set(null);
  }
}
