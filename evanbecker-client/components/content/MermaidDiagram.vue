<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = defineProps<{
  code: string
  caption?: string
}>()

const container = ref<HTMLDivElement | null>(null)
const svg = ref('')
const error = ref('')

const colorMode = useColorMode()

async function render() {
  if (!props.code) return
  try {
    const mermaid = (await import('mermaid')).default
    mermaid.initialize({
      startOnLoad: false,
      theme: colorMode.value === 'dark' ? 'dark' : 'default',
      securityLevel: 'strict',
      fontFamily: 'inherit',
    })
    const id = 'mermaid-' + Math.random().toString(36).slice(2, 10)
    const { svg: rendered } = await mermaid.render(id, props.code)
    svg.value = rendered
    error.value = ''
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
    svg.value = ''
  }
}

onMounted(render)
watch(() => colorMode.value, render)
watch(() => props.code, render)
</script>

<template>
  <figure class="not-prose my-8">
    <ClientOnly>
      <div
        ref="container"
        class="overflow-x-auto rounded-lg border border-slate-300 bg-slate-50 p-6 dark:border-[#0C65E5] dark:bg-slate-800/70"
      >
        <div v-if="error" class="font-mono text-sm text-red-500">
          Mermaid render error: {{ error }}
        </div>
        <div v-else class="flex justify-center [&_svg]:max-w-full [&_svg]:h-auto" v-html="svg" />
      </div>
      <template #fallback>
        <div class="rounded-lg border border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
          Loading diagram...
        </div>
      </template>
    </ClientOnly>
    <figcaption v-if="caption" class="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
      {{ caption }}
    </figcaption>
  </figure>
</template>
