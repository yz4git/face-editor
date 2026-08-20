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

test('Motion and Cutscene are preview-first bottom sheets on iPhone landscape',async({page})=>{
  await page.setViewportSize({width:844,height:390});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  const preview=page.locator('.preview-panel'),previewBox=await preview.boundingBox();expect(previewBox).toBeTruthy();
  await page.locator('button[data-motion-open]').click();const motion=page.locator('.motion-studio');await expect(motion).toBeVisible();const motionBox=await motion.boundingBox();expect(motionBox).toBeTruthy();expect(motionBox!.y-previewBox!.y).toBeGreaterThan(previewBox!.height*.38);expect(motionBox!.height).toBeLessThan(previewBox!.height*.58);
  await page.screenshot({path:'test-results/motion-preview-first-iphone.png',fullPage:true});await motion.locator('button[data-motion-close]').click();
  await page.locator('button[data-cutscene-open]').click();const cutscene=page.locator('.cutscene-studio');await expect(cutscene).toBeVisible();const cutsceneBox=await cutscene.boundingBox();expect(cutsceneBox).toBeTruthy();expect(cutsceneBox!.y-previewBox!.y).toBeGreaterThan(previewBox!.height*.34);expect(cutsceneBox!.height).toBeLessThan(previewBox!.height*.62);
  await page.screenshot({path:'test-results/cutscene-preview-first-iphone.png',fullPage:true});
});
