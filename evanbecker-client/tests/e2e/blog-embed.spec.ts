import { test, expect } from '@playwright/test'

test.describe('Blog Ray Marcher Embed', () => {
  test('click-to-activate renders WebGL without context loss', async ({ page }) => {
    // Collect ALL console messages for debugging
    const logs: string[] = []
    page.on('console', (msg) => {
      logs.push(`[${msg.type()}] ${msg.text()}`)
    })

    // Navigate to the blog post
    await page.goto('/articles/ray-marching-with-claude', { waitUntil: 'networkidle' })
    await page.screenshot({ path: 'test-results/01-page-loaded.png' })

    // Find and click the activate button
    const activateButton = page.locator('.not-prose .cursor-pointer').first()
    await expect(activateButton).toBeVisible({ timeout: 10000 })
    await activateButton.click()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/02-after-click.png' })

    // Log what we see in console
    console.log('=== Console logs after click ===')
    logs.forEach(l => console.log(l))

    // Check what's in the DOM now
    const canvasCount = await page.locator('canvas').count()
    console.log(`Canvas elements found: ${canvasCount}`)

    const embedHTML = await page.locator('.not-prose').first().innerHTML()
    console.log(`Embed innerHTML (first 500 chars): ${embedHTML.substring(0, 500)}`)

    // Wait for canvas
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible({ timeout: 20000 })

    // Wait for shader to compile and start rendering
    await page.waitForTimeout(5000)
    await page.screenshot({ path: 'test-results/03-rendering.png' })

    // Verify no context loss
    const contextLostLogs = logs.filter(l => l.includes('context was lost'))
    console.log(`Context lost events: ${contextLostLogs.length}`)
    contextLostLogs.forEach(l => console.log(l))

    // Check FPS
    const fpsText = page.locator('text=/\\d+ FPS/').first()
    await expect(fpsText).toBeVisible({ timeout: 10000 })
    const fpsValue = await fpsText.textContent()
    const fps = parseInt(fpsValue?.replace(' FPS', '') ?? '0')
    console.log(`FPS: ${fps}`)

    // Assertions
    expect(contextLostLogs).toHaveLength(0)
    expect(fps).toBeGreaterThan(0)
  })
})
