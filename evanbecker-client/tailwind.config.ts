import formsPlugin from '@tailwindcss/forms'
import headlessuiPlugin from '@headlessui/tailwindcss'
import { type Config } from 'tailwindcss'
const typographyPlugin = require('@tailwindcss/typography')
const colors = require('tailwindcss/colors')

import typographyStyles from './typography'

export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      vs: ['0.825rem', { lineHeight: '1.35rem' }],
      sm: ['0.875rem', { lineHeight: '1.5rem' }],
      base: ['1rem', { lineHeight: '1.75rem' }],
      lg: ['1.125rem', { lineHeight: '2rem' }],
      xl: ['1.25rem', { lineHeight: '2rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['2rem', { lineHeight: '2.5rem' }],
      '4xl': ['2.5rem', { lineHeight: '3.5rem' }],
      '5xl': ['3rem', { lineHeight: '3.5rem' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
      '7xl': ['4.5rem', { lineHeight: '1.1' }],
      '8xl': ['6rem', { lineHeight: '1' }],
      '9xl': ['8rem', { lineHeight: '1' }],
    },
    colors: {
      ...colors,
      transparent: 'transparent',
      current: 'currentColor',
      primary: '#0C65E5',
      secondary: '#2D95FC',
      tertiary: '#41A5F7',
      light: 'slate-100'
    },
    typography: typographyStyles,
    darkMode: 'class',
    extend: {
      borderRadius: {
        '4xl': '2rem',
      },
      fontFamily: {
        sans: 'var(--font-inter)',
        display: 'var(--font-lexend)',
      },
      maxWidth: {
        '8xl': '88rem',
      },
    },
  },
  plugins: [formsPlugin, headlessuiPlugin, require('@tailwindcss/aspect-ratio'), typographyPlugin],
} satisfies Config
