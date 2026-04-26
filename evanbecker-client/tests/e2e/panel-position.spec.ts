import { test, expect } from '@playwright/test'

test.describe('FloatingPanel positioning', () => {
  test('control panel is fully visible within the canvas bounds', async ({ page }) => {
    // Test on sandbox page (500px canvas)
    await page.goto('/sandbox/raymarcher', { waitUntil: 'networkidle' })

    // Wait for canvas and panel to render
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible({ timeout: 30000 })
    await page.waitForTimeout(3000) // wait for shader + panel positioning

    const panel = page.locator('.bg-black\\/70.backdrop-blur-md').first()
    await expect(panel).toBeVisible({ timeout: 5000 })

    // Get bounding boxes
    const canvasBox = await canvas.boundingBox()
    const panelBox = await panel.boundingBox()
    expect(canvasBox).not.toBeNull()
    expect(panelBox).not.toBeNull()

    // Panel bottom must be within canvas bottom
    const canvasBottom = canvasBox!.y + canvasBox!.height
    const panelBottom = panelBox!.y + panelBox!.height
    console.log(`Canvas: top=${canvasBox!.y.toFixed(0)} bottom=${canvasBottom.toFixed(0)} height=${canvasBox!.height.toFixed(0)}`)
    console.log(`Panel:  top=${panelBox!.y.toFixed(0)} bottom=${panelBottom.toFixed(0)} height=${panelBox!.height.toFixed(0)}`)

    expect(panelBottom).toBeLessThanOrEqual(canvasBottom + 5) // 5px tolerance
    expect(panelBox!.y).toBeGreaterThanOrEqual(canvasBox!.y)
  })

  test('control panel is visible in blog embed (shorter canvas)', async ({ page }) => {
    await page.goto('/articles/ray-marching-with-claude', { waitUntil: 'networkidle' })

    // Activate the embed
    const activateButton = page.locator('.not-prose .cursor-pointer').first()
    await expect(activateButton).toBeVisible({ timeout: 10000 })
    await activateButton.click()

    // Wait for canvas and panel
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible({ timeout: 20000 })
    await page.waitForTimeout(3000)

    const panel = page.locator('.bg-black\\/70.backdrop-blur-md').first()
    await expect(panel).toBeVisible({ timeout: 5000 })

    const canvasBox = await canvas.boundingBox()
    const panelBox = await panel.boundingBox()
    expect(canvasBox).not.toBeNull()
    expect(panelBox).not.toBeNull()

    // The embed container is h-[400px] — panel must fit within it
    const containerEl = page.locator('.not-prose .rounded-2xl.border').first()
    const containerBox = await containerEl.boundingBox()
    expect(containerBox).not.toBeNull()

    const containerBottom = containerBox!.y + containerBox!.height
    const panelBottom = panelBox!.y + panelBox!.height

    console.log(`Container: top=${containerBox!.y.toFixed(0)} bottom=${containerBottom.toFixed(0)} height=${containerBox!.height.toFixed(0)}`)
    console.log(`Canvas:    top=${canvasBox!.y.toFixed(0)} height=${canvasBox!.height.toFixed(0)}`)
    console.log(`Panel:     top=${panelBox!.y.toFixed(0)} bottom=${panelBottom.toFixed(0)} height=${panelBox!.height.toFixed(0)}`)

    // Panel must be within the visible container
    expect(panelBottom).toBeLessThanOrEqual(containerBottom + 5)
    expect(panelBox!.y).toBeGreaterThanOrEqual(containerBox!.y)
  })
})
