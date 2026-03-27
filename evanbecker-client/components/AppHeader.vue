<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
} from '@headlessui/vue'

const config = useRuntimeConfig()
const currentUser = useCurrentUser()
const needsProfileSetup = useNeedsProfileSetup()
const isScrolled = ref(false)
const auth0Available = ref(false)
const isAuthenticated = ref(false)
const isLoading = ref(true)
let loginWithRedirect: (() => void) | null = null
let logout: (() => void) | null = null

let syncInProgress = false
async function syncUserToApi(auth0User: any, getToken: () => Promise<string>) {
  if (syncInProgress) return
  syncInProgress = true
  console.log('[Auth] syncUserToApi called, auth0User:', auth0User)
  try {
    const token = await getToken()
    const baseUrl = config.public.apiUrl?.replace(/\/$/, '') || ''
    const nameParts = (auth0User?.name || '').split(' ')
    console.log('[Auth] POSTing to:', `${baseUrl}/api/v1/user`)
    const res = await fetch(`${baseUrl}/api/v1/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        firstName: nameParts[0] || null,
        lastName: nameParts.slice(1).join(' ') || null,
        email: auth0User?.email || null,
      }),
      mode: 'cors',
    })
    console.log('[Auth] sync response status:', res.status)
    if (res.ok) {
      currentUser.value = await res.json()
      if (res.status === 201) {
        console.log('[Auth] new user created, showing profile setup modal')
        needsProfileSetup.value = true
      }
    }
  } catch (e) {
    console.warn('[Auth] Failed to sync user to API:', e)
  } finally {
    syncInProgress = false
  }
}

// Auth0 setup — must happen in synchronous setup scope because useAuth0()
// calls inject() which doesn't work inside onMounted/async callbacks.
// On the server (SSR), skip entirely. On the client, the auth0.client.ts
// plugin may or may not have installed Auth0 (depends on config).
if (import.meta.client) {
  try {
    const { useAuth0 } = await import('@auth0/auth0-vue')
    const auth0 = useAuth0()
    auth0Available.value = true
    isAuthenticated.value = auth0.isAuthenticated.value
    isLoading.value = auth0.isLoading.value
    loginWithRedirect = () => auth0.loginWithRedirect()
    logout = () => {
      currentUser.value = null
      auth0.logout({ logoutParams: { returnTo: window.location.origin } })
    }

    // Fire sync once Auth0 finishes loading — user and isAuthenticated are both settled at this point
    watch(() => auth0.isLoading.value, async (loading: boolean) => {
      isLoading.value = loading
      isAuthenticated.value = auth0.isAuthenticated.value
      console.log('[Auth] isLoading:', loading, 'isAuthenticated:', auth0.isAuthenticated.value, 'user:', auth0.user.value)
      if (!loading && auth0.isAuthenticated.value && auth0.user.value) {
        await syncUserToApi(auth0.user.value, auth0.getAccessTokenSilently)
      }
    })

    // Also watch isAuthenticated in case it changes after initial load (e.g. login redirect)
    watch(() => auth0.isAuthenticated.value, async (val: boolean) => {
      isAuthenticated.value = val
      if (val && !auth0.isLoading.value && auth0.user.value) {
        await syncUserToApi(auth0.user.value, auth0.getAccessTokenSilently)
      }
    })

    // Already settled on mount (no loading state change will fire)
    if (!auth0.isLoading.value && auth0.isAuthenticated.value && auth0.user.value) {
      syncUserToApi(auth0.user.value, auth0.getAccessTokenSilently)
    }
  } catch {
    auth0Available.value = false
    isLoading.value = false
  }
} else {
  isLoading.value = false
}

function userInitials() {
  const first = currentUser.value?.firstName?.[0] ?? ''
  const last = currentUser.value?.lastName?.[0] ?? ''
  return (first + last).toUpperCase() || '?'
}

onMounted(() => {
  function onScroll() {
    isScrolled.value = window.scrollY > 0
  }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  onUnmounted(() => window.removeEventListener('scroll', onScroll))
})

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about-me', label: 'About Me' },
  { href: '/contact', label: 'Contact' },
  { href: '/articles', label: 'Blog' },
]
</script>

<template>
  <ClientOnly>
    <ProfileSetupModal />
  </ClientOnly>
  <header
    class="sticky top-0 z-50 px-4 transition duration-500 sm:px-6 lg:px-8"
    :class="isScrolled
      ? 'bg-slate-50/90 shadow-sm backdrop-blur dark:bg-[#0B1120]/90'
      : 'bg-transparent'"
  >
    <div class="mx-auto max-w-7xl">
      <nav class="relative z-50 flex items-center justify-between py-4">
        <!-- Logo -->
        <NuxtLink to="/" aria-label="Home" class="text-[#0C65E5] dark:text-[#2D95FC]">
          <AppLogo class="h-16 w-auto" />
        </NuxtLink>

        <!-- Desktop Nav -->
        <div class="hidden items-center gap-x-8 md:flex">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.href"
            :to="link.href"
            class="text-sm font-medium text-slate-500 transition hover:text-[#0C65E5] dark:text-slate-400 dark:hover:text-[#41A5F7]"
            active-class="text-[#0C65E5] dark:text-[#2D95FC]"
          >
            {{ link.label }}
          </NuxtLink>
        </div>

        <!-- Auth + Mobile -->
        <div class="flex items-center gap-x-4">
          <ClientOnly>
            <!-- Authenticated user menu -->
            <template v-if="auth0Available && isAuthenticated">
              <Menu as="div" class="relative">
                <MenuButton class="flex items-center gap-2 rounded-full ring-2 ring-slate-200 transition hover:ring-[#2D95FC] dark:ring-slate-700 px-1">
                  <img
                    v-if="currentUser?.avatar"
                    :src="currentUser.avatar"
                    alt="Profile"
                    class="h-8 w-8 rounded-full"
                  />
                  <div
                    v-else
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-[#0C65E5] text-xs font-bold text-white"
                  >
                    {{ userInitials() }}
                  </div>
                </MenuButton>
                <transition
                  enter-active-class="transition duration-100 ease-out"
                  enter-from-class="transform scale-95 opacity-0"
                  enter-to-class="transform scale-100 opacity-100"
                  leave-active-class="transition duration-75 ease-in"
                  leave-from-class="transform scale-100 opacity-100"
                  leave-to-class="transform scale-95 opacity-0"
                >
                  <MenuItems class="absolute right-0 z-10 mt-2 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                    <MenuItem v-slot="{ active }">
                      <NuxtLink
                        to="/account"
                        :class="[active ? 'bg-slate-100 dark:bg-slate-700' : '', 'block w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300']"
                      >
                        Account
                      </NuxtLink>
                    </MenuItem>
                    <MenuItem v-slot="{ active }">
                      <button
                        @click="logout?.()"
                        :class="[active ? 'bg-slate-100 dark:bg-slate-700' : '', 'block w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300']"
                      >
                        Sign out
                      </button>
                    </MenuItem>
                  </MenuItems>
                </transition>
              </Menu>
            </template>

            <!-- Sign In button -->
            <button
              v-else-if="auth0Available && !isAuthenticated"
              @click="loginWithRedirect?.()"
              class="rounded-lg bg-[#0C65E5] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2D95FC]"
            >
              Sign In
            </button>
          </ClientOnly>

          <!-- Color mode toggle -->
          <ColorModeToggle />

          <!-- Mobile menu -->
          <Popover class="md:hidden">
            <PopoverButton class="flex h-8 w-8 items-center justify-center text-slate-600 dark:text-slate-400" aria-label="Menu">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </PopoverButton>
            <transition
              enter-active-class="duration-150 ease-out"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="duration-100 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <PopoverPanel class="absolute inset-x-4 top-full mt-4 rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                <nav class="space-y-4">
                  <NuxtLink
                    v-for="link in navLinks"
                    :key="link.href"
                    :to="link.href"
                    class="block text-base font-medium text-slate-700 dark:text-slate-300"
                  >
                    {{ link.label }}
                  </NuxtLink>
                  <hr class="border-slate-200 dark:border-slate-700" />
                  <button
                    v-if="auth0Available && !isLoading && isAuthenticated"
                    @click="logout?.()"
                    class="block w-full text-left text-base font-medium text-slate-700 dark:text-slate-300"
                  >
                    Sign out
                  </button>
                  <button
                    v-else-if="auth0Available && !isLoading"
                    @click="loginWithRedirect?.()"
                    class="block w-full text-left text-base font-medium text-[#0C65E5] dark:text-[#2D95FC]"
                  >
                    Sign In
                  </button>
                </nav>
              </PopoverPanel>
            </transition>
          </Popover>
        </div>
      </nav>
    </div>
  </header>
</template>
