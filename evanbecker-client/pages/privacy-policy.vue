<script setup lang="ts">
useHead({ title: 'Privacy Policy - Evan Becker' })
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
    <header>
      <p class="text-sm font-medium text-slate-400 dark:text-slate-500">
        Last updated: April 2026
      </p>
      <h1 class="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
        Privacy Policy
      </h1>
      <p class="mt-4 text-base text-slate-600 dark:text-slate-400">
        This is a personal site. I run it. I don't sell anything, run ads, or
        track you across the web. The bits below cover what does happen.
      </p>
    </header>

    <div class="prose dark:prose-invert mt-10 max-w-none">
      <h2>What I collect</h2>
      <p>
        Only what you give me directly:
      </p>
      <ul>
        <li>
          <strong>Contact form.</strong> Name, email, phone (if you fill it in),
          and the message itself. Used to reply to you.
        </li>
        <li>
          <strong>Comments.</strong> If you sign in to comment on a blog post,
          I store your comment text along with the name and avatar from your
          identity provider. Comments are public.
        </li>
        <li>
          <strong>Newsletter.</strong> Just your email address, if you sign up.
          Unsubscribe at any time.
        </li>
        <li>
          <strong>Account profile.</strong> If you sign in, I store the first
          name, last name, and avatar associated with your account so the site
          can show them next to your comments.
        </li>
      </ul>

      <h2>Third parties</h2>
      <p>
        A few external services touch your data when you use parts of the site:
      </p>
      <ul>
        <li>
          <strong>Auth0</strong> handles sign-in. If you log in, Auth0 sees
          your email and whatever your identity provider (Google, GitHub, etc.)
          shares with it. I never see your password.
        </li>
        <li>
          <strong>Google reCAPTCHA</strong> runs on the contact form to keep
          spam out. Google's privacy terms apply to that interaction.
        </li>
        <li>
          <strong>Google Fonts</strong> serves the typefaces this site uses.
          Loading a font issues a request to Google's servers.
        </li>
      </ul>
      <p>
        Aside from those, nothing else. No analytics, no tag managers, no
        third-party tracking scripts.
      </p>

      <h2>Browser storage</h2>
      <p>
        The site uses your browser's <code>localStorage</code> to remember
        you're signed in and to keep small UI preferences (e.g. opt-in to
        experimental features). Clearing site data in your browser wipes all
        of it.
      </p>

      <h2>Where the data lives</h2>
      <p>
        Comments, newsletter emails, and contact-form messages are stored on
        a server I run myself in a Proxmox homelab. The server isn't shared
        with anyone, and the data isn't synced to any cloud provider.
      </p>

      <h2>Retention</h2>
      <p>
        Contact-form messages stick around as long as I find them useful for
        following up. Newsletter emails stay until you unsubscribe. Comments
        and account profile data stay until you ask me to delete them, or
        until I shut the site down.
      </p>

      <h2>Your rights</h2>
      <p>
        Email me and ask. I'll delete your data, hand back what I have on
        you, or correct anything inaccurate. There's no portal for this
        because there's not enough volume to justify building one.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests:
        <a href="mailto:me@evanbecker.net">me@evanbecker.net</a>.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes, the "Last updated" date at the top changes too.
        Material changes that affect existing users will be flagged in the
        newsletter.
      </p>
    </div>
  </div>
</template>
