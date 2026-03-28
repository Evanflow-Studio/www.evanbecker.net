<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

export interface TimelineEntry {
  id: string
  year: string
  label: string
  role: string
  color: string
  description: string
}

const entries: TimelineEntry[] = [
  {
    id: 'nvisia', year: '2019–Present', label: 'nvisia', role: 'Senior Technical Architect',
    color: '#0C65E5',
    description: 'Enterprise architecture consulting across energy, manufacturing, consumer products, and chemicals. From NERC CIP compliance at Alliant Energy to AI-powered ERP queries at Hydrite — designing systems where the -ilities actually matter.',
  },
  {
    id: 'mitutoyo', year: '2018–2019', label: 'Mitutoyo-RDA', role: 'Software Engineer',
    color: '#EA580C',
    description: 'Developed 3D metrology software for coordinate-measuring machines used in aerospace manufacturing. Built the scene framework, renderer, and collision detection in HOOPS Visualize — where imprecision isn\'t an option.',
  },
  {
    id: 'stack41', year: '2018', label: 'Stack41 / Caravela IoT', role: 'Software Engineer',
    color: '#1E3A5F',
    description: 'Built a DCaaS dashboard with live VM control via noVNC at a startup later acquired by Potawatomi\'s Data Holdings. IoT sensor networks, circuit prototyping, and bare-metal Proxmox.',
  },
  {
    id: 'uwm', year: '2016–2018', label: 'UW-Milwaukee', role: 'Undergraduate Researcher',
    color: '#F59E0B',
    description: 'Co-researched an audio-first language tool for visually impaired learners with Professor Jacques du Plessis. Six consecutive SURF grants. The best interfaces disappear — they just work.',
  },
  {
    id: 'procast', year: '2014–2016', label: 'PRO-CAST, INC', role: 'CAD & Web Developer',
    color: '#64748B',
    description: 'Modeled 150+ cast products in Autodesk and built two e-commerce sites from scratch, bridging physical manufacturing with digital presence.',
  },
  {
    id: 'hs', year: '2013', label: 'First Projects', role: 'High School',
    color: '#475569',
    description: 'Flappy Bird clone, guitar amplifier chassis for Limelight Amplification, volunteer dog rescue website — learning that software could touch the physical world.',
  },
]

const activeId = ref(entries[0].id)
const timelineRef = ref<HTMLElement | null>(null)

// Scroll-sync: watch which section is in view
let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(
    (intersections) => {
      for (const entry of intersections) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
          const id = (entry.target as HTMLElement).dataset.sectionId
          if (id) activeId.value = id
        }
      }
    },
    { threshold: [0.3, 0.6], rootMargin: '-20% 0px -40% 0px' }
  )

  document.querySelectorAll('[data-section-id]').forEach((el) => {
    observer!.observe(el)
  })
})

onUnmounted(() => {
  observer?.disconnect()
})

function scrollToSection(id: string) {
  activeId.value = id
  const el = document.querySelector(`[data-section-id="${id}"]`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// Progress: how far down the timeline
const progressIndex = computed(() => entries.findIndex((e) => e.id === activeId.value))

defineExpose({ entries })
</script>

<template>
  <nav ref="timelineRef" class="relative" aria-label="Career timeline">
    <!-- Spine line -->
    <div class="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-slate-700/0 via-slate-700/50 to-slate-700/0" />

    <!-- Progress fill -->
    <div
      class="absolute left-3 top-0 w-px bg-gradient-to-b from-blue-500/80 to-blue-500/20 transition-all duration-500 ease-out"
      :style="{ height: `${((progressIndex + 1) / entries.length) * 100}%` }"
    />

    <!-- Nodes -->
    <div class="relative space-y-1">
      <button
        v-for="(entry, i) in entries"
        :key="entry.id"
        class="group relative flex w-full items-start gap-4 rounded-lg px-1 py-3 text-left transition-all duration-300"
        :class="activeId === entry.id ? 'bg-white/5' : 'hover:bg-white/[0.02]'"
        @click="scrollToSection(entry.id)"
      >
        <!-- Dot -->
        <div class="relative z-10 mt-0.5 flex-none">
          <!-- Glow ring -->
          <div
            class="absolute -inset-1.5 rounded-full transition-all duration-500"
            :class="activeId === entry.id ? 'opacity-100' : 'opacity-0'"
            :style="{ boxShadow: `0 0 12px 2px ${entry.color}40` }"
          />
          <!-- Outer ring -->
          <div
            class="relative h-6 w-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center"
            :class="activeId === entry.id
              ? 'border-transparent scale-110'
              : i <= progressIndex
                ? 'border-slate-600 scale-100'
                : 'border-slate-700/50 scale-90'"
            :style="activeId === entry.id ? { borderColor: entry.color, backgroundColor: entry.color + '20' } : {}"
          >
            <!-- Inner dot -->
            <div
              class="h-2 w-2 rounded-full transition-all duration-300"
              :class="activeId === entry.id ? '' : i <= progressIndex ? 'bg-slate-500' : 'bg-slate-700'"
              :style="activeId === entry.id ? { backgroundColor: entry.color } : {}"
            />
          </div>
        </div>

        <!-- Text -->
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline justify-between gap-2">
            <span
              class="text-sm font-semibold transition-colors duration-300 truncate"
              :class="activeId === entry.id ? 'text-slate-100' : 'text-slate-400 group-hover:text-slate-300'"
            >
              {{ entry.label }}
            </span>
            <span class="flex-none text-xs tabular-nums text-slate-600">{{ entry.year }}</span>
          </div>
          <span
            class="text-xs transition-all duration-300"
            :class="activeId === entry.id ? 'text-slate-400' : 'text-slate-600'"
          >
            {{ entry.role }}
          </span>

          <!-- Expanded description -->
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="max-h-0 opacity-0"
            enter-to-class="max-h-40 opacity-100"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="max-h-40 opacity-100"
            leave-to-class="max-h-0 opacity-0"
          >
            <p
              v-if="activeId === entry.id"
              class="mt-2 overflow-hidden text-xs leading-relaxed text-slate-500"
            >
              {{ entry.description }}
            </p>
          </Transition>
        </div>
      </button>
    </div>
  </nav>
</template>
