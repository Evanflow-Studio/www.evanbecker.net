<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/16/solid'

const tabs = [
  { name: 'Alliant Energy' },
  { name: 'Milwaukee Tool' },
  { name: 'Generac' },
  { name: 'Silgan' },
  { name: 'Internal' },
]

const selectedTab = ref(tabs[0])

function switchTab(tab: typeof tabs[0]) {
  selectedTab.value = tab
}
</script>

<template>
  <div class="pb-5 sm:pb-0">
    <h3 class="pb-2 text-base font-semibold text-slate-800 dark:text-slate-100">
      Client Highlights
    </h3>

    <!-- Mobile select -->
    <div class="relative mt-3 grid grid-cols-1 sm:hidden">
      <select
        :value="selectedTab.name"
        @change="switchTab(tabs.find(t => t.name === ($event.target as HTMLSelectElement).value)!)"
        class="col-start-1 row-start-1 w-full appearance-none rounded-lg border-slate-300 bg-white py-2 pr-8 pl-3 text-slate-800 dark:border-slate-600 dark:bg-[#1E293B] dark:text-slate-200"
        aria-label="Select a client"
      >
        <option v-for="tab in tabs" :key="tab.name">{{ tab.name }}</option>
      </select>
      <ChevronDownIcon class="pointer-events-none col-start-1 row-start-1 mr-2 h-5 w-5 self-center justify-self-end text-slate-400" />
    </div>

    <!-- Desktop tabs -->
    <div class="mt-4 hidden sm:block">
      <nav class="-mb-px flex space-x-6">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          @click="switchTab(tab)"
          :class="[
            'border-b-2 px-1 pb-3 text-sm font-medium transition whitespace-nowrap',
            selectedTab.name === tab.name
              ? 'border-[#0C65E5] text-[#0C65E5] dark:border-[#2D95FC] dark:text-[#2D95FC]'
              : 'border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:hover:text-slate-300',
          ]"
        >
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- Tab content -->
    <div class="mt-4 text-slate-600 dark:text-slate-400">
      <p v-if="selectedTab.name === 'Alliant Energy'">
        I helped design the architecture for monitoring servers and devices to support
        <a href="https://www.nerc.com/standards/reliability-standards/cip" class="link-underline">NERC CIP</a>
        compliance. The system collected detailed information, including OS and hardware specs, open ports, running processes,
        and installed software versions. This initiative was recognized internally at Alliant as the highest-priority project
        of the year, reflecting its importance to the organization's security and compliance efforts.
      </p>
      <p v-else-if="selectedTab.name === 'Milwaukee Tool'">
        I contributed to the VIPER project, an internal platform integrating product design lifecycles across teams.
        The tool has been described as a "mini Azure DevOps" for mechanical and electrical engineers, connecting
        engineering work with business and financial milestones. Later, I supported ongoing VIPER and
        <a href="https://www.stiletto.com/" class="link-underline">Stiletto</a>
        initiatives before transitioning to the Connect project, which serves as the primary portal for Milwaukee Tool
        resellers, enabling order placement, warranty management, and other business processes.
      </p>
      <p v-else-if="selectedTab.name === 'Generac'">
        I helped design and develop the
        <a href="https://www.youtube.com/watch?v=8_9UBvhhBKE" class="link-underline">PowerPlay</a>
        platform, a progressive web application guiding users through generator selection, estimating, planning,
        and signing proposals.
      </p>
      <p v-else-if="selectedTab.name === 'Silgan'">
        I architected and developed their customer support platform, enabling customers to log in and receive
        assistance with a variety of product-related issues.
      </p>
      <p v-else-if="selectedTab.name === 'Internal'">
        At nvisia, my work extends past architecture and development. I've contributed to shaping client proposals
        and responses to RFPs, served as a "voice of the customer" for our marketing team, and participated on the
        <a href="https://www.linkedin.com/posts/dnhenry_maythe4thbewithyou-activity-6927640270729580544-VczN/" class="link-underline">JEDI Award</a>
        board after receiving the award myself. I also focus on exploring AI applications and emerging technologies
        to help our clients innovate.
      </p>
    </div>
  </div>
</template>
