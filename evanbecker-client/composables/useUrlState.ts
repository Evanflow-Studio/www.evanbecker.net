import { type Ref } from 'vue'

// Schema-driven serialization — each field has a short key and a type
type FieldType = 'int' | 'float' | 'bool'

interface FieldSchema {
  key: string
  type: FieldType
}

export interface UrlStateConfig {
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
  timeSpeed: Ref<number>
  cameraPosX: Ref<number>
  cameraPosY: Ref<number>
  cameraPosZ: Ref<number>
  cameraYaw: Ref<number>
  cameraPitch: Ref<number>
  moveSpeed: Ref<number>
  fogDensity: Ref<number>
}

const SCHEMA: Record<keyof UrlStateConfig, FieldSchema> = {
  scene:           { key: 's',  type: 'int' },
  palette:         { key: 'p',  type: 'int' },
  quality:         { key: 'q',  type: 'int' },
  geoPreset:       { key: 'g',  type: 'int' },
  animation:       { key: 'a',  type: 'int' },
  cellSpacing:     { key: 'cs', type: 'float' },
  wallThickness:   { key: 'wt', type: 'float' },
  animOffset:      { key: 'ao', type: 'float' },
  wireframe:       { key: 'w',  type: 'bool' },
  bloomStrength:   { key: 'bl', type: 'float' },
  chromaticAmount: { key: 'ca', type: 'float' },
  timeSpeed:       { key: 'ts', type: 'float' },
  cameraPosX:      { key: 'cx', type: 'float' },
  cameraPosY:      { key: 'cy', type: 'float' },
  cameraPosZ:      { key: 'cz', type: 'float' },
  cameraYaw:       { key: 'yw', type: 'float' },
  cameraPitch:     { key: 'pt', type: 'float' },
  moveSpeed:       { key: 'ms', type: 'float' },
  fogDensity:      { key: 'fd', type: 'float' },
}

const serializers: Record<FieldType, (val: unknown) => string> = {
  int: (v) => String(v),
  float: (v) => (v as number).toFixed(4),
  bool: (v) => v ? '1' : '0',
}

const deserializers: Record<FieldType, (s: string) => unknown> = {
  int: (s) => parseInt(s, 10),
  float: (s) => parseFloat(s),
  bool: (s) => s === '1',
}

function serialize(config: UrlStateConfig): string {
  return Object.entries(SCHEMA)
    .map(([prop, { key, type }]) => `${key}=${serializers[type](config[prop as keyof UrlStateConfig].value)}`)
    .join('&')
}

function deserialize(hash: string, config: UrlStateConfig): boolean {
  if (!hash || hash.length < 2) return false
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  let applied = false

  for (const [prop, { key, type }] of Object.entries(SCHEMA)) {
    const val = params.get(key)
    if (val === null) continue
    const parsed = deserializers[type](val)
    // Validate: skip NaN / undefined
    if (typeof parsed === 'number' && isNaN(parsed)) continue
    const ref = config[prop as keyof UrlStateConfig]
    ;(ref as Ref<unknown>).value = parsed
    applied = true
  }
  return applied
}

export function useUrlState(config: UrlStateConfig) {
  // Import from URL hash on load, then immediately clear it.
  // The hash acts as a one-time import — not a live sync.
  const restored = deserialize(window.location.hash, config)
  if (restored) {
    // Clear the hash so the URL stays clean after import
    window.history.replaceState(null, '', window.location.pathname)
  }

  // No watcher — URL is NOT updated live. Only updated on explicit share.
  function copyShareUrl() {
    const url = `${window.location.origin}${window.location.pathname}#${serialize(config)}`
    navigator.clipboard.writeText(url)
    return url
  }

  return { restored, copyShareUrl }
}
