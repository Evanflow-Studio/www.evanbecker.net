import { useAuth0 } from '@auth0/auth0-vue'

export interface FetchWithAuthOptions extends RequestInit {
  /**
   * Opt in to automatic silent re-auth when getAccessTokenSilently throws.
   *
   * Defaults to false, which is correct for almost every call site: a public
   * blog page that quietly tries to load the current user (e.g. the comment
   * section) must NOT trigger a redirect when the visitor is logged out, or
   * any visitor reading a public article will be bounced to Auth0 mid-read.
   *
   * Pass `recover: true` only on call sites where (a) the user is on a page
   * dedicated to authenticated functionality and (b) silently re-establishing
   * a session is the right UX. The /account page mount is the canonical case.
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
  let attemptRecovery: (() => Promise<void>) | null = null
  if (import.meta.client) {
    const { getAccessTokenSilently, loginWithRedirect, isAuthenticated } = useAuth0()
    getTokenFn = getAccessTokenSilently
    attemptRecovery = async () => {
      // Belt-and-suspenders: if the user has no Auth0 session at all (never
      // logged in, or explicitly logged out), there's nothing to recover and
      // bouncing them through Auth0 would be disruptive. Skip silently.
      if (!isAuthenticated.value) return
      // The local refresh token is gone, expired, or rotation-revoked but the
      // Auth0 tenant SSO session cookie may still be alive. Try a silent
      // round-trip with prompt=none. On success the user comes back
      // re-authenticated. On failure Auth0 redirects back with an error and
      // the auth0 plugin's recovery target watcher restores their location.
      const target = window.location.pathname + window.location.search
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('auth0_recovery_target', target)
      }
      await loginWithRedirect({
        authorizationParams: { prompt: 'none' },
        appState: { target },
      })
    }
  }

  async function fetchWithAuth(path: string, options: FetchWithAuthOptions = {}) {
    const { recover = false, ...fetchOptions } = options
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string> || {}),
    }

    if (getTokenFn) {
      try {
        const token = await getTokenFn()
        headers['Authorization'] = `Bearer ${token}`
      } catch (e: any) {
        const recoverable = ['login_required', 'consent_required', 'missing_refresh_token', 'invalid_grant']
        if (recover && recoverable.includes(e?.error) && attemptRecovery) {
          await attemptRecovery()
          // attemptRecovery navigates the page on success; falling through is
          // for the case where it returns without navigating (no auth0 session
          // to recover from), in which case we surface the original error.
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
