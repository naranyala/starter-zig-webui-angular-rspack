// frontend/src/views/auth/auth.component.test.ts
import { describe, expect, it, beforeEach } from 'bun:test';
import { AuthComponent } from './auth.component';

describe('AuthComponent', () => {
  let component: AuthComponent;

  beforeEach(() => {
    component = new AuthComponent();
  });

  it('should create component', () => {
    expect(component).toBeDefined();
  });

  describe('mode toggling', () => {
    it('should start in login mode', () => {
      expect(component.isLoginMode()).toBe(true);
    });

    it('should toggle to register mode', () => {
      component.switchToRegister();
      expect(component.isLoginMode()).toBe(false);
    });

    it('should toggle back to login mode', () => {
      component.switchToRegister();
      component.switchToLogin();
      expect(component.isLoginMode()).toBe(true);
    });
  });

  describe('password visibility', () => {
    it('should toggle login password visibility', () => {
      expect(component.showLoginPassword()).toBe(false);
      component.toggleLoginPassword();
      expect(component.showLoginPassword()).toBe(true);
      component.toggleLoginPassword();
      expect(component.showLoginPassword()).toBe(false);
    });

    it('should toggle register password visibility', () => {
      expect(component.showRegisterPassword()).toBe(false);
      component.toggleRegisterPassword();
      expect(component.showRegisterPassword()).toBe(true);
      component.toggleRegisterPassword();
      expect(component.showRegisterPassword()).toBe(false);
    });
  });

  describe('form validation', () => {
    it('should validate empty login fields', async () => {
      component.loginUsername = '';
      component.loginPassword = '';
      
      await component.handleLogin();
      
      expect(component.isLoading()).toBe(false);
    });

    it('should validate empty register fields', async () => {
      component.registerUsername = '';
      component.registerEmail = '';
      component.registerPassword = '';
      
      await component.handleRegister();
      
      expect(component.isLoading()).toBe(false);
    });

    it('should set loading state during login', async () => {
      component.loginUsername = 'testuser';
      component.loginPassword = 'password';
      
      const loginPromise = component.handleLogin();
      expect(component.isLoading()).toBe(true);
      
      await loginPromise.catch(() => {});
      expect(component.isLoading()).toBe(false);
    });

    it('should set loading state during register', async () => {
      component.registerUsername = 'testuser';
      component.registerEmail = 'test@example.com';
      component.registerPassword = 'password';
      
      const registerPromise = component.handleRegister();
      expect(component.isLoading()).toBe(true);
      
      await registerPromise.catch(() => {});
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('form reset', () => {
    it('should clear login form after submission', async () => {
      component.loginUsername = 'testuser';
      component.loginPassword = 'password';
      
      await component.handleLogin().catch(() => {});
      
      expect(component.loginUsername).toBe('');
      expect(component.loginPassword).toBe('');
    });

    it('should clear register form after submission', async () => {
      component.registerUsername = 'testuser';
      component.registerEmail = 'test@example.com';
      component.registerPassword = 'password';
      
      await component.handleRegister().catch(() => {});
      
      expect(component.registerUsername).toBe('');
      expect(component.registerEmail).toBe('');
      expect(component.registerPassword).toBe('');
    });

    it('should switch to login after successful registration', async () => {
      component.registerUsername = 'testuser';
      component.registerEmail = 'test@example.com';
      component.registerPassword = 'password';
      
      await component.handleRegister().catch(() => {});
      
      expect(component.isLoginMode()).toBe(true);
    });
  });

  describe('signal state', () => {
    it('should track loading state', () => {
      expect(component.isLoading()).toBe(false);
    });

    it('should track active mode', () => {
      expect(component.isLoginMode()).toBe(true);
      component.switchToRegister();
      expect(component.isLoginMode()).toBe(false);
    });
  });
});
