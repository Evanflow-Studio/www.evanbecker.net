import { useAuth0 } from '@auth0/auth0-vue'

export function useApi() {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiUrl?.replace(/\/$/, '') || ''

  // Auth0 is a client-only plugin — useAuth0() must not be called during SSR.
  // import.meta.client is statically false in the server bundle so this block
  // is entirely eliminated there; on the client it runs in component setup context.
  let getTokenFn: (() => Promise<string>) | null = null
  if (import.meta.client) {
    const { getAccessTokenSilently } = useAuth0()
    getTokenFn = getAccessTokenSilently
  }

  async function fetchWithAuth(path: string, options: RequestInit = {}) {
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    if (getTokenFn) {
      const token = await getTokenFn()
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${baseUrl}/api/v1/${path}`, {
      ...options,
      headers,
      mode: 'cors',
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async function fetchPublic(path: string, options: RequestInit = {}) {
    const response = await fetch(`${baseUrl}/api/v1/${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
      },
      mode: 'cors',
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  return { fetchWithAuth, fetchPublic }
}
