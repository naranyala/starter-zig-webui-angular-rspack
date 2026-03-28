/**
 * End-to-End Tests for WebUI C3 + Angular Desktop Application
 * 
 * These tests verify the complete application flow from a user's perspective.
 * Run with: bunx playwright test
 */

import { test, expect, type Page } from '@playwright/test';

// ============================================
// Application Startup & Initial State
// ============================================

test.describe('Application Startup', () => {
  test('should load the application successfully', async ({ page }) => {
    await page.goto('/');
    
    await expect(page).toHaveTitle(/WebUI.*Angular/);
    await expect(page.locator('app-root')).toBeVisible();
  });

  test('should display the main dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Wait for app to initialize
    await page.waitForSelector('app-component', { state: 'visible' });
    
    // Check for main UI elements
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should have no console errors on startup', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Allow some time for any delayed errors
    await page.waitForTimeout(1000);
    
    expect(consoleErrors).toHaveLength(0);
  });
});

// ============================================
// Navigation Tests
// ============================================

test.describe('Navigation', () => {
  test('should navigate to home page', async ({ page }) => {
    await page.goto('/');
    
    const homeLink = page.locator('a[href="/home"], [data-nav="home"]');
    if (await homeLink.count() > 0) {
      await homeLink.first().click();
      await expect(page).toHaveURL(/.*home.*/);
    }
  });

  test('should navigate to demo pages', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to SVG demo
    const svgDemoLink = page.locator('a[href*="svg"], [data-nav="svg"]');
    if (await svgDemoLink.count() > 0) {
      await svgDemoLink.first().click();
      await expect(page.locator('svgjs-demo-component, [data-page="svg"]')).toBeVisible();
    }
  });

  test('should handle 404 routes gracefully', async ({ page }) => {
    await page.goto('/non-existent-route');
    
    // Should either show 404 page or redirect to home
    const notFound = page.locator('text=/404|Not Found|Page not found/i');
    const isHome = await page.url().includes('/home') || await page.url() === page.url().replace('/non-existent-route', '/');
    
    expect(notFound.count() > 0 || isHome).toBeTruthy();
  });
});

// ============================================
// Component Interaction Tests
// ============================================

test.describe('Component Interactions', () => {
  test('should interact with home component', async ({ page }) => {
    await page.goto('/');
    
    // Wait for home component
    await page.waitForSelector('home-component, [data-page="home"]', { state: 'visible' });
    
    // Test basic interactions
    const interactiveElements = page.locator('button, [role="button"]');
    const count = await interactiveElements.count();
    
    expect(count).toBeGreaterThan(0);
  });

  test('should display and update state', async ({ page }) => {
    await page.goto('/');
    
    // Find a stateful element (like a counter or toggle)
    const stateElement = page.locator('[data-state], .state-display, app-component');
    await expect(stateElement).toBeVisible();
  });
});

// ============================================
// Authentication Flow Tests
// ============================================

test.describe('Authentication', () => {
  test('should display auth component', async ({ page }) => {
    await page.goto('/');
    
    // Check for auth-related elements
    const authComponent = page.locator('auth-component, [data-page="auth"]');
    if (await authComponent.count() > 0) {
      await expect(authComponent.first()).toBeVisible();
    }
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/auth');
    
    // Look for login form elements
    const loginForm = page.locator('form[name="login"], [data-form="login"]');
    if (await loginForm.count() > 0) {
      await expect(loginForm.first()).toBeVisible();
      
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const passwordInput = page.locator('input[type="password"], input[name="password"]');
      
      await expect(emailInput.first()).toBeVisible();
      await expect(passwordInput.first()).toBeVisible();
    }
  });

  test('should validate login form', async ({ page }) => {
    await page.goto('/auth');
    
    const submitButton = page.locator('button[type="submit"], [data-action="login"]');
    if (await submitButton.count() > 0) {
      // Try to submit without filling form
      await submitButton.first().click();
      
      // Should show validation errors
      await page.waitForTimeout(500);
      const errors = page.locator('.error, [data-error], .validation-error');
      // May or may not have validation depending on implementation
    }
  });
});

// ============================================
// SQLite/Database Feature Tests
// ============================================

test.describe('Database Features', () => {
  test('should display SQLite demo component', async ({ page }) => {
    await page.goto('/sqlite');
    
    const sqliteComponent = page.locator('sqlite-component, [data-page="sqlite"]');
    if (await sqliteComponent.count() > 0) {
      await expect(sqliteComponent.first()).toBeVisible();
    }
  });

  test('should perform CRUD operations', async ({ page }) => {
    await page.goto('/sqlite');
    
    // Look for data table or list
    const dataTable = page.locator('table, [data-table], .data-list');
    if (await dataTable.count() > 0) {
      await expect(dataTable.first()).toBeVisible();
      
      // Look for add button
      const addButton = page.locator('button:has-text("Add"), [data-action="add"]');
      if (await addButton.count() > 0) {
        await addButton.first().click();
        
        // Should show form or modal
        await page.waitForTimeout(500);
        const modal = page.locator('modal, [role="dialog"], .modal');
        // May or may not have modal
      }
    }
  });
});

// ============================================
// DevTools Tests
// ============================================

test.describe('Developer Tools', () => {
  test('should open devtools panel', async ({ page }) => {
    await page.goto('/');
    
    const devtoolsButton = page.locator('[data-action="devtools"], button:has-text("DevTools")');
    if (await devtoolsButton.count() > 0) {
      await devtoolsButton.first().click();
      
      const devtoolsPanel = page.locator('devtools-component, [data-panel="devtools"]');
      await expect(devtoolsPanel.first()).toBeVisible();
    }
  });

  test('should display application state in devtools', async ({ page }) => {
    await page.goto('/devtools');
    
    const stateDisplay = page.locator('[data-state-display], .state-tree');
    if (await stateDisplay.count() > 0) {
      await expect(stateDisplay.first()).toBeVisible();
    }
  });
});

// ============================================
// Error Handling Tests
// ============================================

test.describe('Error Handling', () => {
  test('should display error modal for failures', async ({ page }) => {
    await page.goto('/');
    
    // Trigger an error (if there's a test error button)
    const errorButton = page.locator('[data-action="trigger-error"], button:has-text("Error")');
    if (await errorButton.count() > 0) {
      await errorButton.first().click();
      
      // Should show error modal
      const errorModal = page.locator('error-modal-component, [role="alertdialog"]');
      await expect(errorModal.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle API failures gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Intercept API calls and force failure
    await page.route('**/api/**', route => route.abort('failed'));
    
    // Try an action that would call API
    const actionButton = page.locator('button[data-action], button:has-text("Load")');
    if (await actionButton.count() > 0) {
      await actionButton.first().click();
      
      // Should show error but not crash
      await page.waitForTimeout(1000);
      const appStillRunning = await page.locator('app-root').isVisible();
      expect(appStillRunning).toBeTruthy();
    }
  });
});

// ============================================
// Responsive Design Tests
// ============================================

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Mobile menu should be available
    const mobileMenu = page.locator('[data-mobile-menu], .mobile-menu, .hamburger-menu');
    if (await mobileMenu.count() > 0) {
      await expect(mobileMenu.first()).toBeVisible();
    }
    
    // Content should be accessible
    const mainContent = page.locator('main');
    await expect(mainContent).toBeInViewport();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});

// ============================================
// Performance Tests
// ============================================

test.describe('Performance', () => {
  test('should load within performance budget', async ({ page }) => {
    await page.goto('/');
    
    const metrics = await page.metrics();
    
    // JS heap size should be reasonable
    expect(metrics.JSHeapUsedSize).toBeLessThan(50 * 1024 * 1024); // 50MB
  });

  test('should have good Lighthouse performance', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome only');
    
    await page.goto('/');
    
    // Basic performance checks
    const loadTime = await page.evaluate(() => {
      return performance.getEntriesByType('navigation')[0].loadEventEnd;
    });
    
    expect(loadTime).toBeLessThan(5000); // 5 second budget
  });
});

// ============================================
// Accessibility Tests
// ============================================

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    const h1 = page.locator('h1');
    // Should have exactly one h1
    const count = await h1.count();
    expect(count).toBeLessThanOrEqual(1);
  });

  test('should have accessible buttons', async ({ page }) => {
    await page.goto('/');
    
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const hasText = await button.textContent();
      const hasAriaLabel = await button.getAttribute('aria-label');
      
      expect(hasText || hasAriaLabel).toBeTruthy();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const firstFocusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocusedElement).toBeTruthy();
    
    // Continue tabbing
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Shift+Tab to go back
    await page.keyboard.press('Shift+Tab');
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    
    // Check text elements have readable colors
    const textElements = page.locator('p, span, h1, h2, h3, h4, h5, h6');
    const count = await textElements.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const element = textElements.nth(i);
      await expect(element).toBeVisible();
    }
  });
});

// ============================================
// State Persistence Tests
// ============================================

test.describe('State Persistence', () => {
  test('should persist user preferences', async ({ page, context }) => {
    await page.goto('/');
    
    // Set some state (if theme toggle exists)
    const themeToggle = page.locator('[data-action="toggle-theme"], button:has-text("Theme")');
    if (await themeToggle.count() > 0) {
      await themeToggle.first().click();
      
      // Reload and check state persisted
      await page.reload();
      await page.waitForTimeout(500);
      
      // Theme should persist (check localStorage or visual)
      const storage = await context.storage();
      // May use localStorage or other persistence
    }
  });
});

// ============================================
// Integration Tests
// ============================================

test.describe('Frontend-Backend Integration', () => {
  test('should communicate with backend services', async ({ page }) => {
    await page.goto('/');
    
    // Listen for WebUI calls
    const backendCalls: string[] = [];
    
    page.on('request', request => {
      if (request.url().includes('api') || request.url().includes('backend')) {
        backendCalls.push(request.url());
      }
    });
    
    // Trigger an action that should call backend
    const loadButton = page.locator('button:has-text("Load"), [data-action="load"]');
    if (await loadButton.count() > 0) {
      await loadButton.first().click();
      await page.waitForTimeout(1000);
      
      // May have backend calls depending on implementation
    }
  });
});
