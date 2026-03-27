<script setup lang="ts">
useHead({ title: 'Account - Evan Becker' })

const config = useRuntimeConfig()
const apiBase = config.public.apiUrl?.replace(/\/$/, '') || ''
const currentUser = useCurrentUser()
const { fetchWithAuth } = useApi()

// Auth0 state — same pattern as AppHeader
const auth0Available = ref(false)
const isAuthenticated = ref(false)
const isLoading = ref(true)
let loginWithRedirect: (() => void) | null = null
let logoutFn: (() => void) | null = null
let getAccessTokenSilently: (() => Promise<string>) | null = null

if (import.meta.client) {
  try {
    const { useAuth0 } = await import('@auth0/auth0-vue')
    const auth0 = useAuth0()
    auth0Available.value = true
    isAuthenticated.value = auth0.isAuthenticated.value
    isLoading.value = auth0.isLoading.value
    loginWithRedirect = () => auth0.loginWithRedirect()
    logoutFn = () => auth0.logout({ logoutParams: { returnTo: window.location.origin } })
    getAccessTokenSilently = () => auth0.getAccessTokenSilently()

    watch(() => auth0.isAuthenticated.value, (val: boolean) => { isAuthenticated.value = val })
    watch(() => auth0.isLoading.value, (val: boolean) => { isLoading.value = val })
  } catch {
    auth0Available.value = false
    isLoading.value = false
  }
} else {
  isLoading.value = false
}

// Profile editing
const profileSaving = ref(false)
const profileSaved = ref(false)

async function onProfileSave(payload: { firstName: string; lastName: string; avatar: string | null }) {
  profileSaving.value = true
  profileSaved.value = false
  try {
    const updated = await fetchWithAuth('user', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    currentUser.value = updated
    profileSaved.value = true
    setTimeout(() => { profileSaved.value = false }, 3000)
  } catch (e) {
    console.error('Failed to update profile:', e)
  } finally {
    profileSaving.value = false
  }
}

// Spotify connection state
const spotifyStatus = ref<{
  connected: boolean
  premium: boolean
  displayName: string | null
  tokenValid: boolean
} | null>(null)
const spotifyLoading = ref(false)
const spotifyError = ref('')
const spotifyConnecting = ref(false)

async function authFetch(path: string, options: RequestInit = {}) {
  return fetchWithAuth(path, options)
}

async function fetchSpotifyStatus() {
  if (!isAuthenticated.value) return
  spotifyLoading.value = true
  try {
    spotifyStatus.value = await authFetch('spotify/me')
  } catch (e: any) {
    spotifyError.value = e.message || 'Failed to load Spotify status'
  } finally {
    spotifyLoading.value = false
  }
}

async function connectSpotify() {
  spotifyError.value = ''
  try {
    const data = await $fetch<{ url: string }>(`${apiBase}/api/v1/spotify/auth-url`, {
      query: { redirectUrl: '/account' },
    })
    if (data?.url) {
      window.location.href = data.url
    }
  } catch (e: any) {
    spotifyError.value = e.message || 'Failed to start Spotify OAuth'
  }
}

async function disconnectSpotify() {
  spotifyError.value = ''
  try {
    await authFetch('spotify/disconnect', { method: 'POST' })
    spotifyStatus.value = { connected: false, premium: false, displayName: null, tokenValid: false }
  } catch (e: any) {
    spotifyError.value = e.message || 'Failed to disconnect Spotify'
  }
}

// Handle Spotify OAuth callback on mount
onMounted(async () => {
  // Wait for auth0 loading to complete
  if (isLoading.value) {
    await new Promise<void>((resolve) => {
      const stop = watch(() => isLoading.value, (val) => {
        if (!val) { stop(); resolve() }
      }, { immediate: true })
    })
  }

  if (!isAuthenticated.value) return

  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  const state = urlParams.get('state')

  // Only handle if this looks like a Spotify callback (state will be our redirect path)
  // Auth0 callbacks have state too, but those are handled by the Auth0 plugin
  if (code && state && !state.startsWith('auth0')) {
    spotifyConnecting.value = true
    // Clean URL immediately
    window.history.replaceState(null, '', window.location.pathname)
    try {
      await authFetch('spotify/connect', {
        method: 'POST',
        body: JSON.stringify({ code }),
      })
      await fetchSpotifyStatus()
    } catch (e: any) {
      spotifyError.value = e.message || 'Failed to connect Spotify'
    } finally {
      spotifyConnecting.value = false
    }
  } else {
    await fetchSpotifyStatus()
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#0B1120]">
    <div class="mx-auto max-w-2xl px-4 pb-20 pt-28 sm:px-6">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-[#2D95FC]" />
      </div>

      <!-- Not authenticated -->
      <div v-else-if="!isAuthenticated" class="rounded-xl border border-slate-700/50 bg-slate-900/50 p-8 text-center">
        <h1 class="text-2xl font-bold text-white mb-3">Account</h1>
        <p class="text-slate-400 mb-6">Sign in to manage your account and connected services.</p>
        <button
          class="rounded-lg bg-[#2D95FC] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2D95FC]/80"
          @click="loginWithRedirect?.()"
        >
          Sign In
        </button>
      </div>

      <!-- Authenticated -->
      <div v-else class="space-y-6">
        <h1 class="text-2xl font-bold text-white">Account</h1>

        <!-- Profile card -->
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/50 p-6">
          <div class="mb-5 flex items-center justify-between">
            <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-400">Profile</h2>
            <Transition
              enter-active-class="transition duration-300"
              enter-from-class="opacity-0 translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-200"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <span v-if="profileSaved" class="text-xs font-medium text-green-400">Saved!</span>
            </Transition>
          </div>

          <div v-if="currentUser">
            <div class="mb-1 text-xs text-slate-500">{{ currentUser.email }}</div>
            <ProfileForm :user="currentUser" :saving="profileSaving" @save="onProfileSave" />
          </div>
          <div v-else class="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        </div>

        <!-- Connected Services -->
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/50 p-6">
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Connected Services</h2>

          <!-- Spotify -->
          <div class="rounded-lg border border-slate-700/30 bg-slate-800/30 p-4">
            <div class="flex items-center gap-3">
              <!-- Spotify icon -->
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1DB954]/15">
                <svg class="h-5 w-5 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </div>

              <div class="flex-1">
                <p class="text-sm font-medium text-white">Spotify</p>

                <!-- Loading state -->
                <div v-if="spotifyLoading || spotifyConnecting" class="flex items-center gap-2 mt-1">
                  <div class="h-3 w-3 animate-spin rounded-full border border-slate-600 border-t-[#1DB954]" />
                  <span class="text-xs text-slate-400">{{ spotifyConnecting ? 'Connecting...' : 'Loading...' }}</span>
                </div>

                <!-- Connected -->
                <div v-else-if="spotifyStatus?.connected" class="flex items-center gap-2 mt-1">
                  <div class="h-1.5 w-1.5 rounded-full bg-[#1DB954]" />
                  <span class="text-xs text-slate-300">{{ spotifyStatus.displayName }}</span>
                  <span
                    v-if="spotifyStatus.premium"
                    class="rounded-full border border-yellow-500/40 bg-yellow-500/15 px-1.5 py-0.5 text-[9px] font-medium text-yellow-400"
                  >PREMIUM</span>
                  <span
                    v-else
                    class="rounded-full border border-slate-600 bg-slate-800/50 px-1.5 py-0.5 text-[9px] font-medium text-slate-400"
                  >FREE</span>
                </div>

                <!-- Not connected -->
                <p v-else class="mt-1 text-xs text-slate-500">
                  Connect to stream music in the Ray Marcher
                </p>
              </div>

              <!-- Action button -->
              <button
                v-if="spotifyStatus?.connected"
                class="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
                @click="disconnectSpotify"
              >
                Disconnect
              </button>
              <button
                v-else-if="!spotifyLoading && !spotifyConnecting"
                class="rounded-lg border border-[#1DB954]/50 bg-[#1DB954]/15 px-4 py-2 text-xs font-medium text-[#1DB954] transition-colors hover:bg-[#1DB954]/25"
                @click="connectSpotify"
              >
                Connect
              </button>
            </div>

            <p v-if="spotifyError" class="mt-2 text-xs text-red-400">{{ spotifyError }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
