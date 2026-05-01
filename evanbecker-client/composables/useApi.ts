import { useAuth0 } from '@auth0/auth0-vue'

export interface FetchWithAuthOptions extends RequestInit {
  /**
   * Opt in to automatic re-authentication when getAccessTokenSilently throws
   * an auth error.
   *
   * Defaults to false, which is correct for almost every call site: a public
   * blog page that quietly tries to load the current user (e.g. the comment
   * section) must NOT trigger a redirect when the visitor is logged out, or
   * any visitor reading a public article will be bounced to Auth0 mid-read.
   *
   * Pass `recover: true` only on call sites where the user is on a page
   * dedicated to authenticated functionality and falling through to the
   * universal login is the right UX. The /account page mount is the
   * canonical case.
   */
  recover?: boolean
}

export function useApi() {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiUrl?.replace(/\/$/, '') || ''

  // Auth0 is a client-only plugin — useAuth0() must not be called during SSR.
  // import.meta.client is statically false in the server bundle so this block
  // is entirely eliminated there; on the client it runs in component setup context.
  let getTokenFn: (() => Promise<string>) | null = null
  let triggerLogin: (() => Promise<void>) | null = null
  if (import.meta.client) {
    const { getAccessTokenSilently, loginWithRedirect } = useAuth0()
    getTokenFn = getAccessTokenSilently
    triggerLogin = () => loginWithRedirect({
      appState: { target: window.location.pathname + window.location.search },
    })
  }

  async function fetchWithAuth(path: string, options: FetchWithAuthOptions = {}) {
    const { recover = false, ...fetchOptions } = options
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string> || {}),
    }

    if (getTokenFn) {
      try {
        const token = await getTokenFn()
        headers['Authorization'] = `Bearer ${token}`
      } catch (e: any) {
        // The Auth0 SDK already handled the silent refresh attempt internally
        // (using the refresh token via getAccessTokenSilently). If it threw an
        // auth error, the session genuinely cannot be silently re-established.
        // The canonical Auth0 SPA pattern at this point is to send the user
        // through the universal login. After they sign in, auth0-vue's
        // __checkSession reads appState.target and routes them back here.
        const recoverable = ['login_required', 'consent_required', 'missing_refresh_token', 'invalid_grant']
        if (recover && recoverable.includes(e?.error) && triggerLogin) {
          await triggerLogin()
        }
        throw e
      }
    }

    const response = await fetch(`${baseUrl}/api/v1/${path}`, {
      ...fetchOptions,
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
