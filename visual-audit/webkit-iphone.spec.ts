import { test,expect } from '@playwright/test';

test('WebKit iPhone landscape keeps seven-phase expanded editor interactive without runtime errors',async({page,browserName})=>{
  test.skip(browserName!=='webkit','WebKit-only compatibility gate');
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:844,height:390});await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('canvas.character-canvas')).toBeVisible();
  const renderer=(await page.locator('#renderer-mode').textContent())?.trim();expect(['WEBGL','CANVAS2D']).toContain(renderer);

  const shell=page.locator('.app-shell'),focus=page.locator('button[data-editor-focus]');
  await expect(shell).toHaveAttribute('data-active-category','hair');await expect(page.locator('.expression-bar')).toHaveClass(/collapsed/);
  await page.locator('.category-rail button[data-focus="outfit"]').click();await expect(shell).toHaveAttribute('data-active-category','outfit');await expect(page.locator('.right-panel')).toBeHidden();
  const garmentBox=await page.locator('#outfit-options .part-card').first().boundingBox();expect(garmentBox).toBeTruthy();expect(garmentBox!.height).toBeGreaterThanOrEqual(80);
  await page.locator('button[data-minimal-layer="strap"]').click();await expect(page.locator('button[data-minimal-layer="strap"]')).toHaveClass(/minimal-off/);
  await page.locator('button[data-clothing-color="shirt"]').nth(1).click();await expect(page.locator('button[data-clothing-color="shirt"]').nth(1)).toHaveClass(/selected/);
  await page.locator('button[data-clothing-color="trim"]').nth(4).click();await expect(page.locator('button[data-clothing-color="trim"]').nth(4)).toHaveClass(/selected/);
  await page.locator('button[data-clothing-color="accent"]').nth(2).click();await expect(page.locator('button[data-clothing-color="accent"]').nth(2)).toHaveClass(/selected/);
  await focus.click();await expect(shell).toHaveAttribute('data-editor-focus','true');await expect(page.locator('.left-panel')).toBeHidden();await expect(page.locator('.right-panel')).toBeHidden();
  await focus.click();await expect(shell).toHaveAttribute('data-editor-focus','false');await expect(page.locator('.left-panel')).toBeVisible();

  await page.locator('.category-rail button[data-focus="hair"]').click();await expect(page.locator('#hair-modular-v1')).toBeVisible();
  await page.locator('button[data-hair-modular="back"][data-id="wavy"]').click();await expect(page.locator('button[data-hair-modular="back"][data-id="wavy"]')).toHaveClass(/selected/);
  await page.locator('button[data-hair-modular="extra"][data-id="bun"]').click();await expect(page.locator('button[data-hair-modular="extra"][data-id="bun"]')).toHaveClass(/selected/);

  await page.locator('.category-rail button[data-focus="accessory"]').click();await expect(shell).toHaveAttribute('data-active-category','accessory');await expect(page.locator('#accessory-section')).toBeVisible();
  await page.locator('button[data-accessory-kind="headwear"][data-id="beanie"]').click();
  await page.locator('button[data-accessory-kind="eyewear"][data-id="round-glasses"]').click();
  await page.locator('button[data-accessory-kind="faceDetail"][data-id="freckles"]').click();
  await page.locator('button[data-accessory-kind="earAccessory"][data-id="hoop-earring"]').click();
  for(const locator of [
    'button[data-accessory-kind="headwear"][data-id="beanie"]',
    'button[data-accessory-kind="eyewear"][data-id="round-glasses"]',
    'button[data-accessory-kind="faceDetail"][data-id="freckles"]',
    'button[data-accessory-kind="earAccessory"][data-id="hoop-earring"]',
  ])await expect(page.locator(locator)).toHaveClass(/selected/);

  await expect(page.locator('button[data-action="save-slot"]')).toBeVisible();await page.locator('button[data-action="save-slot"]').click();await expect(page.locator('#save-status')).toContainText('SAVED');
  await page.locator('button[data-accessory-kind="headwear"][data-id="none"]').click();await expect(page.locator('button[data-accessory-kind="headwear"][data-id="none"]')).toHaveClass(/selected/);
  await page.locator('button[data-action="load-slot"]').click();await expect(page.locator('button[data-accessory-kind="headwear"][data-id="beanie"]')).toHaveClass(/selected/);

  await page.locator('button[data-preview-focus="solo"]').click();await expect(page.locator('button[data-preview-focus="solo"]')).toHaveClass(/selected/);
  const afterDisplay=await page.locator('.preview-panel').evaluate(el=>getComputedStyle(el,'::after').display);expect(afterDisplay).toBe('none');await page.locator('button[data-preview-focus="solo"]').click();
  await page.locator('.top-actions button[data-motion-open]').click();await expect(page.locator('.motion-studio')).toBeVisible();await page.locator('.expression-bar [data-expression="happy"]').click();await expect(page.locator('.expression-bar [data-expression="happy"]')).toHaveClass(/selected/);await page.locator('button[data-motion-close]').click();
  await page.locator('.top-actions button[data-cutscene-open]').click();await expect(page.locator('.cutscene-studio')).toBeVisible();await page.locator('button[data-cutscene-close]').click();
  expect(errors).toEqual([]);await page.screenshot({path:'test-results/webkit-iphone-landscape.png',fullPage:true});
});
