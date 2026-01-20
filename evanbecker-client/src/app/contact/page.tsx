'use client'

import {
  BuildingOffice2Icon,
  ChatBubbleLeftRightIcon,
  ComputerDesktopIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Contact() {
  const router = useRouter()
  const [firstNameText, setFirstNameText] = useState('')
  const [lastNameText, setLastNameText] = useState('')
  const [emailText, setEmailText] = useState('')
  const [phoneNumberText, setPhoneNumberText] = useState('')
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(false)

  const addContactMessage = async () => {
    setLoading(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: firstNameText,
          lastName: lastNameText,
          email: emailText,
          phoneNumber: phoneNumberText,
          message: messageText,
        }),
        mode: 'cors',
      })
      setLoading(false)
      router.push('thank-you-message')
    } catch (e) {
      console.error("Something didn't work", e)
    }
  }

  return (
    <>
      <Header />
      <div className="p-8">
        <div className="relative isolate bg-white dark:bg-slate-900">
          <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-2">
            <div className="relative px-6 pt-24 pb-10 sm:pt-32 lg:static lg:px-8 lg:py-16">
              <div className="mx-auto max-w-xl lg:mx-0 lg:max-w-lg">
                <div className="absolute inset-y-0 left-0 -z-10 w-full overflow-hidden bg-slate-100 ring-1 ring-slate-900/10 lg:w-1/2 dark:bg-slate-900 dark:ring-white/10">
                  <svg
                    aria-hidden="true"
                    className="absolute inset-0 size-full mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-slate-200 dark:stroke-white/10"
                  >
                    <defs>
                      <pattern
                        x="100%"
                        y={-1}
                        id="83fd4e5a-9d52-42fc-97b6-718e5d7ee527"
                        width={200}
                        height={200}
                        patternUnits="userSpaceOnUse"
                      >
                        <path d="M130 200V.5M.5 .5H200" fill="none" />
                      </pattern>
                    </defs>
                    <rect
                      width="100%"
                      height="100%"
                      strokeWidth={0}
                      className="fill-white dark:fill-slate-900"
                    />
                    <svg
                      x="100%"
                      y={-1}
                      className="overflow-visible fill-slate-50 dark:fill-slate-800/20"
                    >
                      <path d="M-470.5 0h201v201h-201Z" strokeWidth={0} />
                    </svg>
                    <rect
                      fill="url(#83fd4e5a-9d52-42fc-97b6-718e5d7ee527)"
                      width="100%"
                      height="100%"
                      strokeWidth={0}
                    />
                  </svg>
                  <div
                    aria-hidden="true"
                    className="absolute top-[calc(100%-13rem)] -left-56 hidden transform-gpu blur-3xl lg:top-[calc(50%-7rem)] lg:left-[max(-14rem,calc(100%-59rem))] dark:block"
                  >
                    <div
                      style={{
                        clipPath:
                          'polygon(74.1% 56.1%, 100% 38.6%, 97.5% 73.3%, 85.5% 100%, 80.7% 98.2%, 72.5% 67.7%, 60.2% 37.8%, 52.4% 32.2%, 47.5% 41.9%, 45.2% 65.8%, 27.5% 23.5%, 0.1% 35.4%, 17.9% 0.1%, 27.6% 23.5%, 76.1% 2.6%, 74.1% 56.1%)',
                      }}
                      className="aspect-1155/678 w-288.75 bg-linear-to-br from-[#80caff] to-[#4f46e5] opacity-10 dark:opacity-20"
                    />
                  </div>
                </div>
                <h2 className="text-4xl font-semibold tracking-tight text-pretty text-slate-900 sm:text-5xl dark:text-white">
                  Get in touch
                </h2>
                <p className="mt-6 text-lg/8 text-slate-600 dark:text-slate-400">
                  Throw me a message, and I'll see it{' '}
                  <span className="inline-flex text-xs">(eventually 👀)</span>.
                </p>
                <div className="mx-auto mt-20 max-w-lg space-y-16">
                  <div className="flex gap-x-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
                      <ChatBubbleLeftRightIcon
                        className="h-6 w-6 text-white"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="text-base leading-7 font-semibold text-slate-300">
                        Leave Comment
                      </h3>
                      <p className="mt-2 leading-7 text-slate-400">
                        Register and login using Auth0. Once logged in, you can
                        leave comments on my blog posts.
                      </p>
                      <div className="mt-4">
                        <a
                          href="/articles"
                          className="text-sm leading-6 font-semibold text-primary"
                        >
                          Blog <span aria-hidden="true">&rarr;</span>
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-x-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
                      <EnvelopeIcon
                        className="h-6 w-6 text-white"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="text-base leading-7 font-semibold text-gray-300">
                        Send Email
                      </h3>
                      <p className="mt-2 leading-7 text-slate-400">
                        I check my email at{' '}
                        <span className="font-bold">me@evanbecker.net</span>{' '}
                        quite frequently. Feel free to send me an email
                        whenever!
                      </p>
                      <div className="mt-4">
                        <a
                          href="mailto:me@evanbecker.net"
                          className="text-sm leading-6 font-semibold text-primary"
                        >
                          Send an email <span aria-hidden="true">&rarr;</span>
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-x-6">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
                      <ComputerDesktopIcon
                        className="h-6 w-6 text-white"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="text-base leading-7 font-semibold text-gray-300">
                        Contact Form
                      </h3>
                      <p className="mt-2 leading-7 text-slate-400">
                        Fill out the form at the bottom of the screen. I&apos;ll
                        get back to you as soon as I can.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <form
              action="#"
              method="POST"
              className="px-6 pt-20 pb-24 sm:pb-32 lg:px-8 lg:py-48"
            >
              <div className="mx-auto max-w-xl lg:mr-0 lg:max-w-lg">
                <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="first-name"
                      className="block text-sm/6 font-semibold text-slate-900 dark:text-white"
                    >
                      First name
                    </label>
                    <div className="mt-2.5">
                      <input
                        id="first-name"
                        name="first-name"
                        value={firstNameText || ''}
                        onChange={(e) => setFirstNameText(e.target.value)}
                        type="text"
                        autoComplete="given-name"
                        className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 placeholder:text-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-slate-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-slate-500 dark:focus:outline-slate-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="last-name"
                      className="block text-sm/6 font-semibold text-slate-900 dark:text-white"
                    >
                      Last name
                    </label>
                    <div className="mt-2.5">
                      <input
                        id="last-name"
                        name="last-name"
                        value={lastNameText || ''}
                        onChange={(e) => setLastNameText(e.target.value)}
                        type="text"
                        autoComplete="family-name"
                        className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 placeholder:text-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-slate-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-slate-500 dark:focus:outline-slate-500"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="email"
                      className="block text-sm/6 font-semibold text-slate-900 dark:text-white"
                    >
                      Email
                    </label>
                    <div className="mt-2.5">
                      <input
                        id="email"
                        name="email"
                        value={emailText || ''}
                        onChange={(e) => setEmailText(e.target.value)}
                        type="email"
                        autoComplete="email"
                        className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 placeholder:text-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-slate-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-slate-500 dark:focus:outline-slate-500"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="phone-number"
                      className="block text-sm/6 font-semibold text-slate-900 dark:text-white"
                    >
                      Phone number
                    </label>
                    <div className="mt-2.5">
                      <input
                        id="phone-number"
                        name="phone-number"
                        value={phoneNumberText || ''}
                        onChange={(e) => setPhoneNumberText(e.target.value)}
                        type="tel"
                        autoComplete="tel"
                        className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 placeholder:text-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-slate-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-slate-500 dark:focus:outline-slate-500"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="message"
                      className="block text-sm/6 font-semibold text-slate-900 dark:text-white"
                    >
                      Message
                    </label>
                    <div className="mt-2.5">
                      <textarea
                        id="message"
                        name="message"
                        value={messageText || ''}
                        onChange={(e) => setMessageText(e.target.value)}
                        rows={4}
                        className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-slate-900 outline-1 -outline-offset-1 outline-slate-300 placeholder:text-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-slate-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-slate-500 dark:focus:outline-slate-500"
                        defaultValue={''}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <button
                    type="button"
                    onClick={() => addContactMessage()}
                    className="focus-visible:primary dark:primary dark:secondary dark:focus-visible:secondary cursor-pointer rounded-md bg-secondary px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-xs hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    Send message
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
