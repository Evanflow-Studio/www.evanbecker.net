/**
 * Global current user state shared across AppHeader, ProfileSetupModal, and account page.
 * Nuxt's useState persists across component boundaries without a full Pinia store.
 */
export const useCurrentUser = () => useState<Record<string, any> | null>('currentUser', () => null)

/**
 * Set to true when the API returns 201 (new user row created).
 * Drives the mandatory profile setup modal on first login.
 */
export const useNeedsProfileSetup = () => useState<boolean>('needsProfileSetup', () => false)
