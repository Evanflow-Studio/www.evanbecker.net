<script setup lang="ts">
import {
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  ComputerDesktopIcon,
} from '@heroicons/vue/24/outline'

const config = useRuntimeConfig()

useSeoMeta({
  title: 'Contact - Evan Becker',
  description: 'Get in touch — email, contact form, or social. I respond to most messages within a day or two.',
  ogTitle: 'Contact - Evan Becker',
  ogDescription: 'Get in touch — email, contact form, or social. I respond to most messages within a day or two.',
  twitterTitle: 'Contact - Evan Becker',
  twitterDescription: 'Get in touch — email, contact form, or social.',
})

useHead({
  script: config.public.recaptchaSiteKey
    ? [{ src: `https://www.google.com/recaptcha/api.js?render=${config.public.recaptchaSiteKey}`, async: true }]
    : [],
})

const router = useRouter()
const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  message: '',
})
const loading = ref(false)
const errorMsg = ref('')

async function getRecaptchaToken(): Promise<string> {
  const siteKey = config.public.recaptchaSiteKey
  if (!siteKey) return ''
  await new Promise<void>((resolve) => {
    if (window.grecaptcha?.ready) {
      window.grecaptcha.ready(() => resolve())
    } else {
      resolve()
    }
  })
  return window.grecaptcha?.execute(siteKey, { action: 'contact' }) ?? ''
}

async function submitContact() {
  loading.value = true
  errorMsg.value = ''
  try {
    const recaptchaToken = await getRecaptchaToken()
    const apiBase = config.public.apiUrl?.replace(/\/$/, '') || ''
    const res = await fetch(`${apiBase}/api/v1/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, recaptchaToken }),
      mode: 'cors',
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      errorMsg.value = data.error || 'Failed to send message. Please try again.'
      return
    }
    router.push('/thank-you-message')
  } catch (e) {
    console.error('Failed to send message:', e)
    errorMsg.value = 'Failed to send message. Please try again.'
  } finally {
    loading.value = false
  }
}

const contactOptions = [
  {
    icon: ChatBubbleLeftRightIcon,
    title: 'Leave Comment',
    description: 'Register and login using Auth0. Once logged in, you can leave comments on my blog posts.',
    cta: { label: 'Blog', href: '/articles' },
  },
  {
    icon: EnvelopeIcon,
    title: 'Send Email',
    description: 'I check my email at me@evanbecker.net quite frequently. Feel free to send me an email whenever!',
    cta: { label: 'Send an email', href: 'mailto:me@evanbecker.net' },
  },
  {
    icon: ComputerDesktopIcon,
    title: 'Contact Form',
    description: "Fill out the form below. I'll get back to you as soon as I can.",
  },
]
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
    <div class="grid grid-cols-1 gap-16 lg:grid-cols-2">
      <!-- Left: Contact options -->
      <div>
        <h1 class="font-serif text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
          Get in touch
        </h1>
        <p class="mt-4 text-lg text-slate-500 dark:text-slate-400">
          Throw me a message, and I'll see it
          <span class="text-xs">(eventually)</span>.
        </p>

        <div class="mt-16 space-y-12">
          <div v-for="option in contactOptions" :key="option.title" class="flex gap-5">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0C65E5]">
              <component :is="option.icon" class="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">
                {{ option.title }}
              </h3>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {{ option.description }}
              </p>
              <NuxtLink
                v-if="option.cta"
                :to="option.cta.href"
                class="mt-3 inline-block text-sm font-semibold text-[#0C65E5] dark:text-[#2D95FC]"
              >
                {{ option.cta.label }} &rarr;
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Form -->
      <form @submit.prevent="submitContact" class="lg:pt-8">
        <div class="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <div>
            <label for="first-name" class="block text-sm font-medium text-slate-700 dark:text-slate-300">First name</label>
            <input
              id="first-name"
              v-model="form.firstName"
              type="text"
              autocomplete="given-name"
              class="mt-1.5 block w-full rounded-xl border-slate-300 bg-white px-4 py-2.5 text-slate-800 shadow-sm focus:border-[#2D95FC] focus:ring-1 focus:ring-[#2D95FC] dark:border-slate-600 dark:bg-[#1E293B] dark:text-slate-200"
            />
          </div>
          <div>
            <label for="last-name" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Last name</label>
            <input
              id="last-name"
              v-model="form.lastName"
              type="text"
              autocomplete="family-name"
              class="mt-1.5 block w-full rounded-xl border-slate-300 bg-white px-4 py-2.5 text-slate-800 shadow-sm focus:border-[#2D95FC] focus:ring-1 focus:ring-[#2D95FC] dark:border-slate-600 dark:bg-[#1E293B] dark:text-slate-200"
            />
          </div>
          <div class="sm:col-span-2">
            <label for="email" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              class="mt-1.5 block w-full rounded-xl border-slate-300 bg-white px-4 py-2.5 text-slate-800 shadow-sm focus:border-[#2D95FC] focus:ring-1 focus:ring-[#2D95FC] dark:border-slate-600 dark:bg-[#1E293B] dark:text-slate-200"
            />
          </div>
          <div class="sm:col-span-2">
            <label for="phone" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone number</label>
            <input
              id="phone"
              v-model="form.phoneNumber"
              type="tel"
              autocomplete="tel"
              class="mt-1.5 block w-full rounded-xl border-slate-300 bg-white px-4 py-2.5 text-slate-800 shadow-sm focus:border-[#2D95FC] focus:ring-1 focus:ring-[#2D95FC] dark:border-slate-600 dark:bg-[#1E293B] dark:text-slate-200"
            />
          </div>
          <div class="sm:col-span-2">
            <label for="message" class="block text-sm font-medium text-slate-700 dark:text-slate-300">Message</label>
            <textarea
              id="message"
              v-model="form.message"
              rows="5"
              class="mt-1.5 block w-full rounded-xl border-slate-300 bg-white px-4 py-2.5 text-slate-800 shadow-sm focus:border-[#2D95FC] focus:ring-1 focus:ring-[#2D95FC] dark:border-slate-600 dark:bg-[#1E293B] dark:text-slate-200"
            />
          </div>
        </div>
        <div v-if="errorMsg" class="sm:col-span-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {{ errorMsg }}
        </div>
        <div class="mt-6 flex justify-end">
          <button
            type="submit"
            :disabled="loading"
            class="rounded-xl bg-[#0C65E5] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2D95FC] disabled:opacity-50"
          >
            {{ loading ? 'Sending...' : 'Send message' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
