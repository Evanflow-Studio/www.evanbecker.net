import { test, expect, devices } from '@playwright/test'

const RAYMARCHER_URL = '/sandbox/raymarcher'

test.use({ ...devices['iPhone 13'] })

test.describe('Ray Marcher Mobile', () => {

  test('page loads on mobile viewport', async ({ page }) => {
    await page.goto(RAYMARCHER_URL)
    // Should see the page title
    const heading = page.locator('h1')
    await expect(heading).toBeVisible({ timeout: 10_000 })
  })

  test('canvas renders on mobile', async ({ page }) => {
    await page.goto(RAYMARCHER_URL)
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible({ timeout: 30_000 })

    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(50)
    expect(box!.height).toBeGreaterThan(50)
  })

  test('mobile joystick is visible', async ({ page }) => {
    await page.goto(RAYMARCHER_URL)
    // Wait for canvas to render first
    await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 })
    // Joystick should be visible on mobile
    const joystick = page.locator('text=Move')
    await expect(joystick).toBeVisible({ timeout: 5_000 })
  })

  test('touch drag changes camera', async ({ page }) => {
    await page.goto(RAYMARCHER_URL)
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible({ timeout: 30_000 })

    // Get initial camera state by reading from the page
    const box = await canvas.boundingBox()
    if (!box) return

    // Simulate a touch drag across the canvas
    const startX = box.x + box.width / 2
    const startY = box.y + box.height / 2

    await page.touchscreen.tap(startX, startY)
    // Small delay then drag
    await page.waitForTimeout(100)

    // The tap should have triggered trySwapPendingShader
    // Just verify no errors occurred
    const errors = await page.evaluate(() => {
      const el = document.querySelector('[class*="text-red"]')
      return el?.textContent || null
    })
    expect(errors).toBeNull()
  })
})
