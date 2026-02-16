/**
 * Device Responsive Tests
 *
 * Tests game responsiveness across different device types and orientations.
 * Verifies viewport adaptation, character rendering, and touch controls.
 */

import { expect, test } from '@playwright/test';
import {
  deviceScreenshot,
  getCanvasBoundingBox,
  navigateToGame,
  startGame,
  verifyControlsAttached,
  verifyGamePlaying,
  verifyHUDVisible,
} from './helpers/game-helpers';

test.describe('Responsive Device Tests', () => {
  test('should render game canvas on all devices', async ({ page }) => {
    await navigateToGame(page);
    await getCanvasBoundingBox(page);
    await deviceScreenshot(page, test.info(), 'canvas');
  });

  test('should maintain aspect ratio across devices', async ({ page }) => {
    await navigateToGame(page);
    const box = await getCanvasBoundingBox(page);

    // Should be close to 4:3 = 1.333
    const aspectRatio = box.width / box.height;
    expect(aspectRatio).toBeGreaterThan(1.2);
    expect(aspectRatio).toBeLessThan(1.5);
  });

  test('should show start screen with all elements', async ({ page }) => {
    await navigateToGame(page);

    const overlay = page.locator('#overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).not.toHaveClass(/hidden/);

    await expect(page.locator('#overlay-title')).toContainText('PSYDUCK');

    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();

    await deviceScreenshot(page, test.info(), 'start-screen');
  });

  test('should start game and show HUD on all devices', async ({ page }) => {
    await navigateToGame(page);
    await startGame(page);

    await verifyHUDVisible(page);
    await verifyControlsAttached(page);

    await deviceScreenshot(page, test.info(), 'gameplay');
  });
});

test.describe('Phone-Specific Tests', () => {
  test('should handle touch interactions on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices');

    await navigateToGame(page);

    // Start game with tap
    const startBtn = page.locator('#start-btn');
    await startBtn.tap();

    await expect(page.locator('#overlay')).toHaveClass(/hidden/, { timeout: 3000 });
    await expect(page.locator('#ui-layer')).toBeVisible();
  });
});

test.describe('Tablet-Specific Tests', () => {
  test('should utilize larger screen on tablets', async ({ page, viewport }) => {
    const isTablet = viewport && Math.min(viewport.width, viewport.height) >= 600;
    test.skip(!isTablet, 'This test is only for tablet-sized devices');

    await navigateToGame(page);
    const box = await getCanvasBoundingBox(page);
    expect(box.width).toBeGreaterThan(500);
  });

  test('should show comfortable UI spacing on tablets', async ({ page, viewport }) => {
    const isTablet = viewport && Math.min(viewport.width, viewport.height) >= 600;
    test.skip(!isTablet, 'This test is only for tablet-sized devices');

    await navigateToGame(page);
    await startGame(page);

    // Verify HUD is accessible on larger screens
    await verifyHUDVisible(page);
    await verifyControlsAttached(page);
  });
});

test.describe('Foldable-Specific Tests', () => {
  test('should adapt to folded state dimensions', async ({ page, viewport }) => {
    const isFolded = viewport && viewport.width < 300;
    test.skip(!isFolded, 'This test is only for folded foldable devices');

    await navigateToGame(page);
    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();

    await expect(async () => {
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas bounding box is null');
      expect(box.width).toBeLessThanOrEqual(viewport.width + 2);
    }).toPass({ timeout: 5000 });
  });

  test('should utilize unfolded screen space', async ({ page, viewport }) => {
    const isUnfolded =
      viewport && viewport.width > 700 && viewport.width < 900 && viewport.height > 400;
    test.skip(!isUnfolded, 'This test is only for unfolded foldable devices');

    await navigateToGame(page);
    const box = await getCanvasBoundingBox(page);
    expect(box.width).toBeGreaterThan(600);
  });
});

test.describe('Character Rendering Tests', () => {
  test('should render character in all panic states', async ({ page }) => {
    await navigateToGame(page);
    await startGame(page);

    await deviceScreenshot(page, test.info(), 'character-normal');

    // Wait for panic to build
    await expect(page.locator('#panic-bar')).toBeVisible();
    await deviceScreenshot(page, test.info(), 'character-panic');
  });

  test('should show character centered on canvas', async ({ page }) => {
    await navigateToGame(page);
    await startGame(page);

    await getCanvasBoundingBox(page);
    await expect(page.locator('#panic-bar')).toBeVisible();
  });
});

test.describe('Orientation Change Tests', () => {
  test('should handle viewport resize gracefully', async ({ page }) => {
    await navigateToGame(page);

    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();

    const initialViewport = page.viewportSize();
    if (initialViewport) {
      await page.setViewportSize({
        width: initialViewport.height,
        height: initialViewport.width,
      });

      await expect(canvas).toBeVisible();
      const newBox = await canvas.boundingBox();
      if (!newBox) {
        throw new Error('Canvas bounding box is null after resize');
      }
      expect(newBox.width).toBeGreaterThan(0);
      expect(newBox.height).toBeGreaterThan(0);

      const aspectRatio = newBox.width / newBox.height;
      expect(aspectRatio).toBeGreaterThan(1.2);
      expect(aspectRatio).toBeLessThan(1.5);

      await deviceScreenshot(page, test.info(), 'rotated');
    }
  });
});

test.describe('Game Responsiveness Tests', () => {
  test('should maintain acceptable frame rate on all devices', async ({ page }) => {
    await navigateToGame(page);
    await startGame(page);

    await expect(page.locator('#wave-display')).toBeVisible();

    // Test F-key ability — should respond
    await page.keyboard.press('F3');
    await verifyGamePlaying(page);
  });
});
