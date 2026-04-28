import { useAuth0 } from '@auth0/auth0-vue'

export function useApi() {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiUrl?.replace(/\/$/, '') || ''

  // Auth0 is a client-only plugin — useAuth0() must not be called during SSR.
  // import.meta.client is statically false in the server bundle so this block
  // is entirely eliminated there; on the client it runs in component setup context.
  let getTokenFn: (() => Promise<string>) | null = null
  if (import.meta.client) {
    const { getAccessTokenSilently, loginWithRedirect } = useAuth0()
    getTokenFn = async () => {
      try {
        return await getAccessTokenSilently()
      } catch (e: any) {
        // The local refresh token is gone, expired, or has been rotation-revoked.
        // The Auth0 tenant SSO session cookie typically lives longer than the
        // refresh token, so try a silent round-trip with prompt=none to recover
        // transparently. If the SSO session is alive the user comes back
        // re-authenticated without seeing a sign-in screen. If it's also dead,
        // Auth0 redirects back with an error and this throw propagates so the
        // caller can show "sign in again". appState.target preserves the user's
        // location for a future onRedirectCallback to consume.
        const recoverable = ['login_required', 'consent_required', 'missing_refresh_token', 'invalid_grant']
        if (recoverable.includes(e?.error)) {
          await loginWithRedirect({
            authorizationParams: { prompt: 'none' },
            appState: { target: window.location.pathname + window.location.search },
          })
        }
        throw e
      }
    }
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
