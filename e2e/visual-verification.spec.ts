import { expect, test } from '@playwright/test';

/**
 * Visual Verification Test Suite
 * 
 * This test suite captures screenshots of the R3F + Miniplex ECS + Tone.js migration
 * for visual verification before merging to main.
 */

test.describe('Visual Verification - R3F + ECS Migration', () => {
  // Enable screenshots for all tests in this suite
  test.use({ screenshot: 'on' });

  test('1. Landing page with 3D scene preview', async ({ page }) => {
    await page.goto('/');
    
    // Wait for any canvas to be visible
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // Wait a bit for 3D scene to render
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/screenshots/01-landing-page.png',
      fullPage: true 
    });
  });

  test('2. Initial game scene - 3D diorama room (desk, window, moon, stars)', async ({ page }) => {
    await page.goto('/game');
    
    // Wait for game container
    await expect(page.locator('#game-container')).toBeVisible();
    
    // Wait for canvas
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // Wait for 3D scene to fully render
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/screenshots/02-initial-room-scene.png',
      fullPage: true 
    });
  });

  test('3. Character state - Normal (0-33% panic)', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('#game-container')).toBeVisible();
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // Start the game
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    
    // Wait for overlay to hide and game to start
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    await page.waitForTimeout(2000);
    
    // Character should be in Normal state initially
    await page.screenshot({ 
      path: 'test-results/screenshots/03-character-normal.png',
      fullPage: true 
    });
  });

  test('4. Gameplay - Enemy bubbles with glow effects', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('#game-container')).toBeVisible();
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    
    // Wait for enemies to spawn (Wave 1 starts at ~1 second intervals)
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'test-results/screenshots/04-enemy-bubbles-with-glow.png',
      fullPage: true 
    });
  });

  test('5. Particle effects - Counter action with burst particles', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('#game-container')).toBeVisible();
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    
    // Wait for enemies to spawn
    await page.waitForTimeout(2500);
    
    // Press counter keys to trigger particle effects
    await page.keyboard.press('1');
    await page.waitForTimeout(200);
    await page.keyboard.press('2');
    await page.waitForTimeout(200);
    await page.keyboard.press('3');
    
    // Capture during particle animation
    await page.waitForTimeout(300);
    
    await page.screenshot({ 
      path: 'test-results/screenshots/05-particle-burst-effects.png',
      fullPage: true 
    });
  });

  test('6. Mid-panic state - Character showing stress (33-66% panic)', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('#game-container')).toBeVisible();
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    
    // Let enemies pass to increase panic meter
    // Wait long enough for panic to build up to ~40-50%
    await page.waitForTimeout(8000);
    
    await page.screenshot({ 
      path: 'test-results/screenshots/06-character-panic-state.png',
      fullPage: true 
    });
  });

  test('7. High panic state - Character approaching Psyduck (66-100% panic)', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('#game-container')).toBeVisible();
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    
    // Let enemies pass to increase panic meter to high levels
    await page.waitForTimeout(15000);
    
    await page.screenshot({ 
      path: 'test-results/screenshots/07-character-high-panic.png',
      fullPage: true 
    });
  });

  test('8. Boss encounter - Wave 1 boss with pulsing sphere and orbiting orbs', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('#game-container')).toBeVisible();
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    
    // Play through wave 1 to trigger boss
    // Boss appears after 30 seconds of wave time
    // Counter enemies to keep panic low and survive
    const counterInterval = setInterval(async () => {
      await page.keyboard.press('1');
      await page.keyboard.press('2');
      await page.keyboard.press('3');
    }, 1500);
    
    // Wait for wave 1 to complete and boss to spawn (~40 seconds total)
    await page.waitForTimeout(40000);
    
    clearInterval(counterInterval);
    
    // Wait for boss to be visible
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/screenshots/08-boss-encounter-wave1.png',
      fullPage: true 
    });
  });

  test('9. Room clutter progression - Wave 2+ items', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('#game-container')).toBeVisible();
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    
    // Counter enemies continuously to progress through waves
    const counterInterval = setInterval(async () => {
      await page.keyboard.press('1');
      await page.keyboard.press('2');
      await page.keyboard.press('3');
    }, 1200);
    
    // Wait for wave 2 to start (wave 1 + boss + transition ~60 seconds)
    await page.waitForTimeout(70000);
    
    clearInterval(counterInterval);
    
    // Wait for new clutter to appear
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/screenshots/09-room-clutter-wave2.png',
      fullPage: true 
    });
  });

  test('10. HUD elements - Panic meter, combo, wave, score displays', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('#game-container')).toBeVisible();
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    
    // Play a bit to show active HUD
    await page.waitForTimeout(2000);
    await page.keyboard.press('1');
    await page.waitForTimeout(500);
    await page.keyboard.press('2');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: 'test-results/screenshots/10-hud-elements-active.png',
      fullPage: true 
    });
  });

  test('11. Game over - Grading overlay (trigger D/C grade)', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('#game-container')).toBeVisible();
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    
    // Let panic build to 100% by not countering enemies
    // Wait for game over (~20 seconds)
    await page.waitForTimeout(25000);
    
    // Wait for game over overlay to appear
    await expect(page.locator('#overlay')).not.toHaveClass(/hidden/);
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/screenshots/11-game-over-grading.png',
      fullPage: true 
    });
  });

  test('12. Victory - Grading overlay with high score (trigger A/S grade)', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('#game-container')).toBeVisible();
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    
    // Play well to get a high grade
    // Counter enemies consistently with good accuracy
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('1');
      await page.waitForTimeout(800);
      await page.keyboard.press('2');
      await page.waitForTimeout(800);
      await page.keyboard.press('3');
      await page.waitForTimeout(800);
    }
    
    // Note: This may not complete the game but will show the grading system
    // if the game ends during this test
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/screenshots/12-victory-high-grade.png',
      fullPage: true 
    });
  });

  test('13. Monitor glow shift - Calm blue to panic red', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('#game-container')).toBeVisible();
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    
    // Let panic build to see monitor glow transition
    await page.waitForTimeout(12000);
    
    await page.screenshot({ 
      path: 'test-results/screenshots/13-monitor-glow-panic.png',
      fullPage: true 
    });
  });

  test('14. Dynamic eyes - Pupil tracking speed scaling', async ({ page }) => {
    await page.goto('/game');
    await expect(page.locator('#game-container')).toBeVisible();
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    
    // Wait for some gameplay and panic to build
    await page.waitForTimeout(6000);
    
    await page.screenshot({ 
      path: 'test-results/screenshots/14-dynamic-eye-tracking.png',
      fullPage: true 
    });
  });
});
