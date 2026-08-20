import { test,expect } from '@playwright/test';

test('iPhone landscape keeps primary editor actions touch-sized and save controls available',async({page})=>{
  await page.setViewportSize({width:844,height:390});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  const topButtons=page.locator('.top-actions button');await expect(topButtons).toHaveCount(8);
  for(let i=0;i<await topButtons.count();i++){const box=await topButtons.nth(i).boundingBox();expect(box).toBeTruthy();expect(box!.height).toBeGreaterThanOrEqual(44);}
  const categories=page.locator('.category-rail button');await expect(categories).toHaveCount(8);
  for(let i=0;i<await categories.count();i++){const box=await categories.nth(i).boundingBox();expect(box).toBeTruthy();expect(box!.height).toBeGreaterThanOrEqual(44);}
  const viewButtons=page.locator('.preview-footer .view-button');expect(await viewButtons.count()).toBeGreaterThanOrEqual(5);
  for(let i=0;i<await viewButtons.count();i++){const box=await viewButtons.nth(i).boundingBox();expect(box).toBeTruthy();expect(box!.height).toBeGreaterThanOrEqual(44);}
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
  expect(visibility?.hidden).toEqual(expect.arrayContaining(['hood','strap','strap-metal','accent']));
  const soloImage=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());expect(soloImage).not.toBe(dimmed);
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
