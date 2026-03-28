import { useRayMarcherStore } from '~/stores/raymarcher'
import { ANIMATION } from '~/utils/shaders/constants'
import type { InputTracking } from '~/types/raymarcher'
import { getForward, getRight, applyMovement } from './useCameraController'

const MAX_PITCH = 1.484 // ~85°
const SPRINT_MULTIPLIER = 2.5
const MOVEMENT_KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'])

export function createInputState(): InputTracking {
  return {
    isDragging: false,
    lastMouse: { x: 0, y: 0 },
    keysDown: new Set(),
    lastPinchDist: 0,
  }
}

function clampPitch(value: number): number {
  return Math.max(-MAX_PITCH, Math.min(MAX_PITCH, value))
}

function touchDistance(e: TouchEvent): number {
  const dx = e.touches[1].clientX - e.touches[0].clientX
  const dy = e.touches[1].clientY - e.touches[0].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

// Strategy map: key → camera action
const KEY_ACTIONS: Record<string, (store: ReturnType<typeof useRayMarcherStore>, speed: number) => void> = {
  w: (s, sp) => applyMovement(s, getForward(s), sp),
  arrowup: (s, sp) => applyMovement(s, getForward(s), sp),
  s: (s, sp) => applyMovement(s, getForward(s), -sp),
  arrowdown: (s, sp) => applyMovement(s, getForward(s), -sp),
  a: (s, sp) => { const r = getRight(s); s.camera.posX += r[0] * sp; s.camera.posZ += r[2] * sp },
  arrowleft: (s, sp) => { const r = getRight(s); s.camera.posX += r[0] * sp; s.camera.posZ += r[2] * sp },
  d: (s, sp) => { const r = getRight(s); s.camera.posX -= r[0] * sp; s.camera.posZ -= r[2] * sp },
  arrowright: (s, sp) => { const r = getRight(s); s.camera.posX -= r[0] * sp; s.camera.posZ -= r[2] * sp },
  q: (_, sp) => { const store = useRayMarcherStore(); store.camera.posY -= sp },
  e: (_, sp) => { const store = useRayMarcherStore(); store.camera.posY += sp },
}

export function processKeys(input: InputTracking) {
  const store = useRayMarcherStore()
  if (store.lattice.animation === ANIMATION.Orbit || input.keysDown.size === 0) return

  const speed = input.keysDown.has('shift')
    ? store.camera.moveSpeed * SPRINT_MULTIPLIER
    : store.camera.moveSpeed

  for (const key of input.keysDown) {
    KEY_ACTIONS[key]?.(store, speed)
  }
  store.recordInteraction()
}

export function createMouseHandlers(input: InputTracking, lookSpeed: number) {
  const store = useRayMarcherStore()

  function onMouseDown(e: MouseEvent) {
    input.isDragging = true
    input.lastMouse = { x: e.clientX, y: e.clientY }
    store.recordInteraction()
  }

  function onMouseMove(e: MouseEvent) {
    if (!input.isDragging || store.lattice.animation === ANIMATION.Orbit) return
    store.camera.yaw += (e.clientX - input.lastMouse.x) * lookSpeed
    store.camera.pitch = clampPitch(store.camera.pitch - (e.clientY - input.lastMouse.y) * lookSpeed)
    input.lastMouse = { x: e.clientX, y: e.clientY }
    store.recordInteraction()
  }

  function onMouseUp() { input.isDragging = false }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    if (e.shiftKey) {
      const fw = getForward(store)
      applyMovement(store, fw, -e.deltaY * 0.02)
    } else {
      store.render.zoom = Math.max(0.5, Math.min(10, store.render.zoom + e.deltaY * -0.002))
    }
    store.recordInteraction()
  }

  return { onMouseDown, onMouseMove, onMouseUp, onWheel }
}

export function createTouchHandlers(input: InputTracking, lookSpeed: number) {
  const store = useRayMarcherStore()

  function onTouchStart(e: TouchEvent) {
    store.recordInteraction()
    if (e.touches.length === 1) {
      input.isDragging = true
      input.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    } else if (e.touches.length === 2) {
      input.lastPinchDist = touchDistance(e)
    }
  }

  function onTouchMove(e: TouchEvent) {
    if (e.touches.length === 1 && input.isDragging) {
      const dx = e.touches[0].clientX - input.lastMouse.x
      const dy = e.touches[0].clientY - input.lastMouse.y
      store.camera.yaw += dx * lookSpeed
      store.camera.pitch = clampPitch(store.camera.pitch - dy * lookSpeed)
      input.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      store.recordInteraction()
    } else if (e.touches.length === 2) {
      const dist = touchDistance(e)
      if (input.lastPinchDist > 0) {
        const delta = dist - input.lastPinchDist
        store.render.zoom = Math.max(0.5, Math.min(10, store.render.zoom + delta * 0.01))
      }
      input.lastPinchDist = dist
      store.recordInteraction()
    }
  }

  function onTouchEnd() { input.isDragging = false }

  return { onTouchStart, onTouchMove, onTouchEnd }
}

export function createKeyHandlers(
  input: InputTracking,
  actions: { captureScreenshot: () => void },
) {
  const store = useRayMarcherStore()

  function isTypingInInput(): boolean {
    const tag = document.activeElement?.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  }

  function onKeyDown(e: KeyboardEvent) {
    if (isTypingInInput()) return
    const key = e.key.toLowerCase()
    if (MOVEMENT_KEYS.has(key)) {
      e.preventDefault()
      input.keysDown.add(key)
      store.recordInteraction()
    }
    if (key === ' ') { e.preventDefault(); store.time.paused = !store.time.paused }
    if (key === 'p') { e.preventDefault(); actions.captureScreenshot() }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (isTypingInInput()) return
    input.keysDown.delete(e.key.toLowerCase())
  }

  return { onKeyDown, onKeyUp }
}
