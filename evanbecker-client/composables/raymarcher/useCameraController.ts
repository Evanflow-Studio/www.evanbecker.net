import { useRayMarcherStore } from '~/stores/raymarcher'
import { ANIMATION, CAMERA_DEFAULTS, DRIFT, CELL_SPACING } from '~/utils/shaders/constants'
import type { OrbitTracking } from '~/types/raymarcher'

type Vec3 = [number, number, number]
type StoreType = ReturnType<typeof useRayMarcherStore>

export function getForward(store: StoreType): Vec3 {
  const cy = Math.cos(store.camera.yaw), sy = Math.sin(store.camera.yaw)
  const cp = Math.cos(store.camera.pitch), sp = Math.sin(store.camera.pitch)
  return [-sy * cp, sp, -cy * cp]
}

export function getRight(store: StoreType): Vec3 {
  const cy = Math.cos(store.camera.yaw), sy = Math.sin(store.camera.yaw)
  return [-cy, 0, sy]
}

export function applyMovement(store: StoreType, dir: Vec3, speed: number) {
  store.camera.posX += dir[0] * speed
  store.camera.posY += dir[1] * speed
  store.camera.posZ += dir[2] * speed
}

export function createOrbitState(): OrbitTracking {
  return { center: null, angle: 0 }
}

function getNearestCellCenter(store: StoreType): Vec3 {
  const cs = CELL_SPACING.MIN + (CELL_SPACING.MAX - CELL_SPACING.MIN) * store.lattice.cellSpacing
  return [
    Math.round(store.camera.posX / cs) * cs,
    Math.round(store.camera.posY / cs) * cs,
    Math.round(store.camera.posZ / cs) * cs,
  ]
}

export function processOrbit(store: StoreType, orbit: OrbitTracking) {
  if (!orbit.center) {
    orbit.center = getNearestCellCenter(store)
    const dx = store.camera.posX - orbit.center[0]
    const dz = store.camera.posZ - orbit.center[2]
    orbit.angle = Math.atan2(dx, dz)
  }

  orbit.angle += CAMERA_DEFAULTS.ORBIT_SPEED * 0.016
  const { ORBIT_RADIUS, ORBIT_BOB_AMPLITUDE, ORBIT_BOB_FREQUENCY } = CAMERA_DEFAULTS

  store.camera.posX = orbit.center[0] + Math.sin(orbit.angle) * ORBIT_RADIUS
  store.camera.posZ = orbit.center[2] + Math.cos(orbit.angle) * ORBIT_RADIUS
  store.camera.posY = orbit.center[1] + Math.sin(orbit.angle * ORBIT_BOB_FREQUENCY) * ORBIT_BOB_AMPLITUDE

  const dx = orbit.center[0] - store.camera.posX
  const dy = orbit.center[1] - store.camera.posY
  const dz = orbit.center[2] - store.camera.posZ
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
  store.camera.yaw = Math.atan2(-dx, -dz)
  store.camera.pitch = Math.asin(dy / dist)
}

export function updateCamera(
  store: StoreType,
  orbit: OrbitTracking,
  elapsed: number,
  now: number,
  orbitDelay: number,
) {
  if (store.lattice.animation === ANIMATION.Orbit) {
    processOrbit(store, orbit)
  } else {
    orbit.center = null
  }

  const idleMs = now - store.camera.lastInteraction
  const driftActive = store.camera.autoRotate && store.lattice.animation !== ANIMATION.Orbit
  store.gl.orbitProgress = driftActive ? Math.min(1, idleMs / orbitDelay) : 0

  if (driftActive && idleMs > orbitDelay) {
    store.camera.yaw += DRIFT.YAW_SPEED
    store.camera.pitch += Math.sin(elapsed * DRIFT.PITCH_FREQUENCY) * DRIFT.PITCH_AMPLITUDE
  }
}
