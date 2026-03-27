import { useAuth0 } from '@auth0/auth0-vue'

export function useApi() {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiUrl?.replace(/\/$/, '') || ''
  const { getAccessTokenSilently } = useAuth0()

  async function fetchWithAuth(path: string, options: RequestInit = {}) {
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    try {
      const token = await getAccessTokenSilently()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    } catch (e) {
      console.warn('useApi: could not get access token:', e)
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
