import { test, expect } from '@playwright/test'

test.describe('Fractal Descent scene', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to raymarcher, then switch to Fractal Descent via the store
    await page.goto('/sandbox/raymarcher', { waitUntil: 'networkidle' })
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible({ timeout: 30000 })
    // Wait for shader compile
    await page.waitForTimeout(4000)
    // Switch to Fractal Descent (scene index 3)
    await page.evaluate(() => {
      const store = (window as any).__pinia?.state?.value?.raymarcher
      if (store) store.scene.index = 3
    })
    // Let scene switch render a few frames
    await page.waitForTimeout(3000)
  })

  test('zoom cycle loops seamlessly — visual consistency at boundaries', async ({ page }) => {
    // The fractal zoom cycle is: zoom = pow(3.0, fract(time * 0.04))
    // At the loop boundary (phase → 0), the scene should look the same as at the start.
    //
    // Strategy: capture a screenshot at a known phase, wait one full cycle,
    // capture again. The images should be visually similar (not identical due to
    // color cycling, but structurally the same).
    //
    // We can't perfectly control shader time, but we CAN detect if the scene
    // jerks by sampling pixel colors at multiple points and checking for sudden
    // large changes frame-to-frame.

    const canvas = page.locator('canvas').first()

    // Sample center pixel color over time — detect sudden jumps
    const samples: number[][] = []
    for (let i = 0; i < 30; i++) {
      const color = await page.evaluate(() => {
        const c = document.querySelector('canvas')
        if (!c) return [0, 0, 0, 0]
        const gl = c.getContext('webgl2')
        if (!gl) return [0, 0, 0, 0]
        const pixel = new Uint8Array(4)
        gl.readPixels(
          Math.floor(c.width / 2), Math.floor(c.height / 2),
          1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel
        )
        return Array.from(pixel)
      })
      samples.push(color)
      await page.waitForTimeout(200) // sample every 200ms over 6 seconds
    }

    // Check for sudden large color jumps (> 100 in any channel between consecutive samples)
    // This indicates a visual jerk / non-smooth transition
    let maxJump = 0
    for (let i = 1; i < samples.length; i++) {
      const jump = Math.max(
        Math.abs(samples[i][0] - samples[i - 1][0]),
        Math.abs(samples[i][1] - samples[i - 1][1]),
        Math.abs(samples[i][2] - samples[i - 1][2]),
      )
      if (jump > maxJump) maxJump = jump
    }

    console.log(`Max color jump between consecutive frames: ${maxJump}`)
    console.log(`Samples: ${samples.map(s => `[${s.join(',')}]`).join(' ')}`)

    // A smooth loop should have no single-frame color jumps > 80
    // (gradual changes are fine, sudden 0→255 flips indicate a jerk)
    expect(maxJump).toBeLessThan(80)
  })

  test('no geometry collision — sponges maintain separation', async ({ page }) => {
    // If sponges collide, the SDF produces incorrect distances near cell boundaries,
    // which causes visual artifacts: flickering, z-fighting, or solid walls where
    // there should be gaps.
    //
    // Strategy: sample pixels along the edges of the viewport. If all edge pixels
    // are the same solid color (the sponge filling the entire view), then the
    // gap between sponges has disappeared — indicating collision.
    //
    // In a healthy state, edge pixels should show a mix of sponge and gap.

    // Sample 20 points along the left and right edges
    const edgeSamples = await page.evaluate(() => {
      const c = document.querySelector('canvas')
      if (!c) return { leftUnique: 0, rightUnique: 0 }
      const gl = c.getContext('webgl2')
      if (!gl) return { leftUnique: 0, rightUnique: 0 }

      const leftColors = new Set<string>()
      const rightColors = new Set<string>()
      const pixel = new Uint8Array(4)

      for (let i = 0; i < 20; i++) {
        const y = Math.floor((c.height / 20) * i)

        // Left edge
        gl.readPixels(5, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
        leftColors.add(`${pixel[0]},${pixel[1]},${pixel[2]}`)

        // Right edge
        gl.readPixels(c.width - 5, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
        rightColors.add(`${pixel[0]},${pixel[1]},${pixel[2]}`)
      }

      return {
        leftUnique: leftColors.size,
        rightUnique: rightColors.size,
      }
    })

    console.log(`Left edge unique colors: ${edgeSamples.leftUnique}`)
    console.log(`Right edge unique colors: ${edgeSamples.rightUnique}`)

    // If sponges collide, edge pixels become uniform (1-2 colors = solid wall)
    // Healthy state: varied colors from sponge detail + gaps (> 3 unique colors)
    expect(edgeSamples.leftUnique).toBeGreaterThan(2)
    expect(edgeSamples.rightUnique).toBeGreaterThan(2)
  })
})
