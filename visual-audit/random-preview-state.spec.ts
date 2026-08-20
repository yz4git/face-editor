import { test,expect } from '@playwright/test';

type PreviewVisibility={hidden?:string[];dimmed?:string[]};
type AuditWindow=Window&{
  __FACE_EDITOR_PREVIEW_FOCUS__?:string;
  __FACE_EDITOR_ACTIVE_CATEGORY__?:string;
  __FACE_EDITOR_OUTLINE_INSPECT__?:boolean;
  __FACE_EDITOR_PREVIEW_VISIBILITY__?:PreviewVisibility;
};

const readState=(page:Parameters<typeof test>[0]['page'])=>page.evaluate(()=>{
  const w=window as AuditWindow;
  return{
    focus:w.__FACE_EDITOR_PREVIEW_FOCUS__,
    category:w.__FACE_EDITOR_ACTIVE_CATEGORY__,
    outline:w.__FACE_EDITOR_OUTLINE_INSPECT__,
    hidden:w.__FACE_EDITOR_PREVIEW_VISIBILITY__?.hidden??[],
    dimmed:w.__FACE_EDITOR_PREVIEW_VISIBILITY__?.dimmed??[],
  };
});

test('repeated RANDOMIZE never carries transparent fringe inspection into the new character',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  const randomize=page.locator('button[data-action="randomize"]');
  const outline=page.locator('.category-rail button[data-focus="outline"]');

  await outline.click();
  let state=await readState(page);
  expect(state.outline).toBe(true);
  expect(state.dimmed).toEqual(expect.arrayContaining(['hair-front','hair-back']));

  for(let index=0;index<24;index++)await randomize.click();
  state=await readState(page);
  expect(state.category).toBe('hair');
  expect(state.outline).toBe(false);
  expect(state.focus).toBe('all');
  expect(state.hidden).toEqual([]);
  expect(state.dimmed).toEqual([]);
  await expect(page.locator('.category-rail button[data-focus="hair"]')).toHaveClass(/active/);

  const dim=page.locator('button[data-preview-focus="dim"]');
  await dim.click();
  state=await readState(page);expect(state.focus).toBe('dim');expect(state.dimmed.length).toBeGreaterThan(0);
  for(let index=0;index<12;index++)await randomize.click();
  state=await readState(page);
  expect(state.focus).toBe('all');expect(state.hidden).toEqual([]);expect(state.dimmed).toEqual([]);
  await expect(dim).not.toHaveClass(/selected/);

  await page.screenshot({path:'test-results/randomize-preview-state-portrait.png',fullPage:true});
});

test('LOAD and Factory character replacement also clear transient preview opacity',async({page})=>{
  await page.setViewportSize({width:844,height:390});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  const outline=page.locator('.category-rail button[data-focus="outline"]');

  await page.locator('button[data-action="save-slot"]').click();
  await outline.click();
  let state=await readState(page);expect(state.dimmed).toContain('hair-front');
  await page.locator('button[data-action="load-slot"]').click();
  state=await readState(page);
  expect(state.category).toBe('hair');expect(state.outline).toBe(false);expect(state.hidden).toEqual([]);expect(state.dimmed).toEqual([]);

  await outline.click();
  await page.locator('button[data-factory-open]').click();
  await expect(page.locator('.factory-card')).toHaveCount(12);
  await page.locator('button[data-factory-action="use"]').click();
  await expect(page.locator('.factory-panel')).toBeHidden();
  state=await readState(page);
  expect(state.category).toBe('hair');expect(state.outline).toBe(false);expect(state.focus).toBe('all');expect(state.hidden).toEqual([]);expect(state.dimmed).toEqual([]);
});
