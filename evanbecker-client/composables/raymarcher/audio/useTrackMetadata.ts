import { ref, watch } from 'vue'
import { useMusicBrainzLookup } from './useMusicBrainzLookup'
import { useRayMarcherStore } from '~/stores/raymarcher'

export interface TrackMetadata {
  title: string
  artist: string
  genres: string[]
  tags: string[]
}

/**
 * Parses YouTube video titles to extract artist and track name.
 * Common formats: "Artist - Title", "Artist: Title", "Artist — Title",
 * "Title by Artist", "Artist | Title", "Artist 'Title'"
 */
function parseYouTubeTitle(rawTitle: string): { artist: string, title: string } {
  // Strip common suffixes
  let cleaned = rawTitle
    .replace(/\s*\(official\s*(music\s*)?video\)/i, '')
    .replace(/\s*\[official\s*(music\s*)?video\]/i, '')
    .replace(/\s*\(official\s*audio\)/i, '')
    .replace(/\s*\[official\s*audio\]/i, '')
    .replace(/\s*\(lyrics?\)/i, '')
    .replace(/\s*\[lyrics?\]/i, '')
    .replace(/\s*\(visuali[sz]er\)/i, '')
    .replace(/\s*\[visuali[sz]er\]/i, '')
    .replace(/\s*\(audio\)/i, '')
    .replace(/\s*\[audio\]/i, '')
    .replace(/\s*ft\.?\s*.+$/i, '') // strip "ft. Someone"
    .replace(/\s*feat\.?\s*.+$/i, '')
    .trim()

  // Try common separators: " - ", " — ", " – ", " | ", " : "
  for (const sep of [' - ', ' — ', ' – ', ' | ', ' : ']) {
    const idx = cleaned.indexOf(sep)
    if (idx > 0) {
      return {
        artist: cleaned.substring(0, idx).trim(),
        title: cleaned.substring(idx + sep.length).trim(),
      }
    }
  }

  // No separator found — use the whole thing as title, channel as artist
  return { artist: '', title: cleaned }
}

/**
 * Orchestrates track metadata from YouTube info + MusicBrainz genres.
 * Call `resolve()` when a new track starts playing.
 */
export function useTrackMetadata() {
  const store = useRayMarcherStore()
  const mb = useMusicBrainzLookup()

  const metadata = ref<TrackMetadata>({
    title: '',
    artist: '',
    genres: [],
    tags: [],
  })
  const isResolving = ref(false)

  /**
   * Resolve metadata for a track.
   * @param videoTitle - YouTube video title
   * @param channelName - YouTube channel name (fallback artist)
   * @param ytTags - Tags from YouTube Data API (optional, from video detail endpoint)
   */
  async function resolve(videoTitle: string, channelName: string, ytTags: string[] = []) {
    isResolving.value = true

    const parsed = parseYouTubeTitle(videoTitle)
    const artist = parsed.artist || channelName
    const title = parsed.title

    if (import.meta.dev) console.log(
      '%c[TrackMeta] Parsed YouTube title',
      'color: #F59E0B; font-weight: bold',
      { raw: videoTitle, parsed: { artist, title }, channel: channelName }
    )

    metadata.value = {
      title,
      artist,
      genres: [],
      tags: ytTags,
    }

    // Sync to store immediately with what we have
    store.audio.trackTitle = title
    store.audio.trackArtist = artist
    store.audio.trackGenres = []

    // Look up genres from MusicBrainz (async, rate-limited)
    await mb.lookup(title, artist)

    if (mb.genres.value.length > 0) {
      metadata.value = { ...metadata.value, genres: [...mb.genres.value] }
      store.audio.trackGenres = [...mb.genres.value]
      if (import.meta.dev) console.log(
        '%c[TrackMeta] MusicBrainz genres found',
        'color: #8B5CF6; font-weight: bold',
        mb.genres.value
      )
    } else {
      if (import.meta.dev) console.log('%c[TrackMeta] No MusicBrainz genres found', 'color: #6B7280')
    }

    // Use MusicBrainz artist if it found a better match
    if (mb.mbArtist.value) {
      metadata.value = { ...metadata.value, artist: mb.mbArtist.value }
      store.audio.trackArtist = mb.mbArtist.value
    }

    if (import.meta.dev) console.log(
      '%c[TrackMeta] Resolved',
      'color: #F59E0B; font-weight: bold',
      { title: metadata.value.title, artist: metadata.value.artist, genres: metadata.value.genres }
    )

    isResolving.value = false
  }

  function clear() {
    metadata.value = { title: '', artist: '', genres: [], tags: [] }
    mb.clear()
    store.audio.trackTitle = ''
    store.audio.trackArtist = ''
    store.audio.trackGenres = []
  }

  return {
    metadata,
    isResolving,
    resolve,
    clear,
    // Expose MusicBrainz state for debug UI
    mbGenres: mb.genres,
    mbError: mb.error,
    mbLooking: mb.isLooking,
  }
}
