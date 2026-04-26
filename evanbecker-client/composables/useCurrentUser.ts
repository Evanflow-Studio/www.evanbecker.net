const CACHE_KEY = 'evb:currentUser'

/**
 * Global current user state shared across AppHeader, ProfileSetupModal, and account page.
 * Nuxt's useState persists across component boundaries without a full Pinia store.
 *
 * On the client, the initial value is hydrated from localStorage so the user's
 * name/avatar appear instantly instead of showing "?" while Auth0 loads.
 * The API sync overwrites this if anything changed.
 */
export const useCurrentUser = () => {
  const state = useState<Record<string, any> | null>('currentUser', () => {
    if (import.meta.client) {
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) return JSON.parse(cached)
      } catch { /* corrupt cache, ignore */ }
    }
    return null
  })

  // Keep localStorage in sync whenever the state changes
  if (import.meta.client) {
    watch(state, (val) => {
      try {
        if (val) localStorage.setItem(CACHE_KEY, JSON.stringify(val))
        else localStorage.removeItem(CACHE_KEY)
      } catch { /* storage full or disabled, ignore */ }
    }, { deep: true })
  }

  return state
}

/**
 * Set to true when the API returns 201 (new user row created).
 * Drives the mandatory profile setup modal on first login.
 */
export const useNeedsProfileSetup = () => useState<boolean>('needsProfileSetup', () => false)
