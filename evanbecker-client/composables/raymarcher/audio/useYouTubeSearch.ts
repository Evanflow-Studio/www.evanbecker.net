import { ref } from 'vue'

export interface YouTubeSearchResult {
  videoId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
}

export function useYouTubeSearch() {
  const config = useRuntimeConfig()
  const results = ref<YouTubeSearchResult[]>([])
  const isSearching = ref(false)
  const searchError = ref('')

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  async function search(query: string, maxResults = 10) {
    if (!query.trim()) {
      results.value = []
      return
    }

    isSearching.value = true
    searchError.value = ''

    try {
      const apiUrl = config.public.apiUrl
      const data = await $fetch<YouTubeSearchResult[]>(
        `${apiUrl}api/v1/youtube/search`,
        { params: { q: query, maxResults } }
      )
      results.value = data
    } catch (err) {
      console.error('YouTube search failed:', err)
      searchError.value = 'Search failed. Try again.'
      results.value = []
    } finally {
      isSearching.value = false
    }
  }

  function searchDebounced(query: string, maxResults = 10) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => search(query, maxResults), 300)
  }

  function clear() {
    results.value = []
    searchError.value = ''
  }

  return {
    results,
    isSearching,
    searchError,
    search,
    searchDebounced,
    clear,
  }
}
