import { test,expect } from '@playwright/test';

test('WebKit iPhone landscape keeps editor interactive without runtime errors',async({page,browserName})=>{
  test.skip(browserName!=='webkit','WebKit-only compatibility gate');
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:844,height:390});await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('canvas.character-canvas')).toBeVisible();
  const renderer=(await page.locator('#renderer-mode').textContent())?.trim();expect(['WEBGL','CANVAS2D']).toContain(renderer);
  await page.locator('.category-rail button[data-focus="outfit"]').click();
  await page.locator('#outfit-options .part-card').nth(7).click();await expect(page.locator('#outfit-options .part-card').nth(7)).toHaveClass(/selected/);
  await page.locator('button[data-preview-focus="solo"]').click();await expect(page.locator('button[data-preview-focus="solo"]')).toHaveClass(/selected/);
  await page.locator('.top-actions button[data-motion-open]').click();await expect(page.locator('.motion-studio')).toBeVisible();await page.locator('.expression-bar [data-expression="happy"]').click();await expect(page.locator('.expression-bar [data-expression="happy"]')).toHaveClass(/selected/);await page.locator('button[data-motion-close]').click();
  await page.locator('.top-actions button[data-cutscene-open]').click();await expect(page.locator('.cutscene-studio')).toBeVisible();await page.locator('button[data-cutscene-close]').click();
  await expect(page.locator('button[data-action="save-slot"]')).toBeVisible();await page.locator('button[data-action="save-slot"]').click();await expect(page.locator('#save-status')).toContainText('SAVED');
  expect(errors).toEqual([]);await page.screenshot({path:'test-results/webkit-iphone-landscape.png',fullPage:true});
});
