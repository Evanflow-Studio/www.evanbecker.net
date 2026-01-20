'use client'

import { useEffect, useState } from 'react'
import { Fragment } from 'react'
import Link from 'next/link'
import { Menu, Popover, Transition } from '@headlessui/react'
import clsx from 'clsx'

import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { NavLink } from '@/components/NavLink'
import {Logo} from "@/components/Logo";
import {useAuth0} from "@auth0/auth0-react";
import LoadingSpinner from "@/components/LoadingSpinner";

function MobileNavLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Popover.Button as={Link} href={href} className="block w-full p-2">
      {children}
    </Popover.Button>
  )
}

function MobileNavIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5 overflow-visible stroke-slate-300"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <path
        d="M0 1H14M0 7H14M0 13H14"
        className={clsx(
          'origin-center transition',
          open && 'scale-90 opacity-0',
        )}
      />
      <path
        d="M2 2L12 12M12 2L2 12"
        className={clsx(
          'origin-center transition',
          !open && 'scale-90 opacity-0',
        )}
      />
    </svg>
  )
}

function MobileNavigation() {
  const {
    isLoading,
    isAuthenticated,
    loginWithRedirect,
    logout,
  } = useAuth0();

  return (
    <Popover>
      <Popover.Button
        className="relative z-10 flex h-8 w-8 items-center justify-center ui-not-focus-visible:outline-none text-slate-100"
        aria-label="Toggle Navigation"
      >
        {({ open }) => <MobileNavIcon open={open} />}
      </Popover.Button>
      <Transition.Root>
        <Transition.Child
          as={Fragment}
          enter="duration-150 ease-out"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="duration-150 ease-in"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Popover.Overlay className="fixed inset-0 bg-slate-300/50" />
        </Transition.Child>
        <Transition.Child
          as={Fragment}
          enter="duration-150 ease-out"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="duration-100 ease-in"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <Popover.Panel
            as="div"
            className="absolute inset-x-0 top-full mt-4 flex origin-top flex-col rounded-2xl bg-slate-950 p-4 text-lg tracking-tight text-slate-200 shadow-xl ring-1 ring-slate-900/5"
          >
            <MobileNavLink href="/public">Home</MobileNavLink>
            <MobileNavLink href="/about-me">About Me</MobileNavLink>
            <MobileNavLink href="/contact">Contact</MobileNavLink>
            <MobileNavLink href="/articles">Blog</MobileNavLink>
            <hr className="m-2 border-slate-300/40" />
            {!isLoading && isAuthenticated && (
                <>
                  <a href="#" onClick={() => logout()}><MobileNavLink href="#">Logout</MobileNavLink></a>
                </>
            )}
            {!isLoading && !isAuthenticated && (<a href="#" onClick={() => loginWithRedirect()}><MobileNavLink href="#">Sign In</MobileNavLink></a>)}
            {isLoading && (<LoadingSpinner/>)}

          </Popover.Panel>
        </Transition.Child>
      </Transition.Root>
    </Popover>
  )
}

export function Header() {
  let [isScrolled, setIsScrolled] = useState(false)

  const {
    user,
      isLoading,
    isAuthenticated,
    loginWithRedirect,
      logout,
  } = useAuth0();

  useEffect(() => {
    console.log({ user })
    console.log({ isLoading })
    console.log({ isAuthenticated })
  }, [user, isLoading, isAuthenticated])

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
  
  return (
    <header className={clsx(
      'sticky top-0 z-50 px-4 transition duration-500 shadow-none sm:px-6 lg:px-8',
      isScrolled
        ? 'bg-slate-900/95 backdrop-blur [@supports(backdrop-filter:blur(0))]:bg-slate-900/75'
        : 'bg-transparent',
    )}>
      <Container>
        <nav className="relative z-50 flex justify-between">
          <div className="flex items-center md:gap-x-12">
            <Link href="/public" aria-label="Home" className="pt-6">
              <Logo className="h-20 w-auto"/>
            </Link>
            <div className="hidden md:flex md:gap-x-6 pt-6">
              <NavLink href="/public">Home</NavLink>
              <NavLink href="/about-me">About Me</NavLink>
              <NavLink href="/contact">Contact</NavLink>
              <NavLink href="/articles">Blog</NavLink>
            </div>
          </div>
          <div className="flex items-center gap-x-5 md:gap-x-8 pt-8">
            {!isLoading && isAuthenticated && (
                <Menu as="div" className="relative ml-3">
                  <div>
                    <Menu.Button className="relative flex rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                      <span className="absolute -inset-1.5" />
                      <span className="sr-only">Open user menu</span>
                      <img
                          className="h-8 w-8 rounded-full"
                          src={user?.picture}
                          alt=""
                      />
                    </Menu.Button>
                  </div>
                  <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-slate-950 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <Menu.Item>
                        {({ active }) => (
                            <a
                                href="#"
                                onClick={() => logout()}
                                className={classNames(active ? 'bg-slate-800' : '', 'block px-4 py-2 text-sm text-slate-200')}
                            >
                              Sign out
                            </a>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
            )}
            {!isLoading && !isAuthenticated && (<Button href="#" onClick={() => loginWithRedirect()} color="blue">
              Sign In
            </Button>)}
            {isLoading && (<LoadingSpinner/>)}
            <div className="-mr-1 md:hidden">
              <MobileNavigation />
            </div>
          </div>
        </nav>
      </Container>
    </header>
  )
}

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
