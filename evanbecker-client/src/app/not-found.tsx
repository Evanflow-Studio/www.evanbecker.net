import Link from 'next/link'

import { Button } from '@/components/Button'
import { Logo } from '@/components/Logo'
import { SlimLayout } from '@/components/SlimLayout'
import {Header} from "@/components/Header";
import {Container} from "@/components/Container";
import {Footer} from "@/components/Footer";

export default function NotFound() {
  return (
      <>
          <Header />
          <main className="grid min-h-[50%] place-items-center bg-slate-900 px-6 pt-48 pb-32 lg:px-8">
              <div className="text-center">
                  <p className="text-base font-semibold text-primary">404</p>
                  <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-200 sm:text-5xl">Page not found</h1>
                  <p className="mt-6 text-base leading-7 text-slate-400">Sorry, we couldn&apos;t find the page you’re looking for. Maybe you don&apos;t have enough permissions 🤷‍♂️.</p>
                  <div className="mt-10 flex items-center justify-center gap-x-6">
                      <a
                          href="/"
                          className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-slate-200 shadow-sm hover:bg-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tertiary"
                      >
                          Go back to Home
                      </a>
                      <a href="/contact" className="text-sm font-semibold text-slate-200">
                          Contact me <span aria-hidden="true">&rarr;</span>
                      </a>
                  </div>
              </div>
          </main>
          <Footer/>
      </>
  )
}
