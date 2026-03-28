import { ref, computed } from 'vue'
import type { YouTubeTrack } from './useYouTubePlayer'

export type RepeatMode = 'none' | 'one' | 'all'

export function usePlaybackQueue() {
  const queue = ref<YouTubeTrack[]>([])
  const currentIndex = ref(-1)
  const repeatMode = ref<RepeatMode>('none')
  const isShuffled = ref(false)

  // Shuffle order — indices into the queue
  const shuffleOrder = ref<number[]>([])
  const shufflePosition = ref(0)

  const currentTrack = computed<YouTubeTrack | null>(() => {
    const idx = isShuffled.value ? shuffleOrder.value[shufflePosition.value] : currentIndex.value
    return (idx >= 0 && idx < queue.value.length) ? queue.value[idx] : null
  })

  const hasNext = computed(() => {
    if (repeatMode.value === 'all' || repeatMode.value === 'one') return queue.value.length > 0
    const pos = isShuffled.value ? shufflePosition.value : currentIndex.value
    return pos < queue.value.length - 1
  })

  const hasPrevious = computed(() => {
    const pos = isShuffled.value ? shufflePosition.value : currentIndex.value
    return pos > 0
  })

  function addToQueue(track: YouTubeTrack) {
    queue.value.push(track)
    // If nothing playing, start this one
    if (currentIndex.value === -1) {
      currentIndex.value = 0
      if (isShuffled.value) rebuildShuffle()
    }
  }

  function removeFromQueue(index: number) {
    if (index < 0 || index >= queue.value.length) return
    queue.value.splice(index, 1)
    if (queue.value.length === 0) {
      currentIndex.value = -1
    } else if (index < currentIndex.value) {
      currentIndex.value--
    } else if (index === currentIndex.value) {
      currentIndex.value = Math.min(currentIndex.value, queue.value.length - 1)
    }
  }

  function playAt(index: number): YouTubeTrack | null {
    if (index < 0 || index >= queue.value.length) return null
    currentIndex.value = index
    return queue.value[index]
  }

  function playNext(): YouTubeTrack | null {
    if (queue.value.length === 0) return null

    if (repeatMode.value === 'one') {
      return currentTrack.value
    }

    if (isShuffled.value) {
      if (shufflePosition.value < shuffleOrder.value.length - 1) {
        shufflePosition.value++
        currentIndex.value = shuffleOrder.value[shufflePosition.value]
      } else if (repeatMode.value === 'all') {
        rebuildShuffle()
        currentIndex.value = shuffleOrder.value[0]
      } else {
        return null
      }
    } else {
      if (currentIndex.value < queue.value.length - 1) {
        currentIndex.value++
      } else if (repeatMode.value === 'all') {
        currentIndex.value = 0
      } else {
        return null
      }
    }

    return currentTrack.value
  }

  function playPrevious(): YouTubeTrack | null {
    if (queue.value.length === 0) return null

    if (isShuffled.value) {
      if (shufflePosition.value > 0) {
        shufflePosition.value--
        currentIndex.value = shuffleOrder.value[shufflePosition.value]
      }
    } else {
      if (currentIndex.value > 0) currentIndex.value--
    }

    return currentTrack.value
  }

  function clearQueue() {
    queue.value = []
    currentIndex.value = -1
    shuffleOrder.value = []
    shufflePosition.value = 0
  }

  function moveItem(from: number, to: number) {
    if (from === to) return
    const [item] = queue.value.splice(from, 1)
    queue.value.splice(to, 0, item)
    // Adjust currentIndex if it was affected
    if (currentIndex.value === from) {
      currentIndex.value = to
    } else if (from < currentIndex.value && to >= currentIndex.value) {
      currentIndex.value--
    } else if (from > currentIndex.value && to <= currentIndex.value) {
      currentIndex.value++
    }
  }

  function toggleShuffle() {
    isShuffled.value = !isShuffled.value
    if (isShuffled.value) rebuildShuffle()
  }

  function cycleRepeat() {
    const modes: RepeatMode[] = ['none', 'all', 'one']
    const idx = modes.indexOf(repeatMode.value)
    repeatMode.value = modes[(idx + 1) % modes.length]
  }

  function rebuildShuffle() {
    const indices = Array.from({ length: queue.value.length }, (_, i) => i)
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    shuffleOrder.value = indices
    shufflePosition.value = 0
  }

  return {
    queue,
    currentIndex,
    currentTrack,
    repeatMode,
    isShuffled,
    hasNext,
    hasPrevious,
    addToQueue,
    removeFromQueue,
    playAt,
    playNext,
    playPrevious,
    clearQueue,
    moveItem,
    toggleShuffle,
    cycleRepeat,
    /** Replace the entire queue (used for session sync from host) */
    replaceQueue(tracks: YouTubeTrack[], newCurrentIndex: number) {
      queue.value = [...tracks]
      currentIndex.value = newCurrentIndex
      shuffleOrder.value = []
      shufflePosition.value = 0
      isShuffled.value = false
    },
  }
}
