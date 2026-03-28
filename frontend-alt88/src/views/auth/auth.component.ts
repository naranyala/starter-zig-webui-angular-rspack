import { Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoggerService } from '../../core/logger.service';
import { ApiService } from '../../core/api.service';

interface AuthForm {
  username: string;
  email: string;
  password: string;
}

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-wrapper">
      <div class="auth-container">
        <div class="auth-header">
          <div class="auth-logo">
            <span class="logo-icon">A</span>
          </div>
          <h1 class="auth-title">Angular Demo</h1>
          <p class="auth-subtitle">Secure Authentication Portal</p>
        </div>

        <div class="auth-tabs">
          <button type="button" class="auth-tab" [class.active]="isLoginMode()" (click)="switchToLogin()">
            <span class="tab-icon">🔑</span>
            <span class="tab-label">Login</span>
          </button>
          <button type="button" class="auth-tab" [class.active]="!isLoginMode()" (click)="switchToRegister()">
            <span class="tab-icon">📝</span>
            <span class="tab-label">Register</span>
          </button>
        </div>

        @if (isLoginMode()) {
          <form class="auth-form" (ngSubmit)="handleLogin()">
            <div class="form-group">
              <label class="form-label" for="login-username">
                <span class="label-icon">👤</span>
                Username
              </label>
              <input type="text" id="login-username" class="form-input" placeholder="Enter your username"
                [value]="loginForm().username"
                (input)="updateLoginForm('username', $any($event).target.value)"
                required autocomplete="username" />
            </div>

            <div class="form-group">
              <label class="form-label" for="login-password">
                <span class="label-icon">🔒</span>
                Password
              </label>
              <div class="password-input-wrapper">
                <input [type]="showLoginPassword() ? 'text' : 'password'" id="login-password" class="form-input"
                  placeholder="Enter your password"
                  [value]="loginForm().password"
                  (input)="updateLoginForm('password', $any($event).target.value)"
                  required autocomplete="current-password" />
                <button type="button" class="password-toggle" (click)="toggleLoginPassword()">
                  {{ showLoginPassword() ? '👁️' : '👁️‍🗨️' }}
                </button>
              </div>
            </div>

            @if (loginErrors().length > 0) {
              <div class="form-errors">
                @for (error of loginErrors(); track error) {
                  <span class="error-message">{{ error }}</span>
                }
              </div>
            }

            <button type="submit" class="auth-button" [disabled]="!isLoginValid() || apiService.isLoading()">
              @if (apiService.isLoading()) {
                <span>Logging in...</span>
              } @else {
                <span>Login</span>
              }
            </button>
          </form>
        } @else {
          <form class="auth-form" (ngSubmit)="handleRegister()">
            <div class="form-group">
              <label class="form-label" for="register-username">
                <span class="label-icon">👤</span>
                Username
              </label>
              <input type="text" id="register-username" class="form-input" placeholder="Choose a username"
                [value]="registerForm().username"
                (input)="updateRegisterForm('username', $any($event).target.value)"
                required autocomplete="username" />
            </div>

            <div class="form-group">
              <label class="form-label" for="register-email">
                <span class="label-icon">📧</span>
                Email
              </label>
              <input type="email" id="register-email" class="form-input" placeholder="Enter your email"
                [value]="registerForm().email"
                (input)="updateRegisterForm('email', $any($event).target.value)"
                required autocomplete="email" />
            </div>

            <div class="form-group">
              <label class="form-label" for="register-password">
                <span class="label-icon">🔒</span>
                Password
              </label>
              <div class="password-input-wrapper">
                <input [type]="showRegisterPassword() ? 'text' : 'password'" id="register-password" class="form-input"
                  placeholder="Choose a password"
                  [value]="registerForm().password"
                  (input)="updateRegisterForm('password', $any($event).target.value)"
                  required autocomplete="new-password" />
                <button type="button" class="password-toggle" (click)="toggleRegisterPassword()">
                  {{ showRegisterPassword() ? '👁️' : '👁️‍🗨️' }}
                </button>
              </div>
            </div>

            @if (registerErrors().length > 0) {
              <div class="form-errors">
                @for (error of registerErrors(); track error) {
                  <span class="error-message">{{ error }}</span>
                }
              </div>
            }

            <button type="submit" class="auth-button" [disabled]="!isRegisterValid() || apiService.isLoading()">
              @if (apiService.isLoading()) {
                <span>Registering...</span>
              } @else {
                <span>Register</span>
              }
            </button>
          </form>
        }

        @if (apiService.error$(); as error) {
          <div class="api-error">{{ error }}</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper { display: flex; justify-content: center; align-items: center; min-height: 100%; padding: 20px; }
    .auth-container { background: rgba(255,255,255,0.95); border-radius: 16px; padding: 40px; width: 100%; max-width: 420px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
    .auth-header { text-align: center; margin-bottom: 30px; }
    .auth-logo { display: inline-flex; width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); justify-content: center; align-items: center; margin-bottom: 15px; }
    .logo-icon { color: white; font-size: 32px; font-weight: bold; }
    .auth-title { font-size: 28px; margin: 0 0 8px; color: #1a1a1a; }
    .auth-subtitle { font-size: 14px; color: #666; margin: 0; }
    .auth-tabs { display: flex; gap: 10px; margin-bottom: 25px; }
    .auth-tab { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 12px; border: 2px solid #e0e0e0; border-radius: 10px; background: white; cursor: pointer; transition: all 0.2s; }
    .auth-tab.active { border-color: #667eea; background: linear-gradient(135deg, #667eea15, #764ba215); }
    .tab-icon { font-size: 20px; margin-bottom: 4px; }
    .tab-label { font-size: 13px; font-weight: 600; color: #333; }
    .auth-form { display: flex; flex-direction: column; gap: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-label { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #333; font-size: 14px; }
    .label-icon { font-size: 16px; }
    .form-input { padding: 12px 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; transition: all 0.2s; }
    .form-input:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
    .password-input-wrapper { position: relative; display: flex; }
    .password-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px; padding: 5px; }
    .auth-button { padding: 14px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .auth-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102,126,234,0.4); }
    .auth-button:disabled { opacity: 0.6; cursor: not-allowed; }
    .form-errors { display: flex; flex-direction: column; gap: 4px; }
    .error-message { color: #dc3545; font-size: 12px; }
    .api-error { margin-top: 15px; padding: 10px; background: #ffebee; color: #c62828; border-radius: 8px; font-size: 14px; }
  `],
})
export class AuthComponent {
  private readonly logger = inject(LoggerService);
  readonly apiService = inject(ApiService);

  // Mode signal
  readonly isLoginMode = signal(true);

  // Password visibility signals
  readonly showLoginPassword = signal(false);
  readonly showRegisterPassword = signal(false);

  // Signal-based forms
  readonly loginForm = signal<AuthForm>({
    username: '',
    email: '',
    password: '',
  });

  readonly registerForm = signal<AuthForm>({
    username: '',
    email: '',
    password: '',
  });

  // Computed validation signals
  readonly loginErrors = computed(() => {
    const form = this.loginForm();
    const errors: string[] = [];
    if (!form.username.trim()) errors.push('Username is required');
    if (!form.password) errors.push('Password is required');
    return errors;
  });

  readonly registerErrors = computed(() => {
    const form = this.registerForm();
    const errors: string[] = [];
    if (!form.username.trim()) errors.push('Username is required');
    if (!form.email.trim()) errors.push('Email is required');
    else if (!this.isValidEmail(form.email)) errors.push('Invalid email format');
    if (!form.password) errors.push('Password is required');
    else if (form.password.length < 6) errors.push('Password must be at least 6 characters');
    return errors;
  });

  readonly isLoginValid = computed(() => this.loginErrors().length === 0);
  readonly isRegisterValid = computed(() => this.registerErrors().length === 0);

  switchToLogin(): void {
    this.isLoginMode.set(true);
    this.apiService.clearError();
  }

  switchToRegister(): void {
    this.isLoginMode.set(false);
    this.apiService.clearError();
  }

  toggleLoginPassword(): void {
    this.showLoginPassword.update(v => !v);
  }

  toggleRegisterPassword(): void {
    this.showRegisterPassword.update(v => !v);
  }

  updateLoginForm(field: keyof AuthForm, value: string): void {
    this.loginForm.update(form => ({ ...form, [field]: value }));
  }

  updateRegisterForm(field: keyof AuthForm, value: string): void {
    this.registerForm.update(form => ({ ...form, [field]: value }));
  }

  async handleLogin(): Promise<void> {
    if (!this.isLoginValid()) {
      this.logger.warn('Login validation failed');
      return;
    }

    const form = this.loginForm();
    this.logger.info('Attempting login', { username: form.username });

    try {
      await this.apiService.call('authLogin', [{
        username: form.username,
        password: form.password,
      }]);
      this.logger.info('Login successful');
      this.loginForm.set({ username: '', email: '', password: '' });
    } catch (error) {
      this.logger.error('Login failed', error);
    }
  }

  async handleRegister(): Promise<void> {
    if (!this.isRegisterValid()) {
      this.logger.warn('Register validation failed');
      return;
    }

    const form = this.registerForm();
    this.logger.info('Attempting registration', { username: form.username, email: form.email });

    try {
      await this.apiService.call('authRegister', [{
        username: form.username,
        email: form.email,
        password: form.password,
      }]);
      this.logger.info('Registration successful');
      this.registerForm.set({ username: '', email: '', password: '' });
      this.switchToLogin();
    } catch (error) {
      this.logger.error('Registration failed', error);
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
