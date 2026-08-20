import { test,expect } from '@playwright/test';

test('iPhone landscape keeps primary editor actions touch-sized and save controls available',async({page})=>{
  await page.setViewportSize({width:844,height:390});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  const topButtons=page.locator('.top-actions button');await expect(topButtons).toHaveCount(8);
  for(let i=0;i<await topButtons.count();i++){const box=await topButtons.nth(i).boundingBox();expect(box).toBeTruthy();expect(box!.height).toBeGreaterThanOrEqual(44);}
  const categories=page.locator('.category-rail button');await expect(categories).toHaveCount(9);
  for(let i=0;i<await categories.count();i++){const box=await categories.nth(i).boundingBox();expect(box).toBeTruthy();expect(box!.height).toBeGreaterThanOrEqual(44);}
  const viewButtons=page.locator('.preview-footer .view-button');expect(await viewButtons.count()).toBeGreaterThanOrEqual(6);
  for(let i=0;i<await viewButtons.count();i++){const box=await viewButtons.nth(i).boundingBox();expect(box).toBeTruthy();expect(box!.height).toBeGreaterThanOrEqual(44);}
  const expressionToggle=page.locator('button[data-expression-toggle]');await expect(expressionToggle).toBeVisible();await expressionToggle.click();
  const expressionButtons=page.locator('.expression-buttons button');await expect(expressionButtons).toHaveCount(8);
  for(let i=0;i<await expressionButtons.count();i++){const box=await expressionButtons.nth(i).boundingBox();expect(box).toBeTruthy();expect(box!.height).toBeGreaterThanOrEqual(44);}
  const save=page.locator('button[data-action="save-slot"]'),load=page.locator('button[data-action="load-slot"]');
  await expect(save).toBeVisible();await expect(load).toBeVisible();
  for(const control of [save,load]){const box=await control.boundingBox();expect(box).toBeTruthy();expect(box!.height).toBeGreaterThanOrEqual(44);}
  await page.screenshot({path:'test-results/ux-iphone-landscape.png',fullPage:true});
});

test('clothing preview focus is non-destructive and works in Canvas2D',async({page})=>{
  await page.setViewportSize({width:844,height:390});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  const canvas=page.locator('canvas.character-canvas');await expect(canvas).toBeVisible();
  const baseline=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());
  const dim=page.locator('button[data-preview-focus="dim"]'),solo=page.locator('button[data-preview-focus="solo"]');
  await dim.click();await expect(dim).toHaveClass(/selected/);expect(await page.evaluate(()=>(window as Window&{__FACE_EDITOR_PREVIEW_FOCUS__?:string}).__FACE_EDITOR_PREVIEW_FOCUS__)).toBe('dim');
  const dimmed=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());expect(dimmed).not.toBe(baseline);
  await solo.click();await expect(solo).toHaveClass(/selected/);await expect(dim).not.toHaveClass(/selected/);
  const visibility=await page.evaluate(()=>(window as Window&{__FACE_EDITOR_PREVIEW_VISIBILITY__?:{hidden?:string[];dimmed?:string[]}}).__FACE_EDITOR_PREVIEW_VISIBILITY__);
  expect(visibility?.hidden).toEqual(expect.arrayContaining(['hood','strap','strap-metal','accent','headwear','eyewear','face-detail','ear-accessory']));
  const soloImage=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());expect(soloImage).not.toBe(dimmed);
  const afterDisplay=await page.locator('.preview-panel').evaluate(el=>getComputedStyle(el,'::after').display);expect(afterDisplay).toBe('none');
  const exportedBefore=await page.locator('#outfit-options .part-card.selected').getAttribute('data-id');
  await solo.click();expect(await page.evaluate(()=>(window as Window&{__FACE_EDITOR_PREVIEW_FOCUS__?:string}).__FACE_EDITOR_PREVIEW_FOCUS__)).toBe('all');
  await expect(page.locator('#outfit-options .part-card.selected')).toHaveAttribute('data-id',exportedBefore??'');
});

test('Motion and Cutscene use focused preview-first workspaces on iPhone landscape',async({page})=>{
  await page.setViewportSize({width:844,height:390});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  await page.locator('.top-actions button[data-motion-open]').click();const motion=page.locator('.motion-studio');await expect(motion).toBeVisible();
  await expect(page.locator('.left-panel')).toBeHidden();await expect(page.locator('.right-panel')).toBeHidden();await expect(page.locator('.category-rail')).toBeHidden();
  let previewBox=await page.locator('.preview-panel').boundingBox(),motionBox=await motion.boundingBox();expect(previewBox).toBeTruthy();expect(motionBox).toBeTruthy();expect(motionBox!.height).toBeLessThan(previewBox!.height*.46);expect(motionBox!.y-previewBox!.y).toBeGreaterThan(previewBox!.height*.18);
  await page.locator('.expression-bar [data-expression="angry"]').click();await expect(page.locator('.expression-bar [data-expression="angry"]')).toHaveClass(/selected/);
  await page.screenshot({path:'test-results/motion-preview-first-iphone.png',fullPage:true});await motion.locator('button[data-motion-close]').click();
  await expect(page.locator('.left-panel')).toBeVisible();
  await page.locator('.top-actions button[data-cutscene-open]').click();const cutscene=page.locator('.cutscene-studio');await expect(cutscene).toBeVisible();
  await expect(page.locator('.left-panel')).toBeHidden();await expect(page.locator('.right-panel')).toBeHidden();previewBox=await page.locator('.preview-panel').boundingBox();const cutsceneBox=await cutscene.boundingBox();expect(previewBox).toBeTruthy();expect(cutsceneBox).toBeTruthy();expect(cutsceneBox!.height).toBeLessThan(previewBox!.height*.48);expect(cutsceneBox!.y-previewBox!.y).toBeGreaterThan(previewBox!.height*.14);
  await page.screenshot({path:'test-results/cutscene-preview-first-iphone.png',fullPage:true});
});

test('Preview-First UX v2 Focus Mode expands the normal character workspace and restores contextual editing',async({page})=>{
  await page.setViewportSize({width:844,height:390});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  const shell=page.locator('.app-shell'),preview=page.locator('.preview-panel'),focus=page.locator('button[data-editor-focus]');
  await expect(shell).toHaveAttribute('data-active-category','hair');await expect(page.locator('.left-panel')).toBeVisible();await expect(page.locator('.right-panel')).toBeHidden();
  const before=await preview.boundingBox();expect(before).toBeTruthy();
  await focus.click();await expect(focus).toHaveClass(/selected/);await expect(shell).toHaveAttribute('data-editor-focus','true');await expect(page.locator('.left-panel')).toBeHidden();await expect(page.locator('.right-panel')).toBeHidden();
  const focused=await preview.boundingBox();expect(focused).toBeTruthy();expect(focused!.width).toBeGreaterThan(before!.width+150);
  await focus.click();await expect(shell).toHaveAttribute('data-editor-focus','false');await expect(page.locator('.left-panel')).toBeVisible();
});

test('Preview-First UX v2 category context swaps side panels and enlarges garment thumbnails',async({page})=>{
  await page.setViewportSize({width:844,height:390});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  const shell=page.locator('.app-shell');
  await page.locator('.category-rail button[data-focus="outfit"]').click();await expect(shell).toHaveAttribute('data-active-category','outfit');
  await expect(page.locator('#outfit-section')).toBeVisible();await expect(page.locator('#hair-section')).toBeHidden();await expect(page.locator('.right-panel')).toBeHidden();
  const garment=page.locator('#outfit-options .part-card').first(),thumb=garment.locator('.part-thumb');const garmentBox=await garment.boundingBox(),thumbBox=await thumb.boundingBox();expect(garmentBox).toBeTruthy();expect(thumbBox).toBeTruthy();expect(garmentBox!.height).toBeGreaterThanOrEqual(80);expect(thumbBox!.height).toBeGreaterThanOrEqual(56);
  await page.locator('.category-rail button[data-focus="eyes"]').click();await expect(shell).toHaveAttribute('data-active-category','eyes');await expect(page.locator('.left-panel')).toBeHidden();await expect(page.locator('.right-panel')).toBeVisible();await expect(page.locator('#eyes-section')).toBeVisible();await expect(page.locator('#mouth-section')).toBeHidden();
  await page.locator('.category-rail button[data-focus="accessory"]').click();await expect(shell).toHaveAttribute('data-active-category','accessory');await expect(page.locator('.left-panel')).toBeHidden();await expect(page.locator('#accessory-section')).toBeVisible();
});

test('Preview-First UX v2 expression strip starts compact on iPhone and expands without changing expression',async({page})=>{
  await page.setViewportSize({width:844,height:390});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  const bar=page.locator('.expression-bar'),toggle=page.locator('button[data-expression-toggle]'),neutral=page.locator('button[data-expression="neutral"]');
  await expect(bar).toHaveClass(/collapsed/);await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(neutral).toBeHidden();
  await toggle.click();await expect(bar).not.toHaveClass(/collapsed/);await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(neutral).toBeVisible();await expect(neutral).toHaveClass(/selected/);
});

test('Accessory Preview-First UI shows one family at a time and keeps the iPhone preview dominant',async({page})=>{
  await page.setViewportSize({width:844,height:390});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  await page.locator('.category-rail button[data-focus="accessory"]').click();
  const tabs=page.locator('button[data-accessory-family]');await expect(tabs).toHaveCount(4);
  for(let i=0;i<4;i++){const box=await tabs.nth(i).boundingBox();expect(box).toBeTruthy();expect(box!.height).toBeGreaterThanOrEqual(44);}
  await expect(page.locator('.accessory-pack-row')).toHaveCount(1);await expect(page.locator('button[data-accessory-kind="headwear"]')).toHaveCount(9);await expect(page.locator('button[data-accessory-kind="eyewear"]')).toHaveCount(0);
  const previewBox=await page.locator('.preview-panel').boundingBox(),rightBox=await page.locator('.right-panel').boundingBox();expect(previewBox).toBeTruthy();expect(rightBox).toBeTruthy();expect(rightBox!.width).toBeLessThanOrEqual(200);expect(previewBox!.width).toBeGreaterThan(500);
  await page.locator('button[data-accessory-family="eyewear"]').click();await expect(page.locator('button[data-accessory-kind="headwear"]')).toHaveCount(0);await expect(page.locator('button[data-accessory-kind="eyewear"]')).toHaveCount(9);
  await page.locator('button[data-accessory-family="faceDetail"]').click();await expect(page.locator('button[data-accessory-kind="faceDetail"]')).toHaveCount(9);
  await page.locator('button[data-accessory-family="earAccessory"]').click();await expect(page.locator('button[data-accessory-kind="earAccessory"]')).toHaveCount(9);
});

test('Face Outline Inspect fades hair and head accessories without mutating character data',async({page})=>{
  await page.setViewportSize({width:844,height:390});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  await page.locator('.category-rail button[data-focus="accessory"]').click();await page.locator('button[data-accessory-kind="headwear"][data-id="beanie"]').click();
  const selectedBefore=await page.locator('button[data-accessory-kind="headwear"][data-id="beanie"]').getAttribute('class');
  await page.locator('.category-rail button[data-focus="outline"]').click();
  expect(await page.evaluate(()=>(window as Window&{__FACE_EDITOR_OUTLINE_INSPECT__?:boolean}).__FACE_EDITOR_OUTLINE_INSPECT__)).toBe(true);
  const visibility=await page.evaluate(()=>(window as Window&{__FACE_EDITOR_PREVIEW_VISIBILITY__?:{hidden?:string[];dimmed?:string[]}}).__FACE_EDITOR_PREVIEW_VISIBILITY__);
  expect(visibility?.dimmed).toEqual(expect.arrayContaining(['hair-back','hair-front','hair-accent','headwear','eyewear','ear-accessory']));expect(visibility?.hidden??[]).not.toContain('headwear');
  await page.locator('.category-rail button[data-focus="accessory"]').click();expect(await page.evaluate(()=>(window as Window&{__FACE_EDITOR_OUTLINE_INSPECT__?:boolean}).__FACE_EDITOR_OUTLINE_INSPECT__)).toBe(false);
  await expect(page.locator('button[data-accessory-kind="headwear"][data-id="beanie"]')).toHaveClass(new RegExp(selectedBefore?.includes('selected')?'selected':'$a'));
});
