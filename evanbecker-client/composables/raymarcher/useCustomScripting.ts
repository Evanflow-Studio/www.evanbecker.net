import { useRayMarcherStore } from '~/stores/raymarcher'

interface ScriptCache {
  fn: ((ctx: Record<string, number>) => void) | null
  lastSource: string
}

/**
 * Evaluates custom JavaScript expressions that can modify store values.
 * The script runs in a sandboxed context with access to time, audio bands,
 * and writable store properties.
 */
export function createScriptCache(): ScriptCache {
  return { fn: null, lastSource: '' }
}

export function evalCustomJs(cache: ScriptCache, elapsed: number) {
  const store = useRayMarcherStore()
  const src = store.scripting.customJs.trim()
  if (!src) { cache.fn = null; return }

  // Recompile only when source changes
  if (src !== cache.lastSource) {
    cache.lastSource = src
    try {
      cache.fn = new Function('ctx', `with(ctx) { ${src} }`) as (ctx: Record<string, number>) => void
    } catch {
      cache.fn = null
    }
  }

  if (!cache.fn) return

  const ctx: Record<string, number> = {
    time: elapsed,
    spacing: store.lattice.cellSpacing,
    thickness: store.lattice.wallThickness,
    animOffset: store.lattice.animOffset,
    bloom: store.render.bloomStrength,
    chroma: store.render.chromaticAmount,
  }

  try {
    cache.fn(ctx)
    store.lattice.cellSpacing = ctx.spacing
    store.lattice.wallThickness = ctx.thickness
    store.lattice.animOffset = ctx.animOffset
    store.render.bloomStrength = ctx.bloom
    store.render.chromaticAmount = ctx.chroma
  } catch { /* ignore runtime errors */ }
}
