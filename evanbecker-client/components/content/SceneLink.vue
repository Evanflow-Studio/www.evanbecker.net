<script setup lang="ts">
import { useRayMarcherStore } from '~/stores/raymarcher'
import { SCENE_NAMES } from '~/utils/shaders/constants'

const props = defineProps<{
  scene: number
  palette?: number
  label?: string
}>()

const store = useRayMarcherStore()
const sceneName = SCENE_NAMES[props.scene] ?? `Scene ${props.scene}`
const displayLabel = props.label ?? sceneName

function activateScene(e: Event) {
  e.preventDefault()

  // Apply scene settings to the store
  store.scene.index = props.scene
  if (props.palette !== undefined) store.scene.palette = props.palette
  store.applySceneDefaults(props.scene)

  // Find the embed on the page and scroll to it + activate it
  const embed = document.querySelector('[data-ray-march-embed]')
  if (embed) {
    embed.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Dispatch a custom event the embed listens for
    embed.dispatchEvent(new CustomEvent('scene-change', {
      detail: { scene: props.scene, palette: props.palette },
    }))
  }
}
</script>

<template>
  <a
    href="#"
    class="text-[#2D95FC] hover:text-[#5DB0FF] underline decoration-[#2D95FC]/30 hover:decoration-[#2D95FC]/60 transition-colors"
    @click="activateScene"
  >
    {{ displayLabel }}
  </a>
</template>
