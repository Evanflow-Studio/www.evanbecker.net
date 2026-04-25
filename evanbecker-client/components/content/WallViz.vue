<script setup lang="ts">
defineProps<{
  /** Label above the left (formal) column. Monospace caps. */
  formalLabel?: string
  /** Label above the right (qualitative) column. Monospace caps. */
  qualitativeLabel?: string
  /** Override the divider label. Defaults to "the wall". */
  dividerLabel?: string
}>()
</script>

<template>
  <div class="not-prose my-8 overflow-hidden rounded-xl border border-slate-700">
    <!-- Grid: single column on narrow viewports (the article container is
         max-w-3xl, so we switch to side-by-side at `sm` rather than `md`
         to actually get the two-column layout on normal desktop reading). -->
    <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr]">
      <!-- Formal (top on narrow, left on wide) -->
      <div class="bg-slate-900/80 p-6">
        <div v-if="formalLabel" class="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[#2D95FC]">
          {{ formalLabel }}
        </div>
        <div class="font-mono text-sm leading-relaxed text-slate-200">
          <slot name="formal" />
        </div>
      </div>

      <!-- Divider strip: horizontal bar on narrow, vertical on wide.
           Label centered via an absolute-positioned inner flexbox so it
           stays dead-center even with a 4px-wide parent. -->
      <div class="relative h-1 w-full bg-[#2D95FC]/50 sm:h-auto sm:w-1">
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            class="whitespace-nowrap rounded border border-slate-700 bg-[#0B1120] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[#2D95FC] sm:-rotate-90"
          >
            {{ dividerLabel ?? 'the wall' }}
          </span>
        </div>
      </div>

      <!-- Qualitative (bottom on narrow, right on wide) -->
      <div class="bg-slate-800/40 p-6">
        <div v-if="qualitativeLabel" class="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[#2D95FC]">
          {{ qualitativeLabel }}
        </div>
        <div class="text-sm italic leading-relaxed text-slate-300">
          <slot name="qualitative" />
        </div>
      </div>
    </div>
  </div>
</template>
