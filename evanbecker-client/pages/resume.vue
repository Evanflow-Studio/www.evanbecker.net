<script setup lang="ts">
import { ref } from 'vue'

const mode = ref<'resume' | 'cv'>('resume')

useSeoMeta({
  title: () => mode.value === 'cv' ? 'CV - Evan Becker' : 'Resume - Evan Becker',
  description: 'Professional resume and CV — software architecture roles, projects, and core stack.',
  ogTitle: () => mode.value === 'cv' ? 'CV - Evan Becker' : 'Resume - Evan Becker',
  ogDescription: 'Professional resume and CV — software architecture roles, projects, and core stack.',
  robots: 'noindex',
})

function printResume() {
  window.print()
}
</script>

<template>
  <div>
    <!-- Top bar (hidden in print) -->
    <div class="mx-auto max-w-3xl px-6 pt-8 print:hidden">
      <div class="flex items-center justify-between">
        <NuxtLink to="/about-me" class="text-sm text-slate-500 transition hover:text-[#0C65E5] dark:text-slate-400 dark:hover:text-[#2D95FC]">
          &larr; Back to About Me
        </NuxtLink>

        <div class="flex items-center gap-3">
          <!-- Resume / CV toggle -->
          <div class="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            <button
              @click="mode = 'resume'"
              :class="[
                'rounded-md px-3 py-1.5 text-xs font-medium transition',
                mode === 'resume'
                  ? 'bg-[#0C65E5] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              ]"
            >
              Resume
            </button>
            <button
              @click="mode = 'cv'"
              :class="[
                'rounded-md px-3 py-1.5 text-xs font-medium transition',
                mode === 'cv'
                  ? 'bg-[#0C65E5] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              ]"
            >
              Full CV
            </button>
          </div>

          <button
            @click="printResume"
            class="inline-flex items-center gap-2 rounded-lg bg-[#0C65E5] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#2D95FC]"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Save as PDF
          </button>
        </div>
      </div>

      <!-- Mode description -->
      <p class="mt-3 text-xs text-slate-400 dark:text-slate-500">
        <template v-if="mode === 'resume'">
          Condensed view — key roles and highlights only.
        </template>
        <template v-else>
          Complete career history including early roles, freelance work, and side projects.
        </template>
      </p>
    </div>

    <!-- Resume content -->
    <div class="resume-page mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0 print:py-0">

      <!-- Header -->
      <header class="border-b border-slate-200 pb-4 dark:border-slate-700 print:border-slate-300">
        <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 print:text-3xl print:text-black">
          Evan Becker
        </h1>
        <p class="mt-1 text-lg text-[#0C65E5] dark:text-[#2D95FC] print:text-slate-600">
          Senior Technical Architect
        </p>
        <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400 print:text-slate-500">
          <span>Milwaukee, WI</span>
          <span class="hidden sm:inline print:inline">&middot;</span>
          <a href="mailto:me@evanbecker.net" class="hover:text-[#0C65E5] dark:hover:text-[#2D95FC] print:no-underline">me@evanbecker.net</a>
          <span class="hidden sm:inline print:inline">&middot;</span>
          <a href="https://www.evanbecker.net" class="hover:text-[#0C65E5] dark:hover:text-[#2D95FC] print:no-underline">evanbecker.net</a>
          <span class="hidden sm:inline print:inline">&middot;</span>
          <a href="https://www.linkedin.com/in/evanbeckerdotnet/" class="hover:text-[#0C65E5] dark:hover:text-[#2D95FC] print:no-underline">linkedin.com/in/evanbeckerdotnet</a>
          <span class="hidden sm:inline print:inline">&middot;</span>
          <a href="https://github.com/evanjbecker" class="hover:text-[#0C65E5] dark:hover:text-[#2D95FC] print:no-underline">github.com/evanjbecker</a>
        </div>
      </header>

      <!-- Summary -->
      <section class="mt-6">
        <h2 class="resume-section-title">Summary</h2>
        <p class="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300 print:text-slate-700">
          Software architect with over a decade of experience designing scalable, evolvable systems across enterprise consulting,
          3D metrology, IoT, and full-stack development. Specializing in .NET/C# architecture, clean design principles,
          and bridging technical execution with business strategy. Experienced across industries including energy, manufacturing,
          chemicals, power generation, and consumer products. Background in applied math, 3D systems, accessibility research, and
          infrastructure automation.
        </p>
      </section>

      <!-- ==================== EXPERIENCE ==================== -->
      <section class="mt-6">
        <h2 class="resume-section-title">Experience</h2>

        <!-- Evanflow LLC -->
        <div class="resume-entry">
          <div class="resume-entry-header">
            <div>
              <h3 class="resume-company">Founder &mdash; Evanflow LLC</h3>
              <p class="resume-location">Milwaukee, WI</p>
            </div>
            <span class="resume-dates">2026 &mdash; Present</span>
          </div>
          <ul class="resume-bullets">
            <li>Building Zeroset, a browser-native SDF/CSG modeling tool for 3D-printing makers, targeting the gap between TinkerCAD/OpenSCAD and Fusion 360/nTop</li>
            <li>Designed the system architecture: command pattern over a scene tree, custom SDF evaluation layer feeding Manifold's LevelSet mesher, content-addressed feature IDs, three-tier deployment (web free, web pro, desktop pro)</li>
            <li>Built a .NET sidecar exposing the geometry pipeline over SignalR and MessagePack, with an integrated MCP server enabling AI-driven CAD via Claude Desktop</li>
            <li class="resume-tech">C#, TypeScript, Vue 3, Three.js, Manifold (WASM + .NET), ASP.NET Core, SignalR, MessagePack, Monaco Editor, MCP</li>
          </ul>
        </div>

        <!-- nvisia -->
        <div class="resume-entry">
          <div class="resume-entry-header">
            <div>
              <h3 class="resume-company">Senior Technical Architect &mdash; nvisia</h3>
              <p class="resume-location">Milwaukee, WI</p>
            </div>
            <span class="resume-dates">2019 &mdash; Present</span>
          </div>
          <ul class="resume-bullets">
            <li>Design and implement enterprise application architectures for clients including Alliant Energy, Milwaukee Tool, Generac, Silgan, and Hydrite Chemical</li>
            <li>Lead architecture for NERC CIP compliance monitoring platform at Alliant Energy, recognized as the organization's highest-priority project of the year</li>
            <li>Contributed to Milwaukee Tool's VIPER platform, an internal product management tool guiding emerging designs through engineering and business milestones across mechanical and electrical teams</li>
            <li>Contributed to Milwaukee Tool's Connect reseller portal, helping architect Oracle integrations to support warranty claims processing, order management, shipping, and email services</li>
            <li>Helped shape Generac's PowerPlay platform, a progressive web application guiding users through generator selection, estimating, and proposal signing</li>
            <li>Architected Silgan's customer support platform for product issue resolution</li>
            <li>Researched and designed an AI architecture at Hydrite Chemical enabling natural language queries against Infor M3 ERP data, integrating Snowflake, Azure Copilot Studio, and MCP servers</li>
            <li>Consult on clean architecture, data strategy, security, and coding principles informed by Uncle Bob, Fowler, Richards, and Ford</li>
            <li>Mentor technical leads through nvisia's internal architect development track and run monthly architectural katas open to all engineers, fostering architectural thinking across the organization</li>
            <li>Host nvisia-sponsored architectural roundtables bringing together architects from other companies to share industry trends, discuss emerging patterns, and compare approaches to common problems</li>
            <li>Contribute to client proposals, RFP responses, and serve as "voice of the customer" for marketing; received and later served on the JEDI Award board</li>
            <li class="resume-tech">C#, .NET, Azure (Copilot Studio, AI Foundry, AI Search, Service Bus, CosmosDB, DevOps), SQL, Oracle, Entity Framework, Dapper, Angular, React, Vue, Kafka, SignalR, Docker, Terraform, MCP</li>
          </ul>
        </div>

        <!-- Mitutoyo -->
        <div class="resume-entry">
          <div class="resume-entry-header">
            <div>
              <h3 class="resume-company">Software Engineer &mdash; Micro Encoder Inc (now Mitutoyo-RDA)</h3>
              <p class="resume-location">Kirkland, WA</p>
            </div>
            <span class="resume-dates">Aug 2018 &mdash; 2019</span>
          </div>
          <ul class="resume-bullets">
            <li>Developed software for CNC coordinate-measuring machines (CMMs) and Vision Measuring Machines as part of the MiCAT Planner and MCOSMOS product suite</li>
            <li>Built the 3D scene framework including engine, renderer, model importing, and view development using HOOPS Visualize</li>
            <li>Implemented algorithmic path generation and collision detection for metrology inspection workflows in aerospace manufacturing</li>
            <li>Served as DevOps engineer during staff absences, including a global leadership role for build and release infrastructure</li>
            <li class="resume-tech">C#, .NET Framework/Core/Standard, C++, HOOPS, WPF, Prism, Unity Container, Docker, TFS, MSBuild, PowerShell</li>
          </ul>
        </div>

        <!-- Stack41 -->
        <div class="resume-entry">
          <div class="resume-entry-header">
            <div>
              <h3 class="resume-company">Software Engineer &mdash; Stack41 / Caravela IoT</h3>
              <p class="resume-location">Milwaukee, WI</p>
            </div>
            <span class="resume-dates">Jan 2018 &mdash; Aug 2018</span>
          </div>
          <ul class="resume-bullets">
            <li>Built web dashboard for DCaaS clients to access and control VMs, including direct SSH access through VNC</li>
            <li>Worked on virtualization, cloud routing, data analysis, machine learning, and data center infrastructure</li>
            <li>Circuit design and prototyping for IoT sensor networks</li>
            <li class="resume-tech">Python, Docker, JavaScript, PHP, NGINX, Proxmox, noVNC, PostgreSQL, Unix/BSD</li>
          </ul>
        </div>

        <!-- UWM -->
        <div class="resume-entry">
          <div class="resume-entry-header">
            <div>
              <h3 class="resume-company">Software Engineer &mdash; University of Wisconsin-Milwaukee</h3>
              <p class="resume-location">Milwaukee, WI</p>
            </div>
            <span class="resume-dates">Jan 2016 &mdash; Jan 2018</span>
          </div>
          <ul class="resume-bullets">
            <li>Co-researcher with Professor Jacques du Plessis on an audio-based language learning tool for visually impaired users</li>
            <li>Full-stack development of REST APIs, web application, and React Native mobile app emphasizing accessibility-first UX</li>
            <li>Received 6 consecutive SURF (Support for Undergraduate Research Fellows) research grants from Spring 2016 through Fall 2017</li>
            <li class="resume-tech">JavaScript, Node.js, React Native, PHP, Python, MySQL, Apache, Unix/Bash, Git</li>
          </ul>
        </div>

      </section>

      <!-- ==================== SKILLS ==================== -->
      <section class="mt-6">
        <h2 class="resume-section-title">Skills</h2>
        <div class="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300 print:text-slate-700">
          <p><span class="resume-skill-label">Languages:</span> C#, TypeScript/JavaScript, Python, SQL, C++, PHP, HTML/CSS, Bash</p>
          <p><span class="resume-skill-label">Frameworks:</span> .NET 10, ASP.NET Core, Entity Framework Core, Vue/Nuxt, React, WPF, Prism</p>
          <p><span class="resume-skill-label">Infrastructure:</span> Docker, Proxmox, Traefik, NGINX, Cloudflare, GitHub Actions, CI/CD pipelines</p>
          <p><span class="resume-skill-label">Data:</span> PostgreSQL, MySQL, SQL Server, Entity Framework, REST API design, data modeling</p>
          <p><span class="resume-skill-label">Architecture:</span> Clean architecture, domain-driven design, microservices, event-driven systems, CQRS</p>
          <p><span class="resume-skill-label">Other:</span> 3D graphics (HOOPS, OpenGL), Auth0/OAuth, Azure AI/Copilot Studio, MCP, Agile/Disciplined Agile Delivery</p>
        </div>
      </section>

      <!-- ==================== EDUCATION ==================== -->
      <section class="mt-6">
        <h2 class="resume-section-title">Education</h2>
        <div class="resume-entry">
          <div class="resume-entry-header">
            <div>
              <h3 class="resume-company">University of Wisconsin-Milwaukee</h3>
              <p class="resume-location">B.S. Computer Science</p>
            </div>
            <span class="resume-dates">Spring 2018</span>
          </div>
        </div>
      </section>

      <!-- ==================== HONORS ==================== -->
      <section class="mt-6">
        <h2 class="resume-section-title">Honors &amp; Awards</h2>
        <div class="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300 print:text-slate-700">
          <p><span class="font-semibold text-slate-800 dark:text-slate-100 print:text-slate-800">JEDI Award</span> &mdash; nvisia</p>
          <p><span class="font-semibold text-slate-800 dark:text-slate-100 print:text-slate-800">SURF Research Grants (6x)</span> &mdash; UW-Milwaukee, Spring 2016 through Fall 2017</p>
        </div>
      </section>

      <!-- ==================== CV-ONLY: PROJECTS ==================== -->
      <section v-if="mode === 'cv'" class="mt-6">
        <h2 class="resume-section-title">Projects &amp; Freelance</h2>

        <div class="resume-entry">
          <div class="resume-entry-header">
            <h3 class="resume-company">evanbecker.net</h3>
            <span class="resume-dates">2023 &mdash; Present</span>
          </div>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400 print:text-slate-600">
            Personal portfolio and blog built with Nuxt 3, .NET 10, PostgreSQL, and Docker, self-hosted on a Proxmox homelab
            with Traefik reverse proxy, Cloudflare Tunnel, Infisical secrets management, and CI/CD via GitHub Actions on a
            self-hosted runner.
          </p>
        </div>

        <div class="resume-entry">
          <div class="resume-entry-header">
            <h3 class="resume-company">Ray Marching Renderer</h3>
            <span class="resume-dates">2019</span>
          </div>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400 print:text-slate-600">
            A sphere tracer built using Unity, OpenGL, and WebGL to explore fractals and geometrical rendering strategies.
          </p>
        </div>

        <div class="resume-entry">
          <div class="resume-entry-header">
            <h3 class="resume-company">Tower Defense Game</h3>
            <span class="resume-dates">2018</span>
          </div>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400 print:text-slate-600">
            Tower defense video game written in Unreal Engine 4 and C++.
          </p>
        </div>

        <div class="resume-entry">
          <div class="resume-entry-header">
            <h3 class="resume-company">TheRyanLawOffice.com</h3>
            <span class="resume-dates">2017</span>
          </div>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400 print:text-slate-600">
            Freelance website design for a law firm in Brookfield, Wisconsin.
          </p>
        </div>

        <div class="resume-entry">
          <div class="resume-entry-header">
            <h3 class="resume-company">Kinder Morgan Inventory Tracker</h3>
            <span class="resume-dates">2016</span>
          </div>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400 print:text-slate-600">
            Inventory tracking application for operators to monitor status and improve data reliability.
          </p>
        </div>

        <div class="resume-entry">
          <div class="resume-entry-header">
            <div>
              <h3 class="resume-company">CAD Designer &amp; Web Developer &mdash; PRO-CAST, INC</h3>
              <p class="resume-location">Brookfield, WI</p>
            </div>
            <span class="resume-dates">2014 &mdash; 2016</span>
          </div>
          <ul class="resume-bullets">
            <li>Created CAD models for approximately 150 cast products across the company's full product catalog</li>
            <li>Designed and built 2 e-commerce websites including product photography, editing, and content management</li>
            <li>Handled marketing and data analysis for online sales channels</li>
            <li class="resume-tech">Autodesk, WordPress, Bootstrap, Adobe Suite, HTML/CSS</li>
          </ul>
        </div>

        <!-- High School -->
        <p class="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">High School</p>

        <div class="resume-entry">
          <div class="resume-entry-header">
            <h3 class="resume-company">Limelight Amplification</h3>
            <span class="resume-dates">2013 &mdash; 2014</span>
          </div>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400 print:text-slate-600">
            Engineering and CAD design for guitar amplifier chassis, manufactured in bulk at Wisconsin Metal Parts.
          </p>
        </div>

        <div class="resume-entry">
          <div class="resume-entry-header">
            <h3 class="resume-company">Trippy Flappy</h3>
            <span class="resume-dates">2014</span>
          </div>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400 print:text-slate-600">
            First published mobile application &mdash; a Flappy Birds clone.
          </p>
        </div>

        <div class="resume-entry">
          <div class="resume-entry-header">
            <h3 class="resume-company">Canine Cupids</h3>
            <span class="resume-dates">2013</span>
          </div>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400 print:text-slate-600">
            Volunteer website update for a dog rescue and home shelter in Milwaukee.
          </p>
        </div>
      </section>

      <!-- ==================== CV-ONLY: ORGANIZATIONS ==================== -->
      <section v-if="mode === 'cv'" class="mt-6">
        <h2 class="resume-section-title">Organizations</h2>
        <div class="resume-entry">
          <div class="resume-entry-header">
            <div>
              <h3 class="resume-company">eSports Milwaukee (formerly Summoner Society)</h3>
              <p class="resume-location">Officer / Admin</p>
            </div>
            <span class="resume-dates">Feb 2015 &mdash; Jan 2017</span>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
.resume-section-title {
  @apply text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-50 border-b border-slate-200 dark:border-slate-700 pb-1;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

.resume-entry {
  @apply mt-4;
}

.resume-entry-header {
  @apply flex justify-between items-baseline gap-4;
}

.resume-company {
  @apply text-sm font-semibold text-slate-800 dark:text-slate-100;
}

.resume-location {
  @apply text-sm text-slate-500 dark:text-slate-400;
}

.resume-dates {
  @apply text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap;
}

.resume-bullets {
  @apply mt-1.5 ml-4 list-disc space-y-0.5 text-sm text-slate-700 dark:text-slate-300;
}

.resume-tech {
  @apply text-slate-500 dark:text-slate-400 italic list-none -ml-4;
}

.resume-skill-label {
  @apply font-semibold text-slate-800 dark:text-slate-100;
}

/* Print styles */
@media print {
  .resume-section-title {
    @apply text-black border-slate-300;
  }
  .resume-company {
    @apply text-black;
  }
  .resume-location,
  .resume-dates {
    @apply text-slate-600;
  }
  .resume-bullets {
    @apply text-slate-700;
  }
  .resume-tech {
    @apply text-slate-500;
  }
  .resume-skill-label {
    @apply text-slate-800;
  }
  .resume-page {
    font-size: 11pt;
    line-height: 1.4;
  }
}
</style>
