import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'
import forms from '@tailwindcss/forms'

export default {
  darkMode: 'class',
  content: [
    './components/**/*.{vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.ts',
    './plugins/**/*.ts',
    './app.vue',
    './content/**/*.md',
  ],
  theme: {
    extend: {
      colors: {
        // Dark mode background — deep navy-black that picks up logo blue hue
        'dark-bg': '#0B1120',
        'dark-surface': '#1E293B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Source Serif 4', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      typography: ({ theme }: { theme: (path: string) => string }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.slate.700'),
            '--tw-prose-headings': theme('colors.slate.900'),
            '--tw-prose-links': '#0C65E5',
            '--tw-prose-bold': theme('colors.slate.900'),
            '--tw-prose-code': theme('colors.slate.800'),
            '--tw-prose-pre-bg': theme('colors.slate.100'),
            '--tw-prose-pre-code': theme('colors.slate.800'),
            '--tw-prose-quotes': theme('colors.slate.700'),
            '--tw-prose-quote-borders': '#2D95FC',
            a: {
              color: '#0C65E5',
              textDecoration: 'underline',
              textDecorationColor: '#0C65E540',
              textUnderlineOffset: '3px',
              '&:hover': {
                color: '#2D95FC',
                textDecorationColor: '#2D95FC',
              },
            },
          },
        },
        invert: {
          css: {
            '--tw-prose-body': theme('colors.slate.300'),
            '--tw-prose-headings': theme('colors.slate.50'),
            '--tw-prose-links': '#2D95FC',
            '--tw-prose-bold': theme('colors.slate.100'),
            '--tw-prose-code': theme('colors.slate.200'),
            '--tw-prose-pre-bg': '#0B1120',
            '--tw-prose-pre-code': theme('colors.slate.300'),
            '--tw-prose-quotes': theme('colors.slate.400'),
            '--tw-prose-quote-borders': '#41A5F7',
          },
        },
      }),
    },
  },
  plugins: [typography, forms],
} satisfies Config
