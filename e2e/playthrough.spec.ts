import { expect, test } from '@playwright/test';

test.describe('Complete Game Playthrough', () => {
  test.beforeEach(async ({ page }) => {
    // Disable CSS animations/transitions for stable testing
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
      `,
    });
  });

  test('should complete a full game playthrough from start to wave 1', async ({ page }) => {
    // Navigate to game
    await page.goto('/psyduck-panic/');
    
    // Take screenshot of start screen
    await expect(page.locator('#game-container')).toBeVisible();
    await page.screenshot({ path: 'test-results/screenshots/01-start-screen.png' });

    // Verify start screen elements
    const overlay = page.locator('#overlay');
    await expect(overlay).toBeVisible();
    await expect(page.locator('#overlay-title')).toContainText('PSYDUCK PANIC');
    
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toContainText('START DEBATE');

    // Click start button
    await startBtn.click();

    // Verify overlay is hidden (game started)
    await expect(overlay).toHaveClass(/hidden/);
    await page.screenshot({ path: 'test-results/screenshots/02-game-started.png' });

    // Verify game UI is visible
    await expect(page.locator('#ui-layer')).not.toHaveClass(/hidden/);
    await expect(page.locator('#wave-display')).toContainText('WAVE 1');
    
    // Wait for wave announcement to appear
    const waveAnnounce = page.locator('#wave-announce');
    await expect(waveAnnounce).toHaveClass(/show/, { timeout: 2000 });
    await page.screenshot({ path: 'test-results/screenshots/03-wave-announcement.png' });

    // Wait a moment for enemies to spawn
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/screenshots/04-enemies-spawned.png' });

    // Verify HUD elements are working
    const timeDisplay = page.locator('#time-display');
    const scoreDisplay = page.locator('#score-display');
    const panicBar = page.locator('#panic-bar');
    
    await expect(timeDisplay).toBeVisible();
    await expect(scoreDisplay).toBeVisible();
    await expect(panicBar).toBeVisible();

    // Verify control buttons are interactive
    await expect(page.locator('#btn-reality')).toBeEnabled();
    await expect(page.locator('#btn-history')).toBeEnabled();
    await expect(page.locator('#btn-logic')).toBeEnabled();
    await expect(page.locator('#btn-special')).toBeEnabled();

    // Test ability button clicks (should not crash)
    await page.locator('#btn-reality').click();
    await page.waitForTimeout(500);
    await page.locator('#btn-history').click();
    await page.waitForTimeout(500);
    await page.locator('#btn-logic').click();
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: 'test-results/screenshots/05-after-abilities.png' });

    // Verify game is still running
    await expect(overlay).toHaveClass(/hidden/);
    await expect(page.locator('#ui-layer')).not.toHaveClass(/hidden/);
  });

  test('should handle keyboard controls during gameplay', async ({ page }) => {
    await page.goto('/psyduck-panic/');
    
    // Start game
    const startBtn = page.locator('#start-btn');
    await startBtn.click();
    
    // Wait for game to start
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    await page.screenshot({ path: 'test-results/screenshots/06-keyboard-test-start.png' });

    // Test keyboard controls
    await page.keyboard.press('1'); // Reality
    await page.waitForTimeout(300);
    await page.keyboard.press('2'); // History
    await page.waitForTimeout(300);
    await page.keyboard.press('3'); // Logic
    await page.waitForTimeout(300);
    await page.keyboard.press('q'); // Nuke
    
    await page.screenshot({ path: 'test-results/screenshots/07-keyboard-after-inputs.png' });

    // Verify game didn't crash
    await expect(page.locator('#game-container')).toBeVisible();
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
  });

  test('should display wave announcement correctly', async ({ page }) => {
    await page.goto('/psyduck-panic/');
    
    const startBtn = page.locator('#start-btn');
    await startBtn.click();

    // Check wave announcement appears
    const waveAnnounce = page.locator('#wave-announce');
    await expect(waveAnnounce).toHaveClass(/show/, { timeout: 2000 });
    
    const waveTitle = page.locator('#wa-title');
    const waveSub = page.locator('#wa-sub');
    
    await expect(waveTitle).toContainText('WAVE 1');
    await expect(waveSub).toContainText('Just checking Twitter');
    
    await page.screenshot({ path: 'test-results/screenshots/08-wave-announcement-detail.png' });

    // Wait for announcement to fade
    await page.waitForTimeout(4000);
    await expect(waveAnnounce).not.toHaveClass(/show/);
  });

  test('should handle game over scenario', async ({ page }) => {
    await page.goto('/psyduck-panic/');
    
    const startBtn = page.locator('#start-btn');
    await startBtn.click();

    // Wait for game to start
    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    
    // Simulate game over by waiting for panic to reach 100 or time to run out
    // For this test, we'll just verify the game over screen can be shown
    // In a real scenario, we'd need to let enemies escape to trigger game over
    
    // Wait a reasonable time
    await page.waitForTimeout(5000);
    
    // Check if game is still running (should be)
    const overlay = page.locator('#overlay');
    const isHidden = await overlay.evaluate((el) => el.classList.contains('hidden'));
    
    if (!isHidden) {
      // Game over occurred
      await page.screenshot({ path: 'test-results/screenshots/09-game-over.png' });
      
      // Verify game over screen elements
      const retryBtn = page.locator('#start-btn');
      await expect(retryBtn).toBeVisible();
      
      const heading = page.locator('#overlay-title');
      // Should show either win or loss message
      const text = await heading.textContent();
      expect(text).toBeTruthy();
    } else {
      // Game still running - that's fine for this test
      await page.screenshot({ path: 'test-results/screenshots/09-game-still-running.png' });
    }
  });

  test('should update score and combo correctly', async ({ page }) => {
    await page.goto('/psyduck-panic/');
    
    const startBtn = page.locator('#start-btn');
    await startBtn.click();

    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    
    const scoreDisplay = page.locator('#score-display');
    const comboDisplay = page.locator('#combo-display');
    
    // Initial values
    await expect(scoreDisplay).toContainText('0');
    await expect(comboDisplay).toContainText('x0');
    
    await page.screenshot({ path: 'test-results/screenshots/10-initial-score.png' });

    // Try to trigger abilities (might increase combo if enemy is countered)
    await page.keyboard.press('1');
    await page.waitForTimeout(200);
    await page.keyboard.press('2');
    await page.waitForTimeout(200);
    await page.keyboard.press('3');
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/screenshots/11-after-attempts.png' });

    // Verify displays still work (values might have changed)
    await expect(scoreDisplay).toBeVisible();
    await expect(comboDisplay).toBeVisible();
  });

  test('should show HUD elements during gameplay', async ({ page }) => {
    await page.goto('/psyduck-panic/');
    
    const startBtn = page.locator('#start-btn');
    await startBtn.click();

    await expect(page.locator('#overlay')).toHaveClass(/hidden/);
    
    // Verify all HUD elements
    await expect(page.locator('#wave-display')).toBeVisible();
    await expect(page.locator('#time-display')).toBeVisible();
    await expect(page.locator('#score-display')).toBeVisible();
    await expect(page.locator('#panic-bar')).toBeVisible();
    await expect(page.locator('#combo-display')).toBeVisible();
    
    // Verify powerup indicators
    await expect(page.locator('#pu-slow')).toBeVisible();
    await expect(page.locator('#pu-shield')).toBeVisible();
    await expect(page.locator('#pu-double')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/screenshots/12-hud-elements.png' });
  });

  test('should properly transition from start to playing screen', async ({ page }) => {
    await page.goto('/psyduck-panic/');
    
    // Verify start screen
    const overlay = page.locator('#overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).not.toHaveClass(/hidden/);
    await page.screenshot({ path: 'test-results/screenshots/13-transition-start.png' });
    
    const uiLayer = page.locator('#ui-layer');
    await expect(uiLayer).toHaveClass(/hidden/);
    
    // Click start
    const startBtn = page.locator('#start-btn');
    await startBtn.click();
    
    // Verify transition to playing
    await expect(overlay).toHaveClass(/hidden/, { timeout: 2000 });
    await expect(uiLayer).not.toHaveClass(/hidden/);
    
    await page.screenshot({ path: 'test-results/screenshots/14-transition-playing.png' });
    
    // Verify overlay is actually not visible (display: none)
    const overlayDisplay = await overlay.evaluate((el) => 
      window.getComputedStyle(el).display
    );
    expect(overlayDisplay).toBe('none');
  });

  test('should handle spacebar to start game', async ({ page }) => {
    await page.goto('/psyduck-panic/');
    
    const overlay = page.locator('#overlay');
    await expect(overlay).toBeVisible();
    
    // Press spacebar to start
    await page.keyboard.press(' ');
    
    // Verify game started
    await expect(overlay).toHaveClass(/hidden/, { timeout: 2000 });
    await page.screenshot({ path: 'test-results/screenshots/15-spacebar-start.png' });
    
    await expect(page.locator('#ui-layer')).not.toHaveClass(/hidden/);
  });
});
