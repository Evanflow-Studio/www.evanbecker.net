/** MusicBrainz API response types — recording search + artist lookup. */

export interface MBTag {
  name: string
  count: number
}

export interface MBArtistCredit {
  name: string
  artist: {
    id: string
    name: string
    tags?: MBTag[]
  }
}

export interface MBRelease {
  id: string
  title: string
}

export interface MBRecording {
  id: string
  title: string
  score: number
  'artist-credit': MBArtistCredit[]
  releases?: MBRelease[]
  tags?: MBTag[]
}

export interface MBRecordingSearchResponse {
  recordings: MBRecording[]
}

export interface MBArtistResponse {
  id: string
  name: string
  tags?: MBTag[]
}
