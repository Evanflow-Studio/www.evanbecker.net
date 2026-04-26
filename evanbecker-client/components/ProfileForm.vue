<script setup lang="ts">
const props = defineProps<{
  user: Record<string, any>
  saving?: boolean
}>()

const emit = defineEmits<{
  save: [payload: { firstName: string; lastName: string; avatar: string | null }]
  'update:firstName': [value: string]
}>()

const firstName = ref(props.user.firstName ?? '')
watch(firstName, (val) => emit('update:firstName', val))
const lastName  = ref(props.user.lastName  ?? '')
const avatar    = ref<string | null>(props.user.avatar ?? null)
const avatarPreview = ref<string | null>(props.user.avatar ?? null)
const fileInput = ref<HTMLInputElement | null>(null)

function initials() {
  const f = firstName.value?.[0] ?? props.user.firstName?.[0] ?? ''
  const l = lastName.value?.[0]  ?? props.user.lastName?.[0]  ?? ''
  return (f + l).toUpperCase() || '?'
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result as string
    avatar.value = result
    avatarPreview.value = result
  }
  reader.readAsDataURL(file)
}

function resetAvatar() {
  avatar.value = ''        // empty string signals "reset to null" on the API
  avatarPreview.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function submit() {
  if (!firstName.value.trim()) return
  emit('save', {
    firstName: firstName.value.trim(),
    lastName:  lastName.value.trim(),
    avatar:    avatar.value,
  })
}
</script>

<template>
  <form @submit.prevent="submit" class="space-y-5">
    <!-- Avatar -->
    <div class="flex items-center gap-4">
      <div class="relative">
        <img
          v-if="avatarPreview"
          :src="avatarPreview"
          alt="Avatar"
          class="h-16 w-16 rounded-full object-cover border-2 border-slate-300 dark:border-slate-700"
        />
        <div
          v-else
          class="flex h-16 w-16 items-center justify-center rounded-full bg-[#0C65E5] text-lg font-bold text-white border-2 border-slate-300 dark:border-slate-700"
        >
          {{ initials() }}
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onFileChange"
        />
        <button
          type="button"
          class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
          @click="fileInput?.click()"
        >
          Upload photo
        </button>
        <button
          v-if="avatarPreview"
          type="button"
          class="text-left text-xs text-slate-500 transition hover:text-red-600 dark:hover:text-red-400"
          @click="resetAvatar"
        >
          Reset to initials
        </button>
      </div>
    </div>

    <!-- Name fields -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
          First name <span class="text-red-600 dark:text-red-400">*</span>
        </label>
        <input
          v-model="firstName"
          type="text"
          required
          placeholder="First name"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0C65E5] focus:outline-none focus:ring-1 focus:ring-[#0C65E5] dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
        />
      </div>
      <div>
        <label class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">Last name</label>
        <input
          v-model="lastName"
          type="text"
          placeholder="Last name"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0C65E5] focus:outline-none focus:ring-1 focus:ring-[#0C65E5] dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
        />
      </div>
    </div>

    <!-- Submit -->
    <div class="flex justify-end">
      <button
        type="submit"
        :disabled="saving || !firstName.trim()"
        class="inline-flex items-center gap-2 rounded-lg bg-[#0C65E5] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2D95FC] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LoadingSpinner v-if="saving" size="sm" />
        {{ saving ? 'Saving...' : 'Save profile' }}
      </button>
    </div>
  </form>
</template>
