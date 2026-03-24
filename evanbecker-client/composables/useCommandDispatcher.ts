import { ref, type Ref } from 'vue'
import type { PlacedObject } from '~/composables/useRayMarchGL'
import type { AudioSource } from '~/composables/useAudioReactive'
import { LATTICE_PRESETS } from '~/utils/shaders/lattice-presets'

// === Command Types ===

export type RayMarchCommand =
  // Scene
  | { type: 'setScene'; value: number }
  | { type: 'setPalette'; value: number }
  | { type: 'setQuality'; value: number }
  | { type: 'setIterations'; value: number }
  | { type: 'setGeoPreset'; value: number }
  | { type: 'setAnimation'; value: number }
  | { type: 'setLatticePreset'; value: number }
  | { type: 'setCellSpacing'; value: number }
  | { type: 'setWallThickness'; value: number }
  | { type: 'setAnimOffset'; value: number }
  | { type: 'setWireframe'; value: boolean }
  // FX
  | { type: 'setBloomStrength'; value: number }
  | { type: 'setChromaticAmount'; value: number }
  | { type: 'setVignetteStrength'; value: number }
  | { type: 'setFogDensity'; value: number }
  | { type: 'setColorReact'; value: number }
  // Audio
  | { type: 'setAudioSource'; value: AudioSource }
  | { type: 'setAudioFile'; file: File }
  // Camera
  | { type: 'setAutoRotate'; value: boolean }
  | { type: 'setMoveSpeed'; value: number }
  // Time
  | { type: 'setTimePaused'; value: boolean }
  | { type: 'setTimeSpeed'; value: number }
  // Placement
  | { type: 'setPlaceMode'; value: boolean }
  | { type: 'setPlaceShape'; value: number }
  | { type: 'placeObject' }
  | { type: 'clearPlaced' }
  | { type: 'undoPlaced' }
  // Tools
  | { type: 'screenshot' }
  | { type: 'copyUrl' }
  | { type: 'toggleFullscreen' }
  // Scripting
  | { type: 'setCustomGlsl'; value: string }
  | { type: 'setCustomJs'; value: string }
  | { type: 'applyGlsl' }
  // Custom palette
  | { type: 'setCustomPaletteA'; value: [number, number, number] }
  | { type: 'setCustomPaletteB'; value: [number, number, number] }
  | { type: 'setCustomPaletteC'; value: [number, number, number] }
  | { type: 'setCustomPaletteD'; value: [number, number, number] }

export interface TimestampedCommand {
  timestamp: number
  command: RayMarchCommand
}

// === Dispatcher Options ===

export interface DispatcherRefs {
  scene: Ref<number>
  palette: Ref<number>
  quality: Ref<number>
  iterations: Ref<number>
  geoPreset: Ref<number>
  animation: Ref<number>
  latticePreset: Ref<number>
  cellSpacing: Ref<number>
  wallThickness: Ref<number>
  animOffset: Ref<number>
  wireframe: Ref<boolean>
  bloomStrength: Ref<number>
  chromaticAmount: Ref<number>
  vignetteStrength: Ref<number>
  fogDensity: Ref<number>
  colorReact: Ref<number>
  autoRotate: Ref<boolean>
  moveSpeed: Ref<number>
  timePaused: Ref<boolean>
  timeSpeed: Ref<number>
  placeMode: Ref<boolean>
  placeShape: Ref<number>
  customGlsl: Ref<string>
  customJs: Ref<string>
  paletteA: Ref<[number, number, number]>
  paletteB: Ref<[number, number, number]>
  paletteC: Ref<[number, number, number]>
  paletteD: Ref<[number, number, number]>
  lastInteraction: Ref<number>
}

export interface DispatcherActions {
  placeObjectAhead: () => void
  clearPlacedObjects: () => void
  undoLastPlacement: () => void
  captureScreenshot: () => void
  copyShareUrl: () => string
  toggleFullscreen: () => void
  applyCustomGlsl: () => void
  handleAudioSource: (source: string) => void
  handleAudioFile: (file: File) => void
  applyLatticePreset: (index: number) => void
}

// Commands that should NOT update lastInteraction (passive/display-only)
const PASSIVE_COMMANDS = new Set<RayMarchCommand['type']>([
  'screenshot', 'copyUrl', 'setCustomGlsl', 'setCustomJs',
  'setTimePaused', 'setTimeSpeed', 'setAudioSource', 'setAudioFile',
])

export function useCommandDispatcher(refs: DispatcherRefs, actions: DispatcherActions) {
  const commandHistory = ref<TimestampedCommand[]>([])
  let recording = false

  // Strategy map: command type → handler
  const handlers: Record<string, (cmd: any) => void> = {
    setScene:            (c) => { refs.scene.value = c.value },
    setPalette:          (c) => { refs.palette.value = c.value },
    setQuality:          (c) => { refs.quality.value = c.value },
    setIterations:       (c) => { refs.iterations.value = c.value },
    setGeoPreset:        (c) => { refs.geoPreset.value = c.value },
    setAnimation:        (c) => { refs.animation.value = c.value },
    setLatticePreset:    (c) => { refs.latticePreset.value = c.value; actions.applyLatticePreset(c.value) },
    setCellSpacing:      (c) => { refs.cellSpacing.value = c.value },
    setWallThickness:    (c) => { refs.wallThickness.value = c.value },
    setAnimOffset:       (c) => { refs.animOffset.value = c.value },
    setWireframe:        (c) => { refs.wireframe.value = c.value },
    setBloomStrength:    (c) => { refs.bloomStrength.value = c.value },
    setChromaticAmount:  (c) => { refs.chromaticAmount.value = c.value },
    setVignetteStrength: (c) => { refs.vignetteStrength.value = c.value },
    setFogDensity:       (c) => { refs.fogDensity.value = c.value },
    setColorReact:       (c) => { refs.colorReact.value = c.value },
    setAutoRotate:       (c) => { refs.autoRotate.value = c.value },
    setMoveSpeed:        (c) => { refs.moveSpeed.value = c.value },
    setTimePaused:       (c) => { refs.timePaused.value = c.value },
    setTimeSpeed:        (c) => { refs.timeSpeed.value = c.value },
    setPlaceMode:        (c) => { refs.placeMode.value = c.value },
    setPlaceShape:       (c) => { refs.placeShape.value = c.value },
    setCustomGlsl:       (c) => { refs.customGlsl.value = c.value },
    setCustomJs:         (c) => { refs.customJs.value = c.value },
    setCustomPaletteA:   (c) => { refs.paletteA.value = c.value },
    setCustomPaletteB:   (c) => { refs.paletteB.value = c.value },
    setCustomPaletteC:   (c) => { refs.paletteC.value = c.value },
    setCustomPaletteD:   (c) => { refs.paletteD.value = c.value },
    setAudioSource:      (c) => { actions.handleAudioSource(c.value) },
    setAudioFile:        (c) => { actions.handleAudioFile(c.file) },
    placeObject:         ()  => { actions.placeObjectAhead() },
    clearPlaced:         ()  => { actions.clearPlacedObjects() },
    undoPlaced:          ()  => { actions.undoLastPlacement() },
    screenshot:          ()  => { actions.captureScreenshot() },
    copyUrl:             ()  => { actions.copyShareUrl() },
    toggleFullscreen:    ()  => { actions.toggleFullscreen() },
    applyGlsl:           ()  => { actions.applyCustomGlsl() },
  }

  function dispatch(cmd: RayMarchCommand) {
    const handler = handlers[cmd.type]
    if (!handler) return

    handler(cmd)

    if (!PASSIVE_COMMANDS.has(cmd.type)) {
      refs.lastInteraction.value = performance.now()
    }

    if (recording) {
      commandHistory.value.push({ timestamp: performance.now(), command: cmd })
    }
  }

  function startRecording() {
    recording = true
    commandHistory.value = []
  }

  function stopRecording(): TimestampedCommand[] {
    recording = false
    return [...commandHistory.value]
  }

  function playback(history: TimestampedCommand[]) {
    if (history.length === 0) return
    const startTime = performance.now()
    const baseTimestamp = history[0].timestamp

    for (const entry of history) {
      const delay = entry.timestamp - baseTimestamp
      setTimeout(() => dispatch(entry.command), delay)
    }
  }

  return { dispatch, commandHistory, startRecording, stopRecording, playback }
}
