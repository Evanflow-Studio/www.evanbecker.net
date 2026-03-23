import { watch, type Ref } from 'vue'

const DEBOUNCE_MS = 500

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
  colorReact: Ref<number>
  timeSpeed: Ref<number>
  cameraPosX: Ref<number>
  cameraPosY: Ref<number>
  cameraPosZ: Ref<number>
  cameraYaw: Ref<number>
  cameraPitch: Ref<number>
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
  colorReact:      { key: 'cr', type: 'float' },
  timeSpeed:       { key: 'ts', type: 'float' },
  cameraPosX:      { key: 'cx', type: 'float' },
  cameraPosY:      { key: 'cy', type: 'float' },
  cameraPosZ:      { key: 'cz', type: 'float' },
  cameraYaw:       { key: 'yw', type: 'float' },
  cameraPitch:     { key: 'pt', type: 'float' },
}

const serializers: Record<FieldType, (val: unknown) => string> = {
  int: (v) => String(v),
  float: (v) => (v as number).toFixed(2),
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
    const ref = config[prop as keyof UrlStateConfig]
    ;(ref as Ref<unknown>).value = deserializers[type](val)
    applied = true
  }
  return applied
}

export function useUrlState(config: UrlStateConfig) {
  const restored = deserialize(window.location.hash, config)

  let updateTimeout: ReturnType<typeof setTimeout> | null = null
  function scheduleUpdate() {
    if (updateTimeout) clearTimeout(updateTimeout)
    updateTimeout = setTimeout(() => {
      window.history.replaceState(null, '', `#${serialize(config)}`)
    }, DEBOUNCE_MS)
  }

  const refs = Object.keys(SCHEMA).map(prop => config[prop as keyof UrlStateConfig])
  watch(refs, scheduleUpdate)

  function copyShareUrl() {
    const url = `${window.location.origin}${window.location.pathname}#${serialize(config)}`
    navigator.clipboard.writeText(url)
    return url
  }

  return { restored, copyShareUrl }
}
