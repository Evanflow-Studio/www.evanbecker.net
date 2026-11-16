import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
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

// Every API call and hub connection must carry credentials, or Access on test refuses it.
describe('every call site', () => {
  const root = fileURLToPath(new URL('../..', import.meta.url))
  const dirs = ['components', 'composables', 'layouts', 'pages', 'plugins', 'stores', 'utils']

  function sources(dir: string): string[] {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return []
    }
    return entries.flatMap((name) => {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) return sources(path)
      return /\.(vue|ts)$/.test(name) ? [path] : []
    })
  }

  const files = [...dirs.flatMap((d) => sources(join(root, d))), join(root, 'app.vue')]
    .map((path) => ({ name: relative(root, path).replace(/\\/g, '/'), text: readFileSync(path, 'utf8') }))

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

  it('opens every SignalR hub with credentials', () => {
    const hubs = files.filter((f) => f.text.includes('/hubs/'))
    expect(hubs.length).toBeGreaterThan(0)
    const missing = hubs.filter((f) => !f.text.includes('withCredentials: true')).map((f) => f.name)
    expect(missing).toEqual([])
  })
})
