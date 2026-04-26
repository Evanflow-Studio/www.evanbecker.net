import { test, expect } from '@playwright/test'

test.describe('WebGL context stability', () => {
  test('canvas renders without context loss for 10 seconds', async ({ page }) => {
    await page.goto('/sandbox/raymarcher', { waitUntil: 'networkidle' })

    // Wait for canvas to appear
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible({ timeout: 15000 })

    // Monitor for context loss events via console
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('context was lost')) {
        errors.push(msg.text())
      }
    })

    // Wait 10 seconds for context to stabilize
    await page.waitForTimeout(10000)

    // Verify no context loss occurred
    expect(errors).toHaveLength(0)
  })

  test('canvas has non-zero dimensions', async ({ page }) => {
    await page.goto('/sandbox/raymarcher', { waitUntil: 'networkidle' })

    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(2000)

    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(100)
    expect(box!.height).toBeGreaterThan(100)
  })

  test('FPS counter shows non-zero after 5 seconds', async ({ page }) => {
    await page.goto('/sandbox/raymarcher', { waitUntil: 'networkidle' })

    // Wait for shader compile + first frames
    await page.waitForTimeout(8000)

    // Check the HUD FPS display
    const fpsText = await page.locator('text=/\\d+ FPS/').first().textContent()
    const fpsMatch = fpsText?.match(/(\d+) FPS/)
    expect(fpsMatch).not.toBeNull()
    const fps = parseInt(fpsMatch![1])
    expect(fps).toBeGreaterThan(0)
  })
})
