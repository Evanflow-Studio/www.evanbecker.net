<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { fetchWithAuth, fetchPublic } = useApi()
const route = useRoute()

const comments = ref<any[] | null>(null)
const currentUser = ref<any>(null)
const commentText = ref('')
const posting = ref(false)

const targetLocation = computed(() => {
  const parts = route.path.split('/')
  return parts[parts.length - 1]
})

async function loadComments() {
  try {
    comments.value = await fetchPublic(`comment/${targetLocation.value}`)
  } catch (e) {
    console.error('Failed to load comments:', e)
    comments.value = []
  }
}

async function loadUser() {
  try {
    currentUser.value = await fetchWithAuth('user')
  } catch {
    // Not authenticated
  }
}

async function addComment() {
  if (!commentText.value.trim() || posting.value) return
  posting.value = true
  try {
    const added = await fetchWithAuth(`comment/${targetLocation.value}`, {
      method: 'POST',
      body: JSON.stringify({ commentText: commentText.value }),
    })
    comments.value = [...(comments.value || []), added]
    commentText.value = ''
  } catch (e) {
    console.error('Failed to post comment:', e)
  } finally {
    posting.value = false
  }
}

onMounted(() => {
  loadUser()
  loadComments()
})
</script>

<template>
  <section class="py-8 lg:py-16">
    <div class="mx-auto max-w-2xl">
      <h2 class="mb-6 text-lg font-bold text-slate-800 dark:text-slate-200 lg:text-2xl">
        Leave a comment!
      </h2>

      <form @submit.prevent="addComment" class="mb-8">
        <div class="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-[#1E293B]">
          <label for="comment" class="sr-only">Your comment</label>
          <textarea
            id="comment"
            v-model="commentText"
            rows="4"
            class="w-full resize-none border-0 bg-transparent px-0 text-sm text-slate-800 placeholder-slate-400 focus:ring-0 focus:outline-none dark:text-slate-200 dark:placeholder-slate-500"
            placeholder="Write a comment..."
            required
          />
        </div>
        <button
          type="submit"
          :disabled="posting"
          class="inline-flex items-center gap-2 rounded-lg bg-[#0C65E5] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2D95FC] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <LoadingSpinner v-if="posting" size="sm" />
          {{ posting ? 'Posting...' : 'Post comment' }}
        </button>
      </form>

      <div v-if="comments && comments.length > 0" class="space-y-4">
        <CommentItem
          v-for="comment in comments"
          :key="comment.id"
          :comment="comment"
          :current-user="currentUser"
          :target-location="targetLocation"
          @updated="loadComments"
        />
      </div>

      <div v-else-if="comments === null" class="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>

      <p v-else class="py-4 text-sm text-slate-400 dark:text-slate-500">
        No comments yet. Be the first!
      </p>
    </div>
  </section>
</template>
