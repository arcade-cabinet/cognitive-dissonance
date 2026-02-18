import { Page, expect } from '@playwright/test';

export async function waitForCanvas(page: Page, timeout = 30_000) {
  const canvas = page.locator('#reactylon-canvas, canvas');
  await expect(canvas.first()).toBeVisible({ timeout });
  return canvas.first();
}

export async function getCanvasDimensions(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#reactylon-canvas') ?? document.querySelector('canvas');
    if (!canvas) return null;
    return { width: canvas.clientWidth, height: canvas.clientHeight };
  });
}

export async function getGameState(page: Page) {
  return page.evaluate(() => (window as any).__gameState ?? null);
}

export async function waitForTitleFade(page: Page, timeout = 10_000) {
  await page.waitForFunction(
    () => {
      const title = document.querySelector('[class*="z-30"]');
      return !title || getComputedStyle(title).opacity === '0';
    },
    { timeout },
  );
}
