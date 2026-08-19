import { test,expect } from '@playwright/test';

test('Character Factory generates, keeps, varies and applies a quality-gated batch',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  await page.evaluate(()=>localStorage.removeItem('face-editor:factory:favorites:v1'));
  const factory=page.locator('button[data-factory-open]');await expect(factory).toBeVisible();await factory.click();
  const panel=page.locator('.factory-panel');await expect(panel).toBeVisible();await expect(panel.locator('[data-factory-style]')).toHaveCount(6);await expect(panel.locator('.factory-card')).toHaveCount(12);await expect(panel.locator('canvas.factory-thumb')).toHaveCount(12);
  const cards=panel.locator('.factory-card');await expect(cards.first()).toHaveClass(/selected/);const firstMeta=await cards.first().locator('.factory-card-meta').innerText();expect(firstMeta).toMatch(/Q\s+\d+/);
  const quality=Number(firstMeta.match(/Q\s+(\d+)/)?.[1]??0);expect(quality).toBeGreaterThanOrEqual(72);
  await panel.locator('[data-factory-action="keep"]').click();await expect(panel.locator('.factory-status')).toContainText('1 KEPT');
  await cards.nth(1).click();await expect(cards.nth(1)).toHaveClass(/selected/);await panel.locator('[data-factory-action="variations"]').click();await expect(panel.locator('.factory-status')).toContainText('VARIATION MODE');await expect(panel.locator('.factory-card')).toHaveCount(12);
  await panel.locator('[data-factory-style="futuristic"]').click();await expect(panel.locator('[data-factory-style="futuristic"]')).toHaveClass(/selected/);await expect(panel.locator('.factory-card')).toHaveCount(12);
  await page.screenshot({path:'test-results/factory-v1.png',fullPage:true});
  await panel.locator('[data-factory-action="use"]').click();await expect(panel).toBeHidden();await expect(page.locator('.part-card.selected')).toHaveCount(11);
});
