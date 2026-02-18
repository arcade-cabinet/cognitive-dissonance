/**
 * Screenshot capture script — takes game screenshots for PR.
 * Run: xvfb-run npx playwright test e2e/screenshot.ts
 */
import { chromium } from '@playwright/test';

async function captureScreenshots() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--use-gl=angle'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto('http://localhost:3001');

  // 1. Loading screen
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/01-loading-screen.png', fullPage: false });
  console.log('✓ Loading screen captured');

  // 2. Title sizzle
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'screenshots/02-title-sizzle.png', fullPage: false });
  console.log('✓ Title sizzle captured');

  // 3. Game scene (after title fades)
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'screenshots/03-game-scene.png', fullPage: false });
  console.log('✓ Game scene captured');

  // 4. Click to init audio + let game run
  await page.click('canvas', { force: true });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'screenshots/04-gameplay-active.png', fullPage: false });
  console.log('✓ Active gameplay captured');

  // 5. Force game over
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('gameOver'));
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshots/05-game-over.png', fullPage: false });
  console.log('✓ Game over captured');

  await browser.close();
  console.log('\nAll screenshots saved to screenshots/');
}

captureScreenshots().catch(console.error);
