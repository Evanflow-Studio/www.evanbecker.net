'use client'

import { createContext, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ThemeProvider, useTheme } from 'next-themes'
import { Auth0Provider } from '@auth0/auth0-react'
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function usePrevious<T>(value: T) {
  let ref = useRef<T | undefined>(undefined)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}

function ThemeWatcher() {
  let { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    let media = window.matchMedia('(prefers-color-scheme: dark)')

    function onMediaChange() {
      let systemTheme = media.matches ? 'dark' : 'light'
      if (resolvedTheme === systemTheme) {
        setTheme('system')
      }
    }

    onMediaChange()
    media.addEventListener('change', onMediaChange)

    return () => {
      media.removeEventListener('change', onMediaChange)
    }
  }, [resolvedTheme, setTheme])

  return null
}

export const AppContext = createContext<{ previousPathname?: string }>({})

export function Providers({ children }: { children: React.ReactNode }) {
  let pathname = usePathname()
  let previousPathname = usePrevious(pathname)

  const [client] = useState(new QueryClient())

  return (
    <AppContext.Provider value={{ previousPathname }}>
      <Auth0Provider
        domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'ENV not configured'}
        clientId={
          process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || 'ENV not configured'
        }
        authorizationParams={{
          audience:
            process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'ENV not configured',
          redirect_uri:
            process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI || 'ENV not configured',
          scope: 'openid profile email offline_access',
        }}
        useRefreshTokens
        cacheLocation="localstorage"
      >
        <QueryClientProvider client={client}>
          <ThemeProvider attribute="class" disableTransitionOnChange>
            <ThemeWatcher />
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
          </ThemeProvider>
        </QueryClientProvider>
      </Auth0Provider>
    </AppContext.Provider>
  )
}
