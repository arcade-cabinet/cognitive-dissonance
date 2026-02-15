import { expect, test } from '@playwright/test';

test.describe('Psyduck Panic Game', () => {
  // Disable CSS animations/transitions for all tests
  test.beforeEach(async ({ page }) => {
    // Inject styles to disable animations
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
      `,
    });
  });

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
    await expect(canvas).toHaveAttribute('width', '800');
    await expect(canvas).toHaveAttribute('height', '600');
  });

  test('should have control buttons', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('#btn-reality')).toBeVisible();
    await expect(page.locator('#btn-history')).toBeVisible();
    await expect(page.locator('#btn-logic')).toBeVisible();
    await expect(page.locator('#btn-special')).toBeVisible();
  });

  test('should display HUD elements', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('.meter-container')).toBeVisible();
    await expect(page.locator('#panic-bar')).toBeAttached();
    await expect(page.locator('#combo-display')).toBeVisible();
    await expect(page.locator('#wave-display')).toBeVisible();
    await expect(page.locator('#time-display')).toBeVisible();
    await expect(page.locator('#score-display')).toBeVisible();
  });

  test('should start game when clicking start button', async ({ page }) => {
    await page.goto('/game');
    const overlay = page.locator('#overlay');
    await expect(overlay).toBeVisible();

    const startBtn = page.locator('#start-btn');
    // Ensure button is visible and enabled
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();

    // Evaluate to ensure animations are truly stopped or gone
    await page.evaluate(() => {
      const btn = document.querySelector('#start-btn');
      if (btn instanceof HTMLElement) {
        btn.style.animation = 'none';
        btn.style.transition = 'none';
      }
    });

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

    // Force remove animations via JS just in case
    await page.evaluate(() => {
      const btn = document.querySelector('#start-btn');
      if (btn instanceof HTMLElement) {
        btn.style.animation = 'none';
        btn.style.transition = 'none';
      }
    });

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
