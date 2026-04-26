<script setup lang="ts">
import { ref } from 'vue'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import { EllipsisVerticalIcon } from '@heroicons/vue/24/solid'

const props = defineProps<{
  comment: any
  currentUser: any
  targetLocation: string
  parentComment?: any
  isChild?: boolean
}>()

const emit = defineEmits<{
  updated: []
}>()

const { fetchWithAuth } = useApi()
const showReply = ref(false)
const replyText = ref('')
const posting = ref(false)
const localComment = ref(props.comment)

const canModerate = computed(() => {
  if (!props.currentUser) return false
  return (
    props.currentUser.id === localComment.value?.author?.id ||
    props.currentUser.isAdmin ||
    props.currentUser.isOwner
  )
})

async function deleteComment() {
  try {
    await fetchWithAuth(`comment/${localComment.value.id}`, { method: 'DELETE' })
    emit('updated')
  } catch (e) {
    console.error('Failed to delete:', e)
  }
}

async function addReply() {
  if (!replyText.value.trim() || posting.value) return
  const replyToId = props.isChild ? props.parentComment?.id : localComment.value.id
  posting.value = true
  try {
    await fetchWithAuth(`comment/${props.targetLocation}/reply/${replyToId}`, {
      method: 'POST',
      body: JSON.stringify({ commentText: replyText.value }),
    })
    replyText.value = ''
    showReply.value = false
    // SignalR broadcasts the reply back; CommentSection's onNewReply adds it.
    // For child replies the parent hub event is still keyed by parentComment.id.
  } catch (e) {
    console.error('Failed to reply:', e)
  } finally {
    posting.value = false
  }
}

function relativeDate(dateStr: string | undefined) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function initials(author: any) {
  const first = author?.firstName?.[0] ?? ''
  const last = author?.lastName?.[0] ?? ''
  return (first + last).toUpperCase() || '?'
}
</script>

<template>
  <div v-if="localComment?.author" :class="isChild ? 'ml-6 lg:ml-12' : ''">
    <article
      :class="[
        'rounded-xl p-4 text-base',
        localComment.author.isAdmin || localComment.author.isOwner
          ? 'bg-blue-50 dark:bg-[#0C65E5]/10'
          : 'bg-slate-100 dark:bg-[#1E293B]',
      ]"
    >
      <footer class="mb-2 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <img
            v-if="localComment.author.avatar"
            :src="localComment.author.avatar"
            :alt="localComment.author.firstName"
            class="h-7 w-7 rounded-full"
          />
          <div
            v-else
            class="flex h-7 w-7 items-center justify-center rounded-full bg-[#0C65E5] text-xs font-bold text-white"
          >
            {{ initials(localComment.author) }}
          </div>
          <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {{ localComment.author.firstName }} {{ localComment.author.lastName }}
          </span>
          <span
            v-if="localComment.published"
            :title="new Date(localComment.published).toLocaleString()"
            class="text-xs text-slate-400 dark:text-slate-500"
          >
            {{ relativeDate(localComment.published) }}
          </span>
        </div>

        <Menu v-if="canModerate" as="div" class="relative">
          <MenuButton class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <EllipsisVerticalIcon class="h-5 w-5" />
          </MenuButton>
          <transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
          >
            <MenuItems class="absolute right-0 z-10 mt-2 w-32 rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <MenuItem v-slot="{ active }">
                <button
                  @click="deleteComment"
                  :class="[active ? 'bg-slate-100 dark:bg-slate-700' : '', 'block w-full px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-300']"
                >
                  Delete
                </button>
              </MenuItem>
            </MenuItems>
          </transition>
        </Menu>
      </footer>

      <p class="text-slate-600 dark:text-slate-400">{{ localComment.commentText }}</p>

      <button
        @click="showReply = !showReply"
        class="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-[#0C65E5] dark:hover:text-[#2D95FC]"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 20 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 5h5M5 8h2m6-3h2m-5 3h6m2-7H2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3v5l5-5h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1Z" />
        </svg>
        Reply
      </button>
    </article>

    <!-- Reply form -->
    <div v-if="showReply" class="mt-3 ml-6 lg:ml-12">
      <div class="mb-3 rounded-xl border border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-[#1E293B]">
        <textarea
          v-model="replyText"
          rows="3"
          class="w-full resize-none border-0 bg-transparent px-0 text-sm text-slate-800 placeholder-slate-400 focus:ring-0 focus:outline-none dark:text-slate-200 dark:placeholder-slate-500"
          :placeholder="isChild ? `@${localComment.author.firstName} ` : 'Write a reply...'"
          required
        />
      </div>
      <button
        @click="addReply"
        :disabled="posting"
        class="inline-flex items-center gap-2 rounded-lg bg-[#0C65E5] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#2D95FC] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <LoadingSpinner v-if="posting" size="sm" />
        {{ posting ? 'Posting...' : 'Post reply' }}
      </button>
    </div>

    <!-- Nested replies -->
    <div v-if="!isChild && localComment.replies?.length > 0" class="mt-2 space-y-2">
      <CommentItem
        v-for="reply in localComment.replies"
        :key="reply.id"
        :comment="reply"
        :current-user="currentUser"
        :target-location="targetLocation"
        :parent-comment="localComment"
        is-child
        @updated="$emit('updated')"
      />
    </div>
  </div>
</template>
