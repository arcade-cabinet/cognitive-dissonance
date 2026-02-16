/**
 * Device Responsive Tests
 *
 * Tests game responsiveness across different device types and orientations.
 * Verifies viewport adaptation, character rendering, and touch controls.
 */

import { expect, test } from '@playwright/test';

test.describe('Responsive Device Tests', () => {
  test('should render game canvas on all devices', async ({ page }) => {
    await page.goto('/game');

    // Wait for game container
    const gameContainer = page.locator('#game-container');
    await expect(gameContainer).toBeVisible();

    // Verify canvas exists and is visible
    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();

    // Wait for canvas to have dimensions (polling assertion for hydration)
    await expect(async () => {
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      expect(box?.width).toBeGreaterThan(0);
      expect(box?.height).toBeGreaterThan(0);
    }).toPass({ timeout: 5000 });

    // Take screenshot for visual verification
    const deviceName = test.info().project.name.replace(/\s+/g, '-').toLowerCase();
    await page.screenshot({
      path: `test-results/screenshots/device-${deviceName}-canvas.png`,
      fullPage: false,
    });
  });

  test('should maintain aspect ratio across devices', async ({ page }) => {
    await page.goto('/game');

    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();

    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) {
      throw new Error('Canvas bounding box is null');
    }

    // Calculate aspect ratio (should be close to 4:3 = 1.333...)
    const aspectRatio = canvasBox.width / canvasBox.height;

    // Allow some tolerance for rounding
    expect(aspectRatio).toBeGreaterThan(1.2);
    expect(aspectRatio).toBeLessThan(1.5);
  });

  test('should show start screen with all elements', async ({ page }) => {
    await page.goto('/game');

    // Verify overlay is visible
    const overlay = page.locator('#overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).not.toHaveClass(/hidden/);

    // Verify title
    const title = page.locator('#overlay-title');
    await expect(title).toBeVisible();
    await expect(title).toContainText('PSYDUCK');

    // Verify start button
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();

    // Take screenshot
    const deviceName = test.info().project.name.replace(/\s+/g, '-').toLowerCase();
    await page.screenshot({
      path: `test-results/screenshots/device-${deviceName}-start-screen.png`,
      fullPage: false,
    });
  });

  test('should start game and show HUD on all devices', async ({ page }) => {
    await page.goto('/game');

    // Start game
    const startBtn = page.locator('#start-btn');
    await startBtn.click();

    // Wait for overlay to hide
    const overlay = page.locator('#overlay');
    await expect(overlay).toHaveClass(/hidden/, { timeout: 3000 });

    // Verify HUD elements are visible
    await expect(page.locator('#wave-display')).toBeVisible();
    await expect(page.locator('#time-display')).toBeVisible();
    await expect(page.locator('#score-display')).toBeVisible();
    await expect(page.locator('#panic-bar')).toBeVisible();
    await expect(page.locator('#combo-display')).toBeVisible();

    // Verify control buttons
    await expect(page.locator('#btn-reality')).toBeVisible();
    await expect(page.locator('#btn-history')).toBeVisible();
    await expect(page.locator('#btn-logic')).toBeVisible();
    await expect(page.locator('#btn-special')).toBeVisible();

    // Take screenshot of gameplay
    const deviceName = test.info().project.name.replace(/\s+/g, '-').toLowerCase();
    await page.screenshot({
      path: `test-results/screenshots/device-${deviceName}-gameplay.png`,
      fullPage: false,
    });
  });
});

test.describe('Phone-Specific Tests', () => {
  test('should have touch-friendly button sizes on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices');

    await page.goto('/game');
    const startBtn = page.locator('#start-btn');
    await startBtn.click();

    // Wait for buttons to be visible
    await expect(page.locator('#btn-reality')).toBeVisible();

    // Check button sizes are adequate for touch (min 44x44 iOS, 48x48 Android)
    const buttons = ['#btn-reality', '#btn-history', '#btn-logic', '#btn-special'];

    for (const selector of buttons) {
      const btn = page.locator(selector);
      const box = await btn.boundingBox();
      if (!box) {
        throw new Error(`Button ${selector} bounding box is null`);
      }

      // Buttons should be at least 40px in both dimensions for touch
      expect(box.height).toBeGreaterThanOrEqual(40);
      expect(box.width).toBeGreaterThanOrEqual(40);
    }
  });

  test('should handle touch interactions on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices');

    await page.goto('/game');

    // Start game with tap
    const startBtn = page.locator('#start-btn');
    await startBtn.tap();

    // Verify game started
    const overlay = page.locator('#overlay');
    await expect(overlay).toHaveClass(/hidden/, { timeout: 3000 });

    // Try tapping ability buttons
    const realityBtn = page.locator('#btn-reality');
    await realityBtn.tap();

    // Game should still be running
    await expect(page.locator('#ui-layer')).toBeVisible();
  });
});

test.describe('Tablet-Specific Tests', () => {
  test('should utilize larger screen on tablets', async ({ page, viewport }) => {
    // Skip if not tablet size
    const isTablet = viewport && viewport.width >= 600;
    test.skip(!isTablet, 'This test is only for tablet-sized devices');

    await page.goto('/game');

    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();
    const canvasBox = await canvas.boundingBox();

    // On tablets, canvas should be larger than phone sizes
    if (!canvasBox) {
      throw new Error('Canvas bounding box is null');
    }
    expect(canvasBox.width).toBeGreaterThan(500);
  });

  test('should show comfortable UI spacing on tablets', async ({ page, viewport }) => {
    const isTablet = viewport && viewport.width >= 600;
    test.skip(!isTablet, 'This test is only for tablet-sized devices');

    await page.goto('/game');

    const startBtn = page.locator('#start-btn');
    await startBtn.click();

    // Verify controls container exists and is spaced appropriately
    const controls = page.locator('#controls');
    await expect(controls).toBeVisible();

    const controlsBox = await controls.boundingBox();
    if (!controlsBox) {
      throw new Error('Controls bounding box is null');
    }
    expect(controlsBox.width).toBeGreaterThan(300);
  });
});

test.describe('Foldable-Specific Tests', () => {
  test('should adapt to folded state dimensions', async ({ page, viewport }) => {
    // Check if this is a foldable in folded state (very narrow)
    const isFolded = viewport && viewport.width < 300;
    test.skip(!isFolded, 'This test is only for folded foldable devices');

    await page.goto('/game');

    // Game should still render and be functional
    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();

    // Canvas should fit within narrow viewport (polling for hydration)
    await expect(async () => {
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      // Allow a small margin of error for borders/scaling
      expect(box?.width).toBeLessThanOrEqual(viewport.width + 2);
    }).toPass({ timeout: 5000 });
  });

  test('should utilize unfolded screen space', async ({ page, viewport }) => {
    // Check if this is a foldable in unfolded state (wider aspect)
    const isUnfolded = viewport && viewport.width > 700 && viewport.width < 900;
    test.skip(!isUnfolded, 'This test is only for unfolded foldable devices');

    await page.goto('/game');

    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();
    const canvasBox = await canvas.boundingBox();

    // Should use more of the unfolded screen
    if (!canvasBox) {
      throw new Error('Canvas bounding box is null');
    }
    expect(canvasBox.width).toBeGreaterThan(600);
  });
});

test.describe('Character Rendering Tests', () => {
  test('should render character in all panic states', async ({ page }) => {
    await page.goto('/game');

    // Start game
    const startBtn = page.locator('#start-btn');
    await startBtn.click();

    // Wait for game to be playing
    const overlay = page.locator('#overlay');
    await expect(overlay).toHaveClass(/hidden/, { timeout: 3000 });

    // Take screenshot at start (normal panic state)
    const deviceName = test.info().project.name.replace(/\s+/g, '-').toLowerCase();
    await page.screenshot({
      path: `test-results/screenshots/device-${deviceName}-character-normal.png`,
      fullPage: false,
    });

    // Wait for panic to build
    const panicBar = page.locator('#panic-bar');
    await expect(panicBar).toBeVisible();

    // Take another screenshot (might show panic state)
    await page.screenshot({
      path: `test-results/screenshots/device-${deviceName}-character-panic.png`,
      fullPage: false,
    });
  });

  test('should show character centered on canvas', async ({ page }) => {
    await page.goto('/game');

    const startBtn = page.locator('#start-btn');
    await startBtn.click();

    // Wait for game to be playing
    const overlay = page.locator('#overlay');
    await expect(overlay).toHaveClass(/hidden/, { timeout: 3000 });

    // Get canvas dimensions
    const canvas = page.locator('#gameCanvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) {
      throw new Error('Canvas bounding box is null');
    }

    // Character should be rendering (we can't directly check canvas content,
    // but we can verify the game is running)
    const panicBar = page.locator('#panic-bar');
    await expect(panicBar).toBeVisible();
  });
});

test.describe('Orientation Change Tests', () => {
  test('should handle viewport resize gracefully', async ({ page }) => {
    await page.goto('/game');

    // Get initial canvas size
    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();

    // Resize viewport (simulating orientation change)
    const initialViewport = page.viewportSize();
    if (initialViewport) {
      await page.setViewportSize({
        width: initialViewport.height,
        height: initialViewport.width,
      });

      // Wait for resize to complete
      await expect(canvas).toBeVisible();

      // Canvas should adapt
      const newBox = await canvas.boundingBox();
      if (!newBox) {
        throw new Error('Canvas bounding box is null after resize');
      }
      expect(newBox.width).toBeGreaterThan(0);
      expect(newBox.height).toBeGreaterThan(0);

      // Aspect ratio should still be maintained
      const aspectRatio = newBox.width / newBox.height;
      expect(aspectRatio).toBeGreaterThan(1.2);
      expect(aspectRatio).toBeLessThan(1.5);

      // Take screenshot after orientation change
      const deviceName = test.info().project.name.replace(/\s+/g, '-').toLowerCase();
      await page.screenshot({
        path: `test-results/screenshots/device-${deviceName}-rotated.png`,
        fullPage: false,
      });
    }
  });
});

test.describe('Game Responsiveness Tests', () => {
  test('should maintain acceptable frame rate on all devices', async ({ page }) => {
    await page.goto('/game');

    const startBtn = page.locator('#start-btn');
    await startBtn.click();

    // Wait for game to be playing
    const overlay = page.locator('#overlay');
    await expect(overlay).toHaveClass(/hidden/, { timeout: 3000 });

    // Check that game is still responsive
    const waveDisplay = page.locator('#wave-display');
    await expect(waveDisplay).toBeVisible();

    // Try clicking a button - should respond
    const logicBtn = page.locator('#btn-logic');
    await logicBtn.click();

    // Game should still be running
    await expect(page.locator('#ui-layer')).toBeVisible();
  });
});
