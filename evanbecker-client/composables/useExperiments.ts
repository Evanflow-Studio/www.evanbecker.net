const STORAGE_KEY = 'evb:experiments'

/**
 * Opt-in experimental feature flags. Stored per-browser in localStorage and
 * only writable/visible from the authenticated account page, but consumers
 * MUST also check `isAuthenticated` before activating any flag — someone can
 * set the localStorage key by hand.
 *
 * Current flags:
 * - `rayMarcherLab`: enables the audio visualizer + multiplayer session layer
 *   on the ray marcher. Uses dynamic imports for SignalR / Meyda / Essentia /
 *   YouTube so the core bundle never pays for them when the flag is off.
 */
export interface Experiments {
  rayMarcherLab: boolean
}

const DEFAULTS: Experiments = {
  rayMarcherLab: false,
}

export const useExperiments = () => {
  const state = useState<Experiments>('experiments', () => {
    if (import.meta.client) {
      try {
        const cached = localStorage.getItem(STORAGE_KEY)
        if (cached) return { ...DEFAULTS, ...JSON.parse(cached) }
      } catch { /* corrupt cache, ignore */ }
    }
    return { ...DEFAULTS }
  })

  if (import.meta.client) {
    watch(state, (val) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
      } catch { /* storage unavailable, ignore */ }
    }, { deep: true })
  }

  return state
}
