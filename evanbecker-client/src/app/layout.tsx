import { Inter, Lexend } from 'next/font/google'
import clsx from 'clsx'
import { Providers } from '@/app/providers'
import '@/styles/tailwind.css'
import { type Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s - Evan Becker',
    default: 'Evan Becker - Milwaukee Software Architect',
  },
  description:
    'Evan Becker is a Technical Architect consultant at nvisia advocating for clean architecture. He is experienced in helping enterprises design scalable and consumable systems that bring real value.',
  alternates: {
    types: {
      'application/rss+xml': `${process.env.NEXT_PUBLIC_SITE_URL}/feed.xml`,
    },
  },
}

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const lexend = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={clsx(
        'h-full scroll-smooth bg-slate-900 antialiased',
        inter.variable,
        lexend.variable,
      )}
    >
      <body className="flex h-full flex-col bg-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
