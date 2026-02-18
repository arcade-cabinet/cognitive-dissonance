import { Page, expect } from '@playwright/test';

export async function waitForCanvas(page: Page, timeout = 30_000) {
  const canvas = page.locator('#reactylon-canvas, canvas');
  await expect(canvas.first()).toBeVisible({ timeout });
  return canvas.first();
}

export async function getCanvasDimensions(page: Page): Promise<{ width: number; height: number } | null> {
  return page.evaluate(() => {
    const canvas = document.querySelector('#reactylon-canvas') ?? document.querySelector('canvas');
    if (!canvas) return null;
    return { width: canvas.clientWidth, height: canvas.clientHeight };
  });
}

export async function getGameState(page: Page) {
  return page.evaluate(() => (window as any).__gameState ?? null);
}

export async function waitForTitleFade(page: Page, timeout = 30_000) {
  // Wait for loading screen (2s) + title sizzle (2.4s) + fade (0.9s) to complete
  await page.waitForFunction(
    () => {
      const loading = document.querySelector('[data-testid="loading-overlay"]');
      const title = document.querySelector('[data-testid="title-overlay"]');
      const loadingGone = !loading || getComputedStyle(loading).opacity === '0';
      const titleGone = !title || getComputedStyle(title).opacity === '0';
      return loadingGone && titleGone;
    },
    { timeout },
  );
}
