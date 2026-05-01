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

    // Recovery flow continuation. useApi.fetchWithAuth triggers a prompt=none
    // redirect when the local refresh token is dead, writing the user's
    // original location into sessionStorage so we can restore it here on the
    // post-redirect page load.
    //
    // Two branches we have to handle:
    //   1. Silent recovery succeeded — Auth0 SSO cookie was alive, the user is
    //      now authenticated. auth0-vue's __checkSession already navigates to
    //      appState.target on this branch, but we double-check with the router
    //      in case anything raced.
    //   2. Silent recovery failed — Auth0 SSO cookie was also dead, Auth0
    //      redirected back with error=login_required. auth0-vue's __checkSession
    //      catch path lands the user on errorPath || '/', signed out. The user
    //      explicitly wants this case to escalate into an interactive
    //      loginWithRedirect so they can sign back in and return to their page.
    if (typeof sessionStorage !== 'undefined') {
      const target = sessionStorage.getItem('auth0_recovery_target')
      if (target) {
        sessionStorage.removeItem('auth0_recovery_target')
        const router = useRouter()

        // Use a one-shot guard so the watcher only acts on the first
        // isLoading=false transition. Defining it before watchEffect avoids
        // any self-reference race when the effect fires synchronously.
        let handled = false
        watchEffect(() => {
          if (auth0.isLoading.value) return
          if (handled) return
          handled = true

          // Defer one tick past auth0-vue's own __checkSession completion. Its
          // router.push(errorPath) runs in the catch branch *after* isLoading
          // flips false, so without this tick we'd race it and our navigation
          // could be silently overwritten.
          setTimeout(() => {
            if (auth0.isAuthenticated.value) {
              // Silent recovery worked. Make sure we're at the target.
              const currentPath = window.location.pathname + window.location.search
              if (currentPath !== target) {
                router.push(target)
              }
              return
            }

            // Silent recovery failed. Escalate to interactive login. The user
            // sees the Auth0 login screen, signs in, and lands back on the
            // original target via appState resolution in __checkSession.
            auth0.loginWithRedirect({ appState: { target } })
          }, 0)
        })
      }
    }
  } catch (e) {
    console.warn('Auth0: failed to initialize, app will run without authentication.', e)
  }
})
