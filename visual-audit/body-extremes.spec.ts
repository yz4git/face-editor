import { test,expect } from '@playwright/test';

const BASES=['female','male'] as const;
const OUTFITS=['hooded','high-collar','zip-collar','drawstring','short-sleeve','vest'] as const;
const PRESETS={
  compact:{height:.78,build:.80,shoulders:.80},
  neutral:{height:1,build:1,shoulders:1},
  maximum:{height:1.25,build:1.25,shoulders:1.35},
} as const;

async function choose(page:any,selector:string){await page.locator(selector).evaluate((button:HTMLButtonElement)=>button.click());}
async function setBody(page:any,body:{height:number;build:number;shoulders:number}){
  for(const [prop,value] of Object.entries(body))await page.locator(`input[data-body-prop="${prop}"]`).evaluate((node:HTMLInputElement,next:number)=>{node.value=String(next);node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);
}

test('extreme body profiles visually audit every jacket silhouette for female and male bases',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  const preview=page.locator('#preview');await expect(preview).toBeVisible();

  for(const base of BASES){
    await choose(page,`button[data-base="${base}"]`);
    for(const outfit of OUTFITS){
      await choose(page,`button[data-kind="outfit"][data-id="${outfit}"]`);
      const rendered:string[]=[];
      for(const [preset,body] of Object.entries(PRESETS)){
        await setBody(page,body);
        await expect(page.locator('input[data-body-prop="height"]')).toHaveValue(String(body.height));
        const data=await page.locator('.character-canvas').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL());
        expect(data.length).toBeGreaterThan(1500);rendered.push(data);
        await preview.screenshot({path:`test-results/body-extremes/${base}-${outfit}-${preset}.png`});
      }
      expect(new Set(rendered).size).toBe(3);
    }
  }

  expect(errors).toEqual([]);
});

