import { expect, test } from '@playwright/test';

test.describe('Psyduck Panic Game', () => {
  test('should load the game page', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('#game-container')).toBeVisible();
  });

  test('should display game title on overlay', async ({ page }) => {
    await page.goto('/game');
    const title = page.locator('#overlay-title');
    await expect(title).toBeVisible();
    await expect(title).toContainText('PSYDUCK PANIC');
  });

  test('should have start button', async ({ page }) => {
    await page.goto('/game');
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toContainText('START DEBATE');
  });

  test('should have game canvas', async ({ page }) => {
    await page.goto('/game');
    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();
    // Canvas resolution scales with devicePixelRatio (e.g. 1600x1200 on 2x, 2400x1800 on 3x)
    const width = Number(await canvas.getAttribute('width'));
    const height = Number(await canvas.getAttribute('height'));
    expect(width).toBeGreaterThanOrEqual(800);
    expect(height).toBeGreaterThanOrEqual(600);
    expect(width / height).toBeCloseTo(800 / 600, 1);
  });

  test('should have control buttons', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('#btn-reality')).toBeAttached();
    await expect(page.locator('#btn-history')).toBeAttached();
    await expect(page.locator('#btn-logic')).toBeAttached();
    await expect(page.locator('#btn-special')).toBeAttached();
  });

  test('should display HUD elements', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('.meter-container')).toBeAttached();
    await expect(page.locator('#panic-bar')).toBeAttached();
    await expect(page.locator('#combo-display')).toBeAttached();
    await expect(page.locator('#wave-display')).toBeAttached();
    await expect(page.locator('#time-display')).toBeAttached();
    await expect(page.locator('#score-display')).toBeAttached();
  });

  test('should start game when clicking start button', async ({ page }) => {
    await page.goto('/game');
    const overlay = page.locator('#overlay');
    await expect(overlay).toBeVisible();

    const startBtn = page.locator('#start-btn');
    // Ensure button is visible and enabled
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();

    // Click without force
    await startBtn.click();

    // Overlay should be hidden after starting
    await expect(overlay).toHaveClass(/hidden/);
  });

  test('should respond to keyboard controls', async ({ page }) => {
    await page.goto('/game');
    const startBtn = page.locator('#start-btn');

    // Ensure button is visible and enabled
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();

    // Click without force
    await startBtn.click();

    // Wait for the overlay to be hidden (game started)
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);

    // Press ability keys
    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await page.keyboard.press('3');

    // Should not crash
    await expect(page.locator('#game-container')).toBeVisible();
  });
});
