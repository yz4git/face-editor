import { test,expect } from '@playwright/test';

test('WebKit iPhone portrait keeps the complete editor usable and preview-first',async({page,browserName})=>{
  test.skip(browserName!=='webkit','WebKit-only portrait gate');
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4173/');

  const shell=page.locator('.app-shell'),preview=page.locator('.preview-panel'),canvas=page.locator('canvas.character-canvas');
  await expect(canvas).toBeVisible();
  const renderer=(await page.locator('#renderer-mode').textContent())?.trim();expect(['WEBGL','CANVAS2D']).toContain(renderer);

  const topbar=page.locator('.topbar'),actions=page.locator('.top-actions button'),categories=page.locator('.category-rail button');
  await expect(actions).toHaveCount(8);await expect(categories).toHaveCount(9);
  const topBox=await topbar.boundingBox();expect(topBox).toBeTruthy();expect(topBox!.width).toBeGreaterThan(360);
  for(let i=0;i<await actions.count();i++){const box=await actions.nth(i).boundingBox();expect(box).toBeTruthy();expect(box!.height).toBeGreaterThanOrEqual(44);}
  for(let i=0;i<await categories.count();i++){const box=await categories.nth(i).boundingBox();expect(box).toBeTruthy();expect(box!.height).toBeGreaterThanOrEqual(44);}
  const railOverflow=await page.locator('.category-rail').evaluate(el=>({scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));expect(railOverflow.scrollWidth).toBeGreaterThan(railOverflow.clientWidth);

  const initialPreview=await preview.boundingBox();expect(initialPreview).toBeTruthy();expect(initialPreview!.width).toBeGreaterThan(360);expect(initialPreview!.height).toBeGreaterThanOrEqual(245);
  const save=page.locator('button[data-action="save-slot"]'),load=page.locator('button[data-action="load-slot"]');await expect(save).toBeVisible();await expect(load).toBeVisible();
  for(const control of [save,load]){const box=await control.boundingBox();expect(box).toBeTruthy();expect(box!.height).toBeGreaterThanOrEqual(44);}

  await page.locator('.category-rail button[data-focus="outfit"]').click();await expect(shell).toHaveAttribute('data-active-category','outfit');await expect(page.locator('.left-panel')).toBeVisible();await expect(page.locator('.right-panel')).toBeHidden();
  const previewOutfit=await preview.boundingBox(),left=await page.locator('.left-panel').boundingBox();expect(previewOutfit).toBeTruthy();expect(left).toBeTruthy();expect(left!.y).toBeGreaterThan(previewOutfit!.y+previewOutfit!.height-2);
  const garment=page.locator('#outfit-options .part-card').first(),garmentBox=await garment.boundingBox();expect(garmentBox).toBeTruthy();expect(garmentBox!.height).toBeGreaterThanOrEqual(95);
  await page.locator('button[data-minimal-layer="strap"]').click();await expect(page.locator('button[data-minimal-layer="strap"]')).toHaveClass(/minimal-off/);
  await page.locator('button[data-clothing-color="secondary"]').nth(2).click();await expect(page.locator('button[data-clothing-color="secondary"]').nth(2)).toHaveClass(/selected/);
  await page.locator('button[data-clothing-color="hardware"]').nth(3).click();await expect(page.locator('button[data-clothing-color="hardware"]').nth(3)).toHaveClass(/selected/);

  const focus=page.locator('button[data-editor-focus]');await focus.click();await expect(shell).toHaveAttribute('data-editor-focus','true');await expect(page.locator('.left-panel')).toBeHidden();const focused=await preview.boundingBox();expect(focused).toBeTruthy();expect(focused!.height).toBeGreaterThan(previewOutfit!.height+120);await focus.click();

  await page.locator('.category-rail button[data-focus="accessory"]').click();await expect(shell).toHaveAttribute('data-active-category','accessory');await expect(page.locator('#accessory-section')).toBeVisible();
  const familyTabs=page.locator('button[data-accessory-family]');await expect(familyTabs).toHaveCount(4);for(let i=0;i<4;i++){const box=await familyTabs.nth(i).boundingBox();expect(box).toBeTruthy();expect(box!.height).toBeGreaterThanOrEqual(44);}
  await page.locator('button[data-accessory-kind="headwear"][data-id="beanie"]').click();await page.locator('button[data-accessory-family="eyewear"]').click();await page.locator('button[data-accessory-kind="eyewear"][data-id="round-glasses"]').click();await page.locator('button[data-accessory-family="faceDetail"]').click();await page.locator('button[data-accessory-kind="faceDetail"][data-id="freckles"]').click();

  await page.locator('.category-rail button[data-focus="outline"]').click();await expect(shell).toHaveAttribute('data-active-category','outline');expect(await page.evaluate(()=>(window as Window&{__FACE_EDITOR_PREVIEW_VISIBILITY__?:{dimmed?:string[]}}).__FACE_EDITOR_PREVIEW_VISIBILITY__?.dimmed)).toEqual(expect.arrayContaining(['hair-front','hair-back','headwear']));

  await save.click();await expect(page.locator('#save-status')).toContainText('SAVED');

  await page.locator('.top-actions button[data-factory-open]').click();const factory=page.locator('.factory-panel');await expect(factory).toBeVisible();await expect(page.locator('.factory-card')).toHaveCount(12);
  const first=await page.locator('.factory-card').nth(0).boundingBox(),second=await page.locator('.factory-card').nth(1).boundingBox(),third=await page.locator('.factory-card').nth(2).boundingBox();expect(first&&second&&third).toBeTruthy();expect(Math.abs(first!.y-second!.y)).toBeLessThan(4);expect(third!.y).toBeGreaterThan(first!.y+80);await page.locator('.factory-close').click();

  await page.locator('.top-actions button[data-motion-open]').click();await expect(page.locator('.motion-studio')).toBeVisible();const motion=await page.locator('.motion-studio').boundingBox(),motionPreview=await preview.boundingBox();expect(motion&&motionPreview).toBeTruthy();expect(motion!.height).toBeLessThan(motionPreview!.height*.60);await page.locator('button[data-motion-close]').click();
  await page.locator('.top-actions button[data-cutscene-open]').click();await expect(page.locator('.cutscene-studio')).toBeVisible();const cutscene=await page.locator('.cutscene-studio').boundingBox(),cutscenePreview=await preview.boundingBox();expect(cutscene&&cutscenePreview).toBeTruthy();expect(cutscene!.height).toBeLessThan(cutscenePreview!.height*.70);await page.locator('button[data-cutscene-close]').click();

  expect(errors).toEqual([]);await page.screenshot({path:'test-results/webkit-iphone-portrait.png',fullPage:true});
});
