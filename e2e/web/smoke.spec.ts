import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('app loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to load (check for canvas or root element)
    await expect(page.locator('#root')).toBeVisible({ timeout: 30000 });
  });

  test('engine initializes', async ({ page }) => {
    await page.goto('/');
    
    // Wait for engine initialization
    await page.waitForTimeout(5000);
    
    // Check for canvas element (Babylon.js creates a canvas)
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('scene renders', async ({ page }) => {
    await page.goto('/');
    
    // Wait for scene setup
    await page.waitForTimeout(5000);
    
    // Check that canvas has non-zero dimensions
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);
  });

  test('no console errors during initialization', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(5000);
    
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (error) => !error.includes('DevTools') && !error.includes('favicon')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
