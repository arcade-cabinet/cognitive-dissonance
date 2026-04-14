import { type Page, expect } from '@playwright/test';

export async function waitForCanvas(page: Page, timeout = 30_000) {
  const canvas = page.locator('canvas');
  await expect(canvas.first()).toBeVisible({ timeout });
  return canvas.first();
}

export async function getCanvasDimensions(
  page: Page,
): Promise<{ width: number; height: number } | null> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    return { width: canvas.clientWidth, height: canvas.clientHeight };
  });
}
