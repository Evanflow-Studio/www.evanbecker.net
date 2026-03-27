<script setup lang="ts">
const currentUser = useCurrentUser()
const needsProfileSetup = useNeedsProfileSetup()
const { fetchWithAuth } = useApi()

const saving = ref(false)

// firstName is tracked here so we know whether to allow closing
const firstName = ref(currentUser.value?.firstName ?? '')

watch(() => currentUser.value?.firstName, (val) => {
  if (val) firstName.value = val
})

const canClose = computed(() => !!firstName.value.trim())

async function onSave(payload: { firstName: string; lastName: string; avatar: string | null }) {
  saving.value = true
  try {
    const updated = await fetchWithAuth('user', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    currentUser.value = updated
    needsProfileSetup.value = false
  } catch (e) {
    console.error('Failed to update profile:', e)
  } finally {
    saving.value = false
  }
}

function tryClose() {
  if (canClose.value) needsProfileSetup.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="needsProfileSetup" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop — only clickable if they have a first name -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          :class="canClose ? 'cursor-pointer' : 'cursor-not-allowed'"
          @click="tryClose"
        />

        <!-- Modal -->
        <div class="relative w-full max-w-md rounded-2xl border border-slate-700/50 bg-[#0F172A] p-6 shadow-2xl">
          <!-- Close button (only shown when firstName is filled) -->
          <button
            v-if="canClose"
            type="button"
            class="absolute right-4 top-4 text-slate-500 transition hover:text-slate-300"
            @click="tryClose"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <div class="mb-5">
            <h2 class="text-lg font-semibold text-white">Complete your profile</h2>
            <p class="mt-1 text-sm text-slate-400">
              Add your name so others can recognise you in comments.
              <span class="text-red-400">A first name is required to continue.</span>
            </p>
          </div>

          <ProfileForm
            :user="currentUser ?? {}"
            :saving="saving"
            @save="onSave"
            @update:firstName="firstName = $event"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
