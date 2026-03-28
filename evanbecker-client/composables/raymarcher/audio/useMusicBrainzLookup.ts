import { ref } from 'vue'
import type {
  MBRecording,
  MBRecordingSearchResponse,
  MBArtistResponse,
  MBTag,
} from './musicbrainz-types'

const MB_BASE = 'https://musicbrainz.org/ws/2'
const USER_AGENT = 'evanbecker.net/1.0 (me@evanbecker.net)'

// Simple rate limiter: 1 request per second
let lastRequestTime = 0

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now()
  const wait = Math.max(0, 1000 - (now - lastRequestTime))
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastRequestTime = Date.now()
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })
}

const NON_GENRE_TAGS = new Set([
  'music video', 'live', 'remix', 'remaster', 'remastered', 'single',
  'album', 'ep', 'compilation', 'demo', 'acoustic', 'instrumental',
  'cover', 'karaoke', 'clean', 'explicit',
])

function extractGenreTags(tags: MBTag[]): string[] {
  return tags
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .map(t => t.name?.toLowerCase())
    .filter((t): t is string => !!t && !NON_GENRE_TAGS.has(t))
}

/**
 * Looks up a track on MusicBrainz to extract genre/tag metadata.
 * Client-side only — free API, no key required, 1 req/sec rate limit.
 */
export function useMusicBrainzLookup() {
  const genres = ref<string[]>([])
  const mbArtist = ref('')
  const mbRelease = ref('')
  const isLooking = ref(false)
  const error = ref<string | null>(null)

  // In-memory cache keyed by "artist|title"
  const cache = new Map<string, { genres: string[], artist: string, release: string }>()

  /**
   * Check if a MusicBrainz result plausibly matches our search.
   * Prevents "chad neidt" from matching when we searched "red hot chili peppers".
   */
  function filterRelevantResults(
    recordings: MBRecording[],
    searchTitle: string,
    searchArtist: string,
  ): MBRecording[] {
    const titleLower = searchTitle.toLowerCase()
    const artistLower = searchArtist.toLowerCase()

    return recordings.filter((rec) => {
      const recTitle = (rec.title ?? '').toLowerCase()
      const recArtist = (rec['artist-credit']?.[0]?.name ?? '').toLowerCase()
      const score = rec.score ?? 0

      if (score < 50) return false

      if (artistLower) {
        const artistMatch = recArtist.includes(artistLower) || artistLower.includes(recArtist)
        const creditMatch = (rec['artist-credit'] ?? []).some(
          c => (c.name ?? '').toLowerCase().includes(artistLower) || artistLower.includes((c.name ?? '').toLowerCase()),
        )
        if (!artistMatch && !creditMatch) return false
      }

      if (titleLower.length > 2) {
        const titleWords = titleLower.split(/\s+/).filter(w => w.length > 2)
        const recWords = recTitle.split(/\s+/).filter(w => w.length > 2)
        const overlap = titleWords.some(w => recWords.includes(w)) || recWords.some(w => titleWords.includes(w))
        const substringMatch = recTitle.includes(titleLower) || titleLower.includes(recTitle)
        if (!overlap && !substringMatch) return false
      }

      return true
    })
  }

  function buildSearchStrategies(title: string, artist: string): string[] {
    const queries: string[] = []
    if (artist && title) {
      queries.push(`recording:"${title}" AND artist:"${artist}"`)
      queries.push(`${artist} ${title}`)
      queries.push(`artist:"${artist}" AND ${title}`)
    }
    if (title) {
      queries.push(`recording:"${title}"`)
      queries.push(title)
    }
    return queries
  }

  async function lookup(title: string, artist: string) {
    if (!title.trim()) return

    const cacheKey = `${artist.toLowerCase()}|${title.toLowerCase()}`
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!
      genres.value = cached.genres
      mbArtist.value = cached.artist
      mbRelease.value = cached.release
      return
    }

    isLooking.value = true
    error.value = null

    try {
      const strategies = buildSearchStrategies(title, artist)
      let recordings: MBRecording[] = []

      for (const query of strategies) {
        if (import.meta.dev) console.log('%c[MusicBrainz] Trying:', 'color: #8B5CF6', query)

        const res = await rateLimitedFetch(
          `${MB_BASE}/recording?query=${encodeURIComponent(query)}&limit=5&fmt=json`,
        )
        if (!res.ok) continue

        const data: MBRecordingSearchResponse = await res.json()
        recordings = data.recordings ?? []

        if (recordings.length > 0) {
          const filtered = filterRelevantResults(recordings, title, artist)
          if (filtered.length > 0) {
            recordings = filtered
            if (import.meta.dev) console.log('%c[MusicBrainz] Found %d relevant', 'color: #10B981', filtered.length)
            break
          } else {
            recordings = []
          }
        }
      }

      if (recordings.length === 0) {
        genres.value = []
        mbArtist.value = ''
        mbRelease.value = ''
        cache.set(cacheKey, { genres: [], artist: '', release: '' })
        return
      }

      const recording = recordings[0]
      const foundArtist = recording['artist-credit']?.[0]?.name ?? ''
      const foundRelease = recording.releases?.[0]?.title ?? ''

      // Extract genre tags from recording
      let tags = extractGenreTags(recording.tags ?? [])

      // Fall back to artist-level tags if recording has none
      if (tags.length === 0 && recording['artist-credit']?.[0]?.artist?.id) {
        const artistId = recording['artist-credit'][0].artist.id
        if (import.meta.dev) console.log('%c[MusicBrainz] No recording genres, trying artist:', 'color: #F59E0B', foundArtist)

        try {
          const artistRes = await rateLimitedFetch(`${MB_BASE}/artist/${artistId}?inc=tags&fmt=json`)
          if (artistRes.ok) {
            const artistData: MBArtistResponse = await artistRes.json()
            tags = extractGenreTags(artistData.tags ?? [])
            if (import.meta.dev) console.log('%c[MusicBrainz] Artist genres:', 'color: #8B5CF6; font-weight: bold', tags)
          }
        } catch {
          // Artist lookup failed — non-critical
        }
      }

      genres.value = tags
      mbArtist.value = foundArtist
      mbRelease.value = foundRelease
      cache.set(cacheKey, { genres: tags, artist: foundArtist, release: foundRelease })
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'MusicBrainz lookup failed'
      if (import.meta.dev) console.warn('[useMusicBrainzLookup]', err)
    } finally {
      isLooking.value = false
    }
  }

  function clear() {
    genres.value = []
    mbArtist.value = ''
    mbRelease.value = ''
    error.value = null
  }

  return { genres, mbArtist, mbRelease, isLooking, error, lookup, clear }
}
