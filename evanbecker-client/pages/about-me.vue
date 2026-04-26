<script setup lang="ts">
import { ref } from 'vue'
import nvisiaLogo from '~/assets/images/logos/nvisia_logo.jpg'
import mitutoyoLogo from '~/assets/images/logos/mitutoyorda_logo.jpg'
import stack41Logo from '~/assets/images/logos/Stack41.png'
import uwmLogo from '~/assets/images/logos/uwm_logo.jpg'

useHead({ title: 'About Me - Evan Becker' })

const resume = [
  {
    company: 'nvisia',
    title: 'Senior Technical Architect',
    logo: nvisiaLogo,
    abbr: 'NV',
    start: '2019',
    end: 'Present',
  },
  {
    company: 'Mitutoyo-RDA',
    title: 'Software Engineer',
    logo: mitutoyoLogo,
    abbr: 'MI',
    start: '2018',
    end: '2019',
  },
  {
    company: 'Stack41 / Caravela IoT',
    title: 'Software Engineer',
    logo: stack41Logo,
    abbr: 'S4',
    start: '2018',
    end: '2018',
  },
  {
    company: 'UW-Milwaukee',
    title: 'Software Engineer (Undergraduate Research)',
    logo: uwmLogo,
    abbr: 'UW',
    start: '2016',
    end: '2018',
  },
]

// Only falls back to initials if the image actually fails to load.
const logoLoaded = ref<Record<string, boolean | undefined>>({})

const config = useRuntimeConfig()
const newsletterEmail = ref('')
const newsletterSubmitting = ref(false)
const newsletterDone = ref(false)
const newsletterError = ref('')

async function submitNewsletter() {
  newsletterSubmitting.value = true
  newsletterError.value = ''
  try {
    const apiUrl = (config.public.apiUrl as string).replace(/\/$/, '')
    await $fetch(`${apiUrl}/api/v1/newsletter`, {
      method: 'POST',
      body: { emailAddress: newsletterEmail.value },
    })
    newsletterDone.value = true
  } catch (err: any) {
    if (err?.response?.status === 409) {
      newsletterDone.value = true
      newsletterError.value = 'already'
    } else {
      newsletterError.value = 'Something went wrong. Please try again.'
    }
  } finally {
    newsletterSubmitting.value = false
  }
}

const socialLinks = [
  { href: 'https://www.linkedin.com/in/evanbeckerdotnet/', label: 'Follow on LinkedIn', icon: 'linkedin' },
  { href: 'https://gitlab.com/evanbecker', label: 'Follow on GitLab', icon: 'gitlab' },
  { href: 'https://github.com/evanjbecker', label: 'Follow on GitHub', icon: 'github' },
  { href: 'mailto:me@evanbecker.net', label: 'me@evanbecker.net', icon: 'mail' },
]
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
    <div class="grid grid-cols-1 gap-y-16 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-8">
      <!-- Portrait -->
      <div class="lg:pr-8 lg:pl-12">
        <div class="max-w-xs lg:max-w-none">
          <img
            src="~/assets/images/custom/evan-becker.png"
            alt="Evan Becker"
            class="aspect-square rotate-2 rounded-2xl bg-slate-200 object-cover shadow-xl dark:bg-slate-800"
          />
        </div>
      </div>

      <!-- Bio -->
      <div class="lg:order-first lg:row-span-2">
        <h1 class="font-serif text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
          I'm Evan Becker, a MKE-based software architect who deals with the -ilities.
        </h1>

        <div class="mt-8 space-y-6 text-base leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            I help enterprises design scalable, evolvable systems that deliver real value. I work as a
            Senior Technical Architect at
            <a href="https://www.nvisia.com/" class="link-underline">nvisia</a>,
            consulting on clean architecture, data strategy, security, and coding principles.
          </p>
          <p>
            Outside of client work, I run Evanflow LLC, the company behind my own software products.
            I'm currently building Zeroset, a browser-native modeling tool for 3D printing makers
            that brings SDF lattice operations and code-as-source-of-truth design to a market that
            has had to choose between toy editors and enterprise software.
          </p>
          <p>
            I tend to prefer object-oriented languages, with C# in the .NET ecosystem being my primary focus.
            My approach to software design is influenced by established architectural and engineering principles,
            particularly those championed by
            <a href="https://en.wikipedia.org/wiki/Robert_C._Martin" class="link-underline">Robert C. Martin</a>,
            <a href="https://en.wikipedia.org/wiki/Martin_Fowler_(software_engineer)" class="link-underline">Martin Fowler</a>,
            <a href="https://developertoarchitect.com/mark-richards.html" class="link-underline">Mark Richards</a>, and
            <a href="https://nealford.com/" class="link-underline">Neal Ford</a>.
            I also draw from PMI's Disciplined Agile Delivery when thinking about how teams plan and execute work.
          </p>
          <p>
            I enjoy combining 3D systems and applied math. At
            <a href="https://www.mitutoyo.com/" class="link-underline">Mitutoyo</a>,
            I worked on the
            <a href="https://www.mitutoyo.com/micat-planner/" class="link-underline">MiCAT Planner</a> and
            <a href="https://www.mitutoyo.com/mcosmos/" class="link-underline">MCOSMOS</a>
            product suite, developing a scene-tree framework utilizing HOOPS Visualize, along with algorithmic
            path generation and collision detection for
            <a href="https://en.wikipedia.org/wiki/Coordinate-measuring_machine" class="link-underline">coordinate-measuring machines</a>
            (CMMs). The software supports
            <a href="https://en.wikipedia.org/wiki/Metrology" class="link-underline">metrology</a>
            inspection workflows used across aerospace and space-adjacent manufacturing, where components are
            designed, measured, and validated against extremely tight tolerances.
          </p>
          <p>
            I've always enjoyed working on networks. Early in my career, I spent a short but formative period
            at a startup that was later acquired by
            <a href="https://www.potawatomi.com/" class="link-underline">Potawatomi</a>'s
            <a href="https://dataholdings.com/" class="link-underline">Data Holdings</a>.
            The work combined electrical engineering, IoT, data science, and Data Center as a Service (DCaaS)
            offerings at a time when these ideas were well understood, but the ecosystem around them was still
            taking shape.
          </p>
          <p>
            As an undergraduate at UW-Milwaukee, I worked as a co-researcher with Professor
            <a href="https://jacquesduplessis.com/cv/" class="link-underline">Jacques du Plessis</a>
            on an audio-based language tool designed to help visually impaired learners acquire new languages.
            Our work explored different accessibility-focused interfaces, emphasizing an audio-first approach
            to make learning more intuitive and inclusive.
          </p>

          <AboutMeHighlights />
        </div>
      </div>

      <!-- Sidebar -->
      <div class="lg:pl-12">
        <!-- Social links -->
        <ul class="space-y-3">
          <li v-for="link in socialLinks" :key="link.href">
            <a
              :href="link.href"
              :target="link.href.startsWith('mailto') ? undefined : '_blank'"
              class="group flex items-center gap-3 text-sm font-medium text-slate-600 transition hover:text-[#0C65E5] dark:text-slate-400 dark:hover:text-[#2D95FC]"
            >
              <IconLinkedIn v-if="link.icon === 'linkedin'" class="h-5 w-5 text-slate-400 transition group-hover:text-[#0C65E5] dark:group-hover:text-[#2D95FC]" />
              <IconGitLab v-if="link.icon === 'gitlab'" class="h-5 w-5 text-slate-400 transition group-hover:text-[#0C65E5] dark:group-hover:text-[#2D95FC]" />
              <IconGitHub v-if="link.icon === 'github'" class="h-5 w-5 text-slate-400 transition group-hover:text-[#0C65E5] dark:group-hover:text-[#2D95FC]" />
              <svg v-if="link.icon === 'mail'" class="h-5 w-5 text-slate-400 transition group-hover:text-[#0C65E5] dark:group-hover:text-[#2D95FC]" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M6 5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6Zm.245 2.187a.75.75 0 0 0-.99 1.126l6.25 5.5a.75.75 0 0 0 .99 0l6.25-5.5a.75.75 0 0 0-.99-1.126L12 12.251 6.245 7.187Z" />
              </svg>
              {{ link.label }}
            </a>
          </li>
        </ul>

        <!-- Newsletter -->
        <div class="mt-10 rounded-2xl border border-slate-200 p-6 dark:border-slate-700">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <svg class="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M6 5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6Zm.245 2.187a.75.75 0 0 0-.99 1.126l6.25 5.5a.75.75 0 0 0 .99 0l6.25-5.5a.75.75 0 0 0-.99-1.126L12 12.251 6.245 7.187Z" />
            </svg>
            Stay up to date
          </h2>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Get notified when I publish something new, and unsubscribe at any time.
          </p>
          <div v-if="newsletterDone" class="mt-4 text-sm font-medium text-[#0C65E5] dark:text-[#2D95FC]">
            {{ newsletterError === 'already' ? 'You\'re already subscribed!' : 'You\'re subscribed! Thanks for signing up.' }}
          </div>
          <form v-else @submit.prevent="submitNewsletter" class="mt-4 flex gap-3">
            <input
              v-model="newsletterEmail"
              type="email"
              placeholder="Email address"
              required
              :disabled="newsletterSubmitting"
              class="min-w-0 flex-auto rounded-lg border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2D95FC] focus:ring-1 focus:ring-[#2D95FC] disabled:opacity-50 dark:border-slate-600 dark:bg-[#1E293B] dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-[#2D95FC]"
            />
            <button
              type="submit"
              :disabled="newsletterSubmitting"
              class="rounded-lg bg-[#0C65E5] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2D95FC] disabled:opacity-60"
            >
              {{ newsletterSubmitting ? '...' : 'Join' }}
            </button>
          </form>
          <p v-if="newsletterError && newsletterError !== 'already'" class="mt-2 text-xs text-red-400">{{ newsletterError }}</p>
        </div>

        <!-- Resume -->
        <div class="mt-8 rounded-2xl border border-slate-200 p-6 dark:border-slate-700">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <svg class="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M7.5 5.25a3 3 0 0 1 3-3h3a3 3 0 0 1 3 3v.205c.933.085 1.857.197 2.774.334 1.454.218 2.476 1.483 2.476 2.917v3.033c0 1.211-.734 2.352-1.936 2.752A24.726 24.726 0 0 1 12 15.75c-2.73 0-5.357-.442-7.814-1.259-1.202-.4-1.936-1.541-1.936-2.752V8.706c0-1.434 1.022-2.7 2.476-2.917A48.814 48.814 0 0 1 7.5 5.455V5.25ZM13.5 4.5h-3a1.5 1.5 0 0 0-1.5 1.5v.054a48.997 48.997 0 0 1 6 0V6a1.5 1.5 0 0 0-1.5-1.5Zm-5.25 9.233a47.472 47.472 0 0 0 3.75.363v1.154a.75.75 0 0 0 1.5 0v-1.154c1.267-.058 2.52-.18 3.75-.363v2.967a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3v-2.967Z" clip-rule="evenodd" />
            </svg>
            Work
          </h2>
          <ol class="mt-6 space-y-4">
            <li v-for="role in resume" :key="role.company" class="flex gap-4">
              <div class="flex h-12 w-12 flex-none items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <img
                  v-if="logoLoaded[role.company] !== false"
                  :src="role.logo"
                  :alt="role.company"
                  class="h-8 w-8 rounded-full bg-white p-0.5"
                  @error="logoLoaded[role.company] = false"
                />
                <span v-else class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ role.abbr }}</span>
              </div>
              <dl class="flex flex-auto flex-wrap gap-x-2">
                <dd class="w-full text-sm font-medium text-slate-800 dark:text-slate-100">{{ role.company }}</dd>
                <dd class="text-xs text-slate-600 dark:text-slate-400">{{ role.title }}</dd>
                <dd class="ml-auto text-xs text-slate-400 dark:text-slate-500">
                  {{ role.start }} &mdash; {{ role.end }}
                </dd>
              </dl>
            </li>
          </ol>
          <NuxtLink
            to="/resume"
            class="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Resume
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
