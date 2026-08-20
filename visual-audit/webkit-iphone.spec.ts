import { test,expect } from '@playwright/test';

test('WebKit iPhone landscape keeps Preview-First editor interactive without runtime errors',async({page,browserName})=>{
  test.skip(browserName!=='webkit','WebKit-only compatibility gate');
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:844,height:390});await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('canvas.character-canvas')).toBeVisible();
  const renderer=(await page.locator('#renderer-mode').textContent())?.trim();expect(['WEBGL','CANVAS2D']).toContain(renderer);

  const shell=page.locator('.app-shell'),focus=page.locator('button[data-editor-focus]');
  await expect(shell).toHaveAttribute('data-active-category','hair');await expect(page.locator('.expression-bar')).toHaveClass(/collapsed/);
  await page.locator('.category-rail button[data-focus="outfit"]').click();await expect(shell).toHaveAttribute('data-active-category','outfit');await expect(page.locator('.right-panel')).toBeHidden();
  const garmentBox=await page.locator('#outfit-options .part-card').first().boundingBox();expect(garmentBox).toBeTruthy();expect(garmentBox!.height).toBeGreaterThanOrEqual(80);
  await focus.click();await expect(shell).toHaveAttribute('data-editor-focus','true');await expect(page.locator('.left-panel')).toBeHidden();await expect(page.locator('.right-panel')).toBeHidden();
  await focus.click();await expect(shell).toHaveAttribute('data-editor-focus','false');await expect(page.locator('.left-panel')).toBeVisible();

  await page.locator('#outfit-options .part-card').nth(7).click();await expect(page.locator('#outfit-options .part-card').nth(7)).toHaveClass(/selected/);
  await page.locator('button[data-preview-focus="solo"]').click();await expect(page.locator('button[data-preview-focus="solo"]')).toHaveClass(/selected/);
  const afterDisplay=await page.locator('.preview-panel').evaluate(el=>getComputedStyle(el,'::after').display);expect(afterDisplay).toBe('none');

  await page.locator('.top-actions button[data-motion-open]').click();await expect(page.locator('.motion-studio')).toBeVisible();await page.locator('.expression-bar [data-expression="happy"]').click();await expect(page.locator('.expression-bar [data-expression="happy"]')).toHaveClass(/selected/);await page.locator('button[data-motion-close]').click();
  await page.locator('.top-actions button[data-cutscene-open]').click();await expect(page.locator('.cutscene-studio')).toBeVisible();await page.locator('button[data-cutscene-close]').click();
  await expect(page.locator('button[data-action="save-slot"]')).toBeVisible();await page.locator('button[data-action="save-slot"]').click();await expect(page.locator('#save-status')).toContainText('SAVED');
  expect(errors).toEqual([]);await page.screenshot({path:'test-results/webkit-iphone-landscape.png',fullPage:true});
});
