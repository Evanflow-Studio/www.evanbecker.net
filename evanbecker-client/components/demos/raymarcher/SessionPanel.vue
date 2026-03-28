<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useSessionHub } from '~/composables/raymarcher/audio/useSessionHub'

const session = useSessionHub()
const currentUser = useCurrentUser()

const joinCode = ref('')
const chatInput = ref('')
const chatContainer = ref<HTMLElement | null>(null)
const creating = ref(false)
const joining = ref(false)
const copied = ref(false)

const emit = defineEmits<{ close: [] }>()

const isAuthenticated = computed(() => !!currentUser.value)
const displayName = computed(() => {
  if (!currentUser.value) return ''
  return `${currentUser.value.firstName ?? ''}${currentUser.value.lastName ? ` ${currentUser.value.lastName}` : ''}`.trim()
})

async function handleCreate() {
  creating.value = true
  await session.createRoom()
  creating.value = false
}

async function handleJoin() {
  if (!joinCode.value.trim()) return
  joining.value = true
  await session.joinRoom(joinCode.value.trim())
  joining.value = false
  joinCode.value = ''
}

async function handleLeave() {
  await session.leaveRoom()
}

function handleSendChat() {
  if (!chatInput.value.trim()) return
  session.sendChat(chatInput.value)
  chatInput.value = ''
}

const myReadyState = computed(() => {
  const user = currentUser.value as any
  if (!user?.id) return false
  const me = session.members.value.find(m => m.userId === user.id)
  return me?.isReady ?? false
})

function toggleReady() {
  session.setReady(!myReadyState.value)
}

function copyCode() {
  navigator.clipboard.writeText(session.roomCode.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

// Auto-scroll chat
watch(() => session.chatMessages.value.length, async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed left-4 top-16 bottom-20 z-40 flex w-72 flex-col rounded-xl border border-slate-700/50 bg-black/85 text-slate-200 shadow-2xl backdrop-blur-md">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-700/50 px-3 py-2">
        <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {{ session.isConnected.value ? 'Jam Session' : 'Sessions' }}
        </span>
        <button class="text-slate-500 transition hover:text-slate-300" @click="emit('close')">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Not authenticated -->
      <div v-if="!isAuthenticated" class="flex flex-1 items-center justify-center p-4">
        <p class="text-center text-xs text-slate-500">Sign in to create or join a session</p>
      </div>

      <!-- Not in a session -->
      <div v-else-if="!session.isConnected.value" class="flex flex-col gap-3 p-3">
        <button
          :disabled="creating"
          class="rounded-lg bg-[#0C65E5] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#2D95FC] disabled:opacity-50"
          @click="handleCreate"
        >
          {{ creating ? 'Creating...' : 'Create Session' }}
        </button>

        <div class="flex items-center gap-1.5">
          <div class="h-px flex-1 bg-slate-700/50" />
          <span class="text-[9px] uppercase tracking-wider text-slate-600">or join</span>
          <div class="h-px flex-1 bg-slate-700/50" />
        </div>

        <form class="flex gap-1.5" @submit.prevent="handleJoin">
          <input
            v-model="joinCode"
            type="text"
            maxlength="6"
            placeholder="Room code"
            class="flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-center font-mono text-xs uppercase text-slate-200 placeholder-slate-600 focus:border-[#2D95FC] focus:outline-none"
          />
          <button
            type="submit"
            :disabled="joining || !joinCode.trim()"
            class="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-600 disabled:opacity-50"
          >
            {{ joining ? '...' : 'Join' }}
          </button>
        </form>

        <p v-if="session.error.value" class="text-[10px] text-red-400">{{ session.error.value }}</p>
      </div>

      <!-- In a session -->
      <template v-else>
        <!-- Room code bar -->
        <div class="flex items-center gap-2 border-b border-slate-700/50 px-3 py-2">
          <button
            class="rounded-md bg-slate-800 px-2 py-1 font-mono text-xs font-bold tracking-widest text-[#2D95FC] transition hover:bg-slate-700"
            :title="copied ? 'Copied!' : 'Click to copy'"
            @click="copyCode"
          >
            {{ session.roomCode.value }}
          </button>
          <span v-if="copied" class="text-[9px] text-green-400">Copied!</span>
          <span class="ml-auto text-[9px] text-slate-500">{{ session.members.value.length }} member{{ session.members.value.length !== 1 ? 's' : '' }}</span>
          <button
            class="text-[9px] text-red-400 transition hover:text-red-300"
            @click="handleLeave"
          >
            Leave
          </button>
        </div>

        <!-- Host disconnected warning -->
        <div v-if="session.hostDisconnectedCountdown.value > 0" class="bg-red-500/10 px-3 py-1.5 text-[10px] text-red-400">
          Host disconnected — room closing in {{ session.hostDisconnectedCountdown.value }}s
        </div>

        <!-- Members -->
        <div class="border-b border-slate-700/50 px-3 py-2">
          <div
            v-for="member in session.members.value"
            :key="member.userId"
            class="flex items-center gap-2 py-0.5"
          >
            <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[8px] font-bold text-slate-300">
              <img v-if="member.avatar" :src="member.avatar" class="h-5 w-5 rounded-full object-cover" />
              <span v-else>{{ (member.firstName?.[0] ?? '?').toUpperCase() }}</span>
            </div>
            <span class="flex-1 truncate text-[10px]" :class="member.isHost ? 'font-semibold text-[#2D95FC]' : 'text-slate-400'">
              {{ member.firstName }}{{ member.lastName ? ` ${member.lastName}` : '' }}
              <span v-if="member.isHost" class="ml-1">👑</span>
            </span>
            <!-- Ready indicator -->
            <span v-if="member.isReady" class="text-[10px] text-green-400" title="Ready">✓</span>
            <span v-else class="text-[10px] text-slate-600" title="Not ready">○</span>
            <button
              v-if="session.isHost.value && !member.isHost"
              class="text-[9px] text-slate-600 transition hover:text-red-400"
              title="Kick"
              @click="session.kickMember(member.userId)"
            >
              ✕
            </button>
          </div>

          <!-- Ready up button (non-hosts) -->
          <button
            v-if="!session.isHost.value"
            class="mt-2 w-full rounded-md px-2 py-1 text-[10px] font-medium transition"
            :class="myReadyState
              ? 'bg-green-500/15 text-green-400 border border-green-500/40'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
            @click="toggleReady"
          >
            {{ myReadyState ? '✓ Ready' : 'Ready Up' }}
          </button>
        </div>

        <!-- Chat -->
        <div ref="chatContainer" class="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
          <div v-if="!session.chatMessages.value.length" class="flex h-full items-center justify-center">
            <p class="text-[9px] text-slate-600">No messages yet</p>
          </div>
          <div v-for="(msg, i) in session.chatMessages.value" :key="i" class="py-0.5">
            <span class="text-[9px] font-semibold" :class="msg.senderName === displayName ? 'text-[#2D95FC]' : 'text-slate-400'">
              {{ msg.senderName }}:
            </span>
            <span class="text-[9px] text-slate-300"> {{ msg.content }}</span>
          </div>
        </div>

        <!-- Chat input -->
        <form class="flex gap-1.5 border-t border-slate-700/50 p-2" @submit.prevent="handleSendChat">
          <input
            v-model="chatInput"
            type="text"
            maxlength="500"
            placeholder="Type a message..."
            class="flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-200 placeholder-slate-600 focus:border-[#2D95FC] focus:outline-none"
          />
          <button
            type="submit"
            :disabled="!chatInput.trim()"
            class="rounded-md bg-slate-700 px-2 py-1 text-[10px] text-slate-300 transition hover:bg-slate-600 disabled:opacity-50"
          >
            Send
          </button>
        </form>

        <!-- Error -->
        <p v-if="session.error.value" class="px-3 pb-2 text-[9px] text-red-400">{{ session.error.value }}</p>
      </template>
    </div>
  </Teleport>
</template>
