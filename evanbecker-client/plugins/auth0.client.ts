import { createAuth0 } from '@auth0/auth0-vue'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  if (!config.public.auth0Domain) {
    console.warn('Auth0: domain not configured, skipping initialization.')
    return
  }

  try {
    const auth0 = createAuth0({
      domain: config.public.auth0Domain,
      clientId: config.public.auth0ClientId,
      authorizationParams: {
        redirect_uri: config.public.auth0RedirectUri,
        audience: config.public.auth0Audience,
        scope: 'openid profile email offline_access',
      },
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
    })

    nuxtApp.vueApp.use(auth0)

    // Recovery: useApi.fetchWithAuth triggers a prompt=none redirect when the
    // local refresh token is dead. On success, auth0-vue navigates to the
    // appState.target. On failure (SSO session also dead), it falls back to
    // errorPath || '/', which loses the user's place. sessionStorage carries
    // the intended target across the round-trip so we can restore it here
    // regardless of which branch auth0-vue takes.
    if (typeof sessionStorage !== 'undefined') {
      const target = sessionStorage.getItem('auth0_recovery_target')
      if (target) {
        sessionStorage.removeItem('auth0_recovery_target')
        // Wait for auth0-vue's __checkSession to finish before checking where
        // we actually landed, otherwise we race its router.push.
        const stop = watch(auth0.isLoading, (loading: boolean) => {
          if (!loading) {
            stop()
            const currentPath = window.location.pathname + window.location.search
            if (currentPath !== target) {
              navigateTo(target)
            }
          }
        }, { immediate: true })
      }
    }
  } catch (e) {
    console.warn('Auth0: failed to initialize, app will run without authentication.', e)
  }
})
