<script setup lang="ts">
import { ref } from 'vue'

useHead({ title: 'About Me - Evan Becker' })

/* ── newsletter ─────────────────────────────────────────────────── */
const config = useRuntimeConfig()
const newsletterEmail = ref('')
const newsletterSubmitting = ref(false)
const newsletterDone = ref(false)
const newsletterError = ref('')

async function submitNewsletter() {
  newsletterSubmitting.value = true
  newsletterError.value = ''
  try {
    await $fetch(`${config.public.apiUrl}api/v1/newsletter`, {
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

/* ── social links ───────────────────────────────────────────────── */
const socialLinks = [
  { href: 'https://www.linkedin.com/in/evanbeckerdotnet/', label: 'LinkedIn', icon: 'linkedin' },
  { href: 'https://gitlab.com/evanbecker', label: 'GitLab', icon: 'gitlab' },
  { href: 'https://github.com/evanjbecker', label: 'GitHub', icon: 'github' },
  { href: 'mailto:me@evanbecker.net', label: 'me@evanbecker.net', icon: 'mail' },
]
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-12 sm:py-20 lg:px-8">

    <!-- ────────── HERO: small photo + headline + social ────────── -->
    <div class="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
      <img
        src="~/assets/images/custom/evan-becker.png"
        alt="Evan Becker"
        class="h-24 w-24 flex-none rounded-2xl bg-slate-200 object-cover shadow-lg ring-1 ring-slate-900/10 dark:bg-slate-800 dark:ring-white/10 sm:h-28 sm:w-28"
      />
      <div class="min-w-0">
        <h1 class="font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
          I'm Evan Becker, a Milwaukee-based software architect<br class="hidden sm:block" />
          who deals with the <span class="text-[#0C65E5] dark:text-[#2D95FC]">-ilities</span>.
        </h1>
        <div class="mt-4 flex flex-wrap items-center gap-4">
          <a
            v-for="link in socialLinks"
            :key="link.href"
            :href="link.href"
            :target="link.href.startsWith('mailto') ? undefined : '_blank'"
            class="group inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-[#0C65E5] dark:text-slate-400 dark:hover:text-[#2D95FC]"
          >
            <IconLinkedIn v-if="link.icon === 'linkedin'" class="h-4 w-4" />
            <IconGitLab v-if="link.icon === 'gitlab'" class="h-4 w-4" />
            <IconGitHub v-if="link.icon === 'github'" class="h-4 w-4" />
            <svg v-if="link.icon === 'mail'" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M6 5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6Zm.245 2.187a.75.75 0 0 0-.99 1.126l6.25 5.5a.75.75 0 0 0 .99 0l6.25-5.5a.75.75 0 0 0-.99-1.126L12 12.251 6.245 7.187Z" />
            </svg>
            {{ link.label }}
          </a>
        </div>
      </div>
    </div>

    <!-- ────────── MAIN: two columns ────────────────────────────── -->
    <div class="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-16">

      <!-- LEFT: Timeline visualization -->
      <div class="order-2 lg:order-1 lg:col-span-1">
        <h2 class="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Career Timeline
        </h2>
        <div class="sticky top-24">
          <CareerTimeline />
        </div>
      </div>

      <!-- RIGHT: Narrative bio -->
      <div class="order-1 lg:order-2 lg:col-span-2">
        <div class="space-y-8 text-base leading-relaxed text-slate-700 dark:text-slate-300">

          <!-- The hook: what I do now -->
          <div data-section-id="nvisia">
            <h2 class="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Now</h2>
            <p>
              I work as a Senior Technical Architect at
              <a href="https://www.nvisia.com/" class="link-underline">nvisia</a>,
              where I help enterprises design systems that hold up — not just today, but through
              the next rewrite someone tries to avoid. That means clean architecture, data strategy,
              security, and the kind of coding principles that keep a codebase navigable at scale.
            </p>
            <p class="mt-4">
              The clients range from
              <a href="https://www.alliantenergy.com/" class="link-underline">Alliant Energy</a>
              (where I led architecture for a NERC CIP compliance platform that became their
              highest-priority project of the year) to
              <a href="https://www.milwaukeetool.com/" class="link-underline">Milwaukee Tool</a>
              (where I contributed to both their internal VIPER product management tool and the
              Connect reseller portal), to
              <a href="https://www.generac.com/" class="link-underline">Generac</a>,
              <a href="https://www.silgan.com/" class="link-underline">Silgan</a>, and
              <a href="https://www.hydrite.com/" class="link-underline">Hydrite Chemical</a>,
              where I recently designed an AI architecture for natural language queries against ERP data.
            </p>
          </div>

          <!-- The origin: why precision matters to me -->
          <div data-section-id="mitutoyo">
            <h2 class="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">How I got here</h2>
            <p>
              The -ilities aren't something I picked up from a book. They came from working in domains
              where imprecision fails people.
            </p>
            <p class="mt-4">
              At <a href="https://www.mitutoyo.com/" class="link-underline">Mitutoyo</a>, I developed
              software for coordinate-measuring machines used in aerospace manufacturing — building the
              3D scene framework, renderer, and collision detection system in
              <a href="https://www.mitutoyo.com/micat-planner/" class="link-underline">MiCAT Planner</a>.
              When your software guides a probe across a turbine blade to validate tolerances measured in
              microns, "mostly works" isn't an option. That experience permanently changed how I think
              about reliability.
            </p>
            <p class="mt-4">
              Before that, at a startup called Stack41 (later acquired by
              <a href="https://www.potawatomi.com/" class="link-underline">Potawatomi</a>'s
              <a href="https://dataholdings.com/" class="link-underline">Data Holdings</a>),
              I built a DCaaS dashboard where clients could control virtual machines and access them
              directly through the browser via noVNC. IoT sensor networks, circuit prototyping, bare-metal
              Proxmox — the kind of work where you're as close to the hardware as the software.
            </p>
            <p class="mt-4">
              And it started at UW-Milwaukee, where I co-researched an audio-based language tool for
              visually impaired learners with Professor
              <a href="https://jacquesduplessis.com/cv/" class="link-underline">Jacques du Plessis</a>.
              Six consecutive research grants. That project taught me something I still believe: the best
              interfaces disappear. They just work.
            </p>
          </div>

          <!-- What I believe -->
          <div data-section-id="uwm">
            <h2 class="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">What I believe</h2>
            <p>
              Good architecture is the cheapest long-term investment a team can make. The people who
              shaped how I think about this —
              <a href="https://en.wikipedia.org/wiki/Robert_C._Martin" class="link-underline">Robert C. Martin</a>,
              <a href="https://en.wikipedia.org/wiki/Martin_Fowler_(software_engineer)" class="link-underline">Martin Fowler</a>,
              <a href="https://developertoarchitect.com/mark-richards.html" class="link-underline">Mark Richards</a>,
              <a href="https://nealford.com/" class="link-underline">Neal Ford</a> — all converge on the
              same idea: the goal isn't to build the most sophisticated system. It's to build the most
              evolvable one.
            </p>
            <p class="mt-4">
              Outside client work, I mentor architects through nvisia's internal development track,
              run monthly architectural katas, and host cross-company roundtables where architects from
              different organizations compare approaches to real problems. I also explore AI applications
              — most recently MCP servers and Copilot Studio — to help clients think about what's next
              without chasing what's merely new.
            </p>
          </div>
        </div>

        <!-- ── Newsletter + Resume links ── -->
        <div class="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <!-- Newsletter -->
          <div class="rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
            <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <svg class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M6 5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6Zm.245 2.187a.75.75 0 0 0-.99 1.126l6.25 5.5a.75.75 0 0 0 .99 0l6.25-5.5a.75.75 0 0 0-.99-1.126L12 12.251 6.245 7.187Z" />
              </svg>
              Stay up to date
            </h3>
            <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Get notified when I publish something new.
            </p>
            <div v-if="newsletterDone" class="mt-3 text-sm font-medium text-[#0C65E5] dark:text-[#2D95FC]">
              {{ newsletterError === 'already' ? 'You\'re already subscribed!' : 'You\'re subscribed!' }}
            </div>
            <form v-else @submit.prevent="submitNewsletter" class="mt-3 flex gap-2">
              <input
                v-model="newsletterEmail"
                type="email"
                placeholder="Email address"
                required
                :disabled="newsletterSubmitting"
                class="min-w-0 flex-auto rounded-lg border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2D95FC] focus:ring-1 focus:ring-[#2D95FC] disabled:opacity-50 dark:border-slate-600 dark:bg-[#1E293B] dark:text-slate-200 dark:placeholder:text-slate-500"
              />
              <button
                type="submit"
                :disabled="newsletterSubmitting"
                class="rounded-lg bg-[#0C65E5] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#2D95FC] disabled:opacity-60"
              >
                {{ newsletterSubmitting ? '...' : 'Join' }}
              </button>
            </form>
            <p v-if="newsletterError && newsletterError !== 'already'" class="mt-1.5 text-xs text-red-400">{{ newsletterError }}</p>
          </div>

          <!-- Resume link -->
          <div class="flex flex-col justify-between rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
            <div>
              <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <svg class="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                  <path fill-rule="evenodd" d="M7.5 5.25a3 3 0 0 1 3-3h3a3 3 0 0 1 3 3v.205c.933.085 1.857.197 2.774.334 1.454.218 2.476 1.483 2.476 2.917v3.033c0 1.211-.734 2.352-1.936 2.752A24.726 24.726 0 0 1 12 15.75c-2.73 0-5.357-.442-7.814-1.259-1.202-.4-1.936-1.541-1.936-2.752V8.706c0-1.434 1.022-2.7 2.476-2.917A48.814 48.814 0 0 1 7.5 5.455V5.25ZM13.5 4.5h-3a1.5 1.5 0 0 0-1.5 1.5v.054a48.997 48.997 0 0 1 6 0V6a1.5 1.5 0 0 0-1.5-1.5Zm-5.25 9.233a47.472 47.472 0 0 0 3.75.363v1.154a.75.75 0 0 0 1.5 0v-1.154c1.267-.058 2.52-.18 3.75-.363v2.967a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3v-2.967Z" clip-rule="evenodd" />
                </svg>
                Resume &amp; CV
              </h3>
              <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Full work history with a printable PDF export.
              </p>
            </div>
            <NuxtLink
              to="/resume"
              class="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              View Resume
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
