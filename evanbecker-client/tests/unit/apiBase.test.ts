import { describe, it, expect } from 'vitest'
import { apiRequestDefaults, resolveApiBase } from '../../utils/apiBase'

describe('resolveApiBase', () => {
  it('uses the public URL in the browser, without a trailing slash', () => {
    expect(resolveApiBase('https://api-test.evanbecker.net/')).toBe('https://api-test.evanbecker.net')
    expect(resolveApiBase('https://api.evanbecker.net')).toBe('https://api.evanbecker.net')
  })

  it("uses the host's own network address on the server when it's set", () => {
    expect(resolveApiBase('https://api-test.evanbecker.net/', 'http://ebn-tst-api/')).toBe('http://ebn-tst-api')
  })

  it('falls back to the public URL when the server address is unset', () => {
    expect(resolveApiBase('https://api.evanbecker.net/', '')).toBe('https://api.evanbecker.net')
    expect(resolveApiBase('https://api.evanbecker.net/', undefined)).toBe('https://api.evanbecker.net')
  })

  it('is empty when nothing is configured', () => {
    expect(resolveApiBase(undefined, undefined)).toBe('')
  })
})

describe('apiRequestDefaults', () => {
  it('sends credentials cross-origin, so Cloudflare Access on test gets its cookie', () => {
    expect(apiRequestDefaults).toEqual({ mode: 'cors', credentials: 'include' })
  })
})

// Every API call must carry credentials, or Access on test refuses it.
describe('every call site', () => {
  // The source text of every app file, read by Vite at test time.
  const sources = import.meta.glob<string>(
    ['../../{components,composables,layouts,pages,plugins,stores,utils}/**/*.{vue,ts}', '../../app.vue'],
    { query: '?raw', import: 'default', eager: true },
  )
  const files = Object.entries(sources).map(([path, text]) => ({ name: path.replace(/^\.\.\/\.\.\//, ''), text }))

  it('reads every app source file', () => {
    expect(files.map((f) => f.name)).toEqual(expect.arrayContaining(['app.vue', 'composables/useApi.ts']))
  })

  it('reads the public API URL only through useApiBase', () => {
    const readers = files.filter((f) => f.text.includes('public.apiUrl')).map((f) => f.name)
    expect(readers).toEqual(['composables/useApi.ts'])
  })

  it('sends apiRequestDefaults with every /api/v1 call', () => {
    const callers = files.filter((f) => f.text.includes('/api/v1/'))
    expect(callers.length).toBeGreaterThan(0)
    const missing = callers.filter((f) => !f.text.includes('...apiRequestDefaults')).map((f) => f.name)
    expect(missing).toEqual([])
  })

  // The API serves no SignalR hub since comments left the site. A hub that comes back must connect with
  // withCredentials: true, or Access on test refuses it: bring that check back with it.
  it('opens no SignalR hub, since the API serves none', () => {
    const hubs = files.filter((f) => f.text.includes('/hubs/') || f.text.includes('@microsoft/signalr'))
    expect(hubs.map((f) => f.name)).toEqual([])
  })
})
