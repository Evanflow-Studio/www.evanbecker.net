import { watch, type Ref } from 'vue'

interface UrlStateConfig {
  scene: Ref<number>
  palette: Ref<number>
  quality: Ref<number>
  geoPreset: Ref<number>
  animation: Ref<number>
  cellSpacing: Ref<number>
  wallThickness: Ref<number>
  animOffset: Ref<number>
  wireframe: Ref<boolean>
  bloomStrength: Ref<number>
  chromaticAmount: Ref<number>
  colorReact: Ref<number>
  timeSpeed: Ref<number>
  cameraPosX: Ref<number>
  cameraPosY: Ref<number>
  cameraPosZ: Ref<number>
  cameraYaw: Ref<number>
  cameraPitch: Ref<number>
}

const KEY_MAP: Record<string, keyof UrlStateConfig> = {
  s: 'scene',
  p: 'palette',
  q: 'quality',
  g: 'geoPreset',
  a: 'animation',
  cs: 'cellSpacing',
  wt: 'wallThickness',
  ao: 'animOffset',
  w: 'wireframe',
  bl: 'bloomStrength',
  ca: 'chromaticAmount',
  cr: 'colorReact',
  ts: 'timeSpeed',
  cx: 'cameraPosX',
  cy: 'cameraPosY',
  cz: 'cameraPosZ',
  yw: 'cameraYaw',
  pt: 'cameraPitch',
}

const BOOLEANS = new Set(['wireframe'])
const FLOATS = new Set(['cellSpacing', 'wallThickness', 'animOffset', 'bloomStrength', 'chromaticAmount', 'colorReact', 'timeSpeed', 'cameraPosX', 'cameraPosY', 'cameraPosZ', 'cameraYaw', 'cameraPitch'])

function serialize(config: UrlStateConfig): string {
  const parts: string[] = []
  for (const [key, prop] of Object.entries(KEY_MAP)) {
    const ref = config[prop]
    const val = ref.value
    if (BOOLEANS.has(prop)) {
      parts.push(`${key}=${val ? 1 : 0}`)
    } else if (FLOATS.has(prop)) {
      parts.push(`${key}=${(val as number).toFixed(2)}`)
    } else {
      parts.push(`${key}=${val}`)
    }
  }
  return parts.join('&')
}

function deserialize(hash: string, config: UrlStateConfig) {
  if (!hash || hash.length < 2) return false
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  let applied = false

  for (const [key, prop] of Object.entries(KEY_MAP)) {
    const val = params.get(key)
    if (val === null) continue
    const ref = config[prop]
    if (BOOLEANS.has(prop)) {
      ;(ref as Ref<boolean>).value = val === '1'
    } else if (FLOATS.has(prop)) {
      ;(ref as Ref<number>).value = parseFloat(val)
    } else {
      ;(ref as Ref<number>).value = parseInt(val, 10)
    }
    applied = true
  }
  return applied
}

export function useUrlState(config: UrlStateConfig) {
  // Restore from URL on init
  const restored = deserialize(window.location.hash, config)

  // Watch all refs and update hash (debounced)
  let updateTimeout: ReturnType<typeof setTimeout> | null = null

  function scheduleUpdate() {
    if (updateTimeout) clearTimeout(updateTimeout)
    updateTimeout = setTimeout(() => {
      const hash = serialize(config)
      window.history.replaceState(null, '', `#${hash}`)
    }, 500) // debounce 500ms
  }

  const refs = Object.values(KEY_MAP).map(prop => config[prop])
  watch(refs, scheduleUpdate)

  function copyShareUrl() {
    const hash = serialize(config)
    const url = `${window.location.origin}${window.location.pathname}#${hash}`
    navigator.clipboard.writeText(url)
    return url
  }

  return { restored, copyShareUrl }
}
