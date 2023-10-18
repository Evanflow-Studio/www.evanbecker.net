'use client'

import { createContext, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { ThemeProvider, useTheme } from 'next-themes'
import { Auth0Provider } from "@auth0/auth0-react";

function usePrevious<T>(value: T) {
  let ref = useRef<T>()

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
  const pathname = usePathname()
  let previousPathname = usePrevious(pathname)



  console.log(process.env.NEXT_PUBLIC_AUTH0_DOMAIN);
  console.log(process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID);
  console.log(process.env.NEXT_PUBLIC_AUTH0_AUDIENCE);
  console.log(process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI);

  return (
    <AppContext.Provider value={{ previousPathname }}>
      <Auth0Provider
          domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN || "ENV not configured"}
          clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "ENV not configured"}
          authorizationParams={{
            audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || "ENV not configured",
            redirect_uri: process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI || "ENV not configured",
            scope: "openid profile email offline_access"
          }}
          useRefreshTokens
          /*responseType="token access_token"*/ // TODO: Remove?
          cacheLocation="localstorage"
      >
        <ThemeProvider attribute="class" disableTransitionOnChange>
          <ThemeWatcher />
          {children}
        </ThemeProvider>
      </Auth0Provider>
    </AppContext.Provider>
  )
}
