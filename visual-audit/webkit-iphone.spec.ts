import { test,expect } from '@playwright/test';

type Combo={label:string;base:'female'|'male';outfit:string;hood:string;shirt:string;strap:string;accent:string;hair:string;face:string;eye:string;brow:string;nose:string;mouth:string;expression:string;body:[number,number,number]};

const COMBOS:Combo[]=[
  {label:'01 Soft Casual',base:'female',outfit:'cropped-jacket',hood:'open-collar',shirt:'tee',strap:'simple',accent:'diamond',hair:'ponytail',face:'soft',eye:'bright',brow:'soft',nose:'button',mouth:'soft-smile',expression:'smile',body:[.95,.90,.90]},
  {label:'02 Street Bomber',base:'female',outfit:'bomber',hood:'wide',shirt:'hoodie-inner',strap:'asymmetric-strap',accent:'arm-band',hair:'bob',face:'round',eye:'determined',brow:'arched',nose:'diamond',mouth:'smirk',expression:'serious',body:[1,1,1]},
  {label:'03 Future Tech',base:'male',outfit:'tech-parka',hood:'high-wrap',shirt:'utility-top',strap:'tech-harness',accent:'tech-emblem',hair:'short-spike',face:'angular',eye:'determined',brow:'angled',nose:'faceted',mouth:'neutral',expression:'serious',body:[1.15,1.12,1.18]},
  {label:'04 Elegant Long Coat',base:'male',outfit:'long-coat',hood:'split-lapel',shirt:'turtleneck',strap:'shoulder-brace',accent:'panel-line',hair:'long',face:'long-oval',eye:'narrow',brow:'straight',nose:'tall',mouth:'neutral',expression:'neutral',body:[1.18,.90,.96]},
  {label:'05 Tactical',base:'female',outfit:'tactical-jacket',hood:'stand-collar',shirt:'utility-top',strap:'chest-rig',accent:'badge',hair:'braid',face:'square',eye:'sharp',brow:'bold',nose:'wide',mouth:'frown',expression:'angry',body:[1.02,1.15,1.20]},
  {label:'06 Preppy Blazer',base:'female',outfit:'blazer',hood:'open-collar',shirt:'dress-shirt',strap:'simple',accent:'belt-buckle',hair:'half-up',face:'oval',eye:'bright',brow:'arched',nose:'small',mouth:'smile',expression:'happy',body:[1.02,.88,.90]},
  {label:'07 Cozy Soft',base:'female',outfit:'hooded',hood:'folded',shirt:'sweater',strap:'single-pouch',accent:'point-strip',hair:'bun',face:'round',eye:'soft',brow:'worried',nose:'button',mouth:'soft-smile',expression:'sad',body:[.85,.92,.88]},
  {label:'08 Sport Pop',base:'female',outfit:'cropped-jacket',hood:'double-collar',shirt:'tank',strap:'belt-pack',accent:'zip-line',hair:'twin-tail',face:'pointed',eye:'sparkle',brow:'raised',nose:'tiny',mouth:'smile-open',expression:'happy',body:[.90,.85,.92]},
  {label:'09 Retro Utility',base:'male',outfit:'vest',hood:'sharp',shirt:'henley',strap:'y-harness',accent:'slash',hair:'side-tail',face:'hex',eye:'side-glance',brow:'flat',nose:'line',mouth:'smirk',expression:'serious',body:[1,1,1.05]},
  {label:'10 Max Solid Coat',base:'male',outfit:'long-coat',hood:'high',shirt:'vest-inner',strap:'layered-pouch',accent:'chevron',hair:'short-spike',face:'angular',eye:'sleepy',brow:'calm',nose:'wide',mouth:'neutral',expression:'neutral',body:[1.25,1.25,1.35]},
  {label:'11 Petite Future',base:'female',outfit:'tech-parka',hood:'fur-collar',shirt:'vest-inner',strap:'tech-harness',accent:'corner',hair:'wavy',face:'tapered',eye:'round',brow:'worried',nose:'tiny',mouth:'o',expression:'surprised',body:[.78,.80,.80]},
  {label:'12 Deliberate Clash',base:'male',outfit:'blazer',hood:'drawstring',shirt:'hoodie-inner',strap:'cross',accent:'triangle',hair:'twin-tail',face:'hex',eye:'sparkle',brow:'worried',nose:'profile',mouth:'wide-open',expression:'surprised',body:[1.05,.85,1.30]},
];

async function domClick(page:import('@playwright/test').Page,selector:string){
  const locator=page.locator(selector);await expect(locator).toHaveCount(1);await locator.evaluate((node:HTMLElement)=>node.click());
}

async function applyCombo(page:import('@playwright/test').Page,combo:Combo){
  await domClick(page,`[data-base="${combo.base}"]`);
  for(const [kind,id] of Object.entries({outfit:combo.outfit,hood:combo.hood,shirt:combo.shirt,strap:combo.strap,accent:combo.accent,hair:combo.hair,face:combo.face,eye:combo.eye,brow:combo.brow,nose:combo.nose,mouth:combo.mouth}))await domClick(page,`[data-kind="${kind}"][data-id="${id}"]`);
  for(const [prop,value] of [['height',combo.body[0]],['build',combo.body[1]],['shoulders',combo.body[2]]] as const){await page.locator(`input[data-body-prop="${prop}"]`).evaluate((node:HTMLInputElement,value)=>{node.value=String(value);node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);}
  await domClick(page,`.expression-bar [data-expression="${combo.expression}"]`);
  await page.waitForTimeout(80);
}

test('temporary 12-way character combination review sheet',async({page,browserName})=>{
  test.skip(browserName!=='webkit','WebKit-only combination review');
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:844,height:390});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  const canvas=page.locator('canvas.character-canvas');await expect(canvas).toBeVisible();
  const captures:{label:string;src:string}[]=[];
  for(const combo of COMBOS){await applyCombo(page,combo);captures.push({label:combo.label,src:await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL('image/png'))});}
  expect(errors).toEqual([]);
  await page.setViewportSize({width:1400,height:1000});
  await page.evaluate((captures)=>{
    document.body.innerHTML='';document.body.style.cssText='margin:0;background:#e8eef4;font-family:system-ui;color:#10253a';
    const title=document.createElement('h1');title.textContent='FACE EDITOR · 12 COMBINATION REVIEW';title.style.cssText='margin:16px 18px 8px;font-size:24px';document.body.append(title);
    const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:10px 18px 18px';
    for(const item of captures){const card=document.createElement('article');card.style.cssText='background:#fffaf4;border:2px solid #18374f;border-radius:12px;overflow:hidden';const label=document.createElement('div');label.textContent=item.label;label.style.cssText='padding:8px 10px;background:#0b395e;color:white;font-weight:900;font-size:13px';const img=document.createElement('img');img.src=item.src;img.style.cssText='display:block;width:100%;height:245px;object-fit:contain;background:linear-gradient(160deg,#c3e9ff,#76bdf0)';card.append(label,img);grid.append(card);}document.body.append(grid);
  },captures);
  await page.screenshot({path:'test-results/webkit-iphone-landscape.png',fullPage:true});
});
