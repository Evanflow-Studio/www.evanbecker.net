<script setup lang="ts">
definePageMeta({ ssr: false })
useHead({ title: 'Account - Evan Becker' })

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

      </div>
    </div>
  </div>
</template>
