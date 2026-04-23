<script setup lang="ts">
definePageMeta({ ssr: false })
useHead({ title: 'Account - Evan Becker' })

const currentUser = useCurrentUser()
const experiments = useExperiments()
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

// If AppHeader's sync didn't populate currentUser (e.g. token was dead during nav),
// try to fetch it directly. On failure, leave it null — the template will show
// an inline error rather than redirecting the user away from a page they may
// just be browsing.
const profileLoadFailed = ref(false)
watchEffect(async () => {
  if (!isLoading.value && isAuthenticated.value && !currentUser.value && !profileLoadFailed.value) {
    try {
      currentUser.value = await fetchWithAuth('user')
    } catch {
      profileLoadFailed.value = true
    }
  }
})

// Profile editing
const profileSaving = ref(false)
const profileSaved = ref(false)
const profileSaveError = ref(false)

async function onProfileSave(payload: { firstName: string; lastName: string; avatar: string | null }) {
  profileSaving.value = true
  profileSaved.value = false
  profileSaveError.value = false
  try {
    const updated = await fetchWithAuth('user', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    currentUser.value = updated
    profileSaved.value = true
    setTimeout(() => { profileSaved.value = false }, 3000)
  } catch (e) {
    // Active action failed — most likely the token is dead. Surface an error
    // and let the user click Sign In rather than yanking them away mid-edit.
    console.error('Failed to update profile:', e)
    profileSaveError.value = true
  } finally {
    profileSaving.value = false
  }
}

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
        <p class="text-slate-400 mb-6">Sign in to manage your account.</p>
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
              <span v-else-if="profileSaveError" class="text-xs font-medium text-red-400">Session expired — sign in again to save.</span>
            </Transition>
          </div>

          <div v-if="currentUser">
            <div class="mb-1 text-xs text-slate-500">{{ currentUser.email }}</div>
            <ProfileForm :user="currentUser" :saving="profileSaving" @save="onProfileSave" />
            <button
              v-if="profileSaveError"
              @click="loginWithRedirect?.()"
              class="mt-4 text-xs font-medium text-[#2D95FC] hover:underline"
            >
              Sign in again
            </button>
          </div>
          <div v-else-if="profileLoadFailed" class="py-6 text-sm text-slate-400">
            Couldn't load your profile — your session may have expired.
            <button
              @click="loginWithRedirect?.()"
              class="ml-1 font-medium text-[#2D95FC] hover:underline"
            >
              Sign in again
            </button>
          </div>
          <div v-else class="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        </div>

        <!-- Labs — experimental features, only functional while signed in -->
        <div class="rounded-xl border border-slate-700/50 bg-slate-900/50 p-6">
          <h2 class="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-400">Labs</h2>
          <p class="mb-5 text-xs text-slate-500">
            Experimental features. Buggy, browser-specific, and not guaranteed to stick around.
          </p>

          <label class="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              v-model="experiments.rayMarcherLab"
              class="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-800 text-[#2D95FC] focus:ring-[#2D95FC] focus:ring-offset-0"
            />
            <span>
              <span class="block text-sm font-medium text-slate-200">Ray marcher: audio visualizer &amp; sessions</span>
              <span class="block text-xs text-slate-500">
                Adds a music player, mic/tab audio capture, and multiplayer rooms to
                <NuxtLink to="/sandbox/raymarcher" class="text-[#2D95FC] hover:underline">/sandbox/raymarcher</NuxtLink>.
                Chrome/Edge only; expect glitches.
              </span>
            </span>
          </label>
        </div>

      </div>
    </div>
  </div>
</template>
