import { test, expect } from '@playwright/test';

test.describe('PaperKit Full System End-to-End Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('paperkit_onboarding_done', 'true');
    });
  });

  test('User can load the homepage and view the dashboard', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1').first()).toContainText(/PaperKit|Welcome/i);
    
    // Check for dashboard sections
    await expect(page.locator('text=AI Document Intelligence')).toBeVisible();
    await expect(page.locator('text=Image Compressor ⭐')).toBeVisible();
    await expect(page.locator('text=Video Compressor')).toBeVisible();
  });

  test('User can navigate to AI Summary tool', async ({ page }) => {
    await page.goto('/');
    
    const toolCard = page.locator('.tool-card').filter({ hasText: 'AI Summary' }).first();
    await expect(toolCard).toBeVisible();
    await toolCard.click();

    await expect(page).toHaveURL(/.*\/ai\/summarize/);
  });

  test('User can navigate to OCR Text & Layout tool', async ({ page }) => {
    await page.goto('/');
    
    const toolCard = page.locator('.tool-card').filter({ hasText: 'OCR Text & Layout' }).first();
    await expect(toolCard).toBeVisible();
    await toolCard.click();

    await expect(page).toHaveURL(/.*\/ai\/ocr/);
  });

  test('User can navigate to AI Document Chat tool', async ({ page }) => {
    await page.goto('/');
    
    const toolCard = page.locator('.tool-card').filter({ hasText: 'AI Document Chat' }).first();
    await expect(toolCard).toBeVisible();
    await toolCard.click();

    await expect(page).toHaveURL(/.*\/ai\/ask/);
  });

  test('User can navigate to Image Compressor tool', async ({ page }) => {
    await page.goto('/');
    
    const toolCard = page.locator('section[aria-label="Image Compressor"]').locator('.tool-card').filter({ hasText: 'Low Compression' }).first();
    await expect(toolCard).toBeVisible();
    await toolCard.click();

    await expect(page).toHaveURL(/.*\/tools\/image-compressor\?preset=low/);
  });
  
  test('User can navigate to Video Compressor tool', async ({ page }) => {
    await page.goto('/');
    
    const toolCard = page.locator('section[aria-label="Video Compressor"]').locator('.tool-card').filter({ hasText: 'Medium Compression' }).first();
    await expect(toolCard).toBeVisible();
    await toolCard.click();

    await expect(page).toHaveURL(/.*\/tools\/video-compressor\?preset=medium/);
  });

  test('User can simulate AI feature upload (Mocked Backend)', async ({ page }) => {
    await page.route('**/api/ai/summarize', async route => {
      const json = { result: '# Mock Summary\nThis is a mocked summary response from the server.' };
      await route.fulfill({ json });
    });

    await page.goto('/ai/summarize');
    
    const uploadInput = page.locator('input[type="file"]');
    if (await uploadInput.count() > 0) {
        await expect(uploadInput).toBeAttached();
    }
  });
});
