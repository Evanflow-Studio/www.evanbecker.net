'use client'

import Image from 'next/image'
import { Button } from '@/components/Button'
import { HeroBackground } from '@/components/HeroBackground'
import blurCyanImage from '@/images/blur-cyan.png'
import blurIndigoImage from '@/images/blur-indigo.png'
import { CodeEditor } from '@/components/CodeEditor'
import { SimpleLink } from "@/components/SimpleLink";


export function NewHero() {
  return (
    <div className="bg-slate-900 dark:-mb-32 dark:mt-[-4.75rem] dark:pb-32 dark:pt-[4.75rem] ">
      <div className="py-16 sm:px-2 lg:relative lg:px-0 lg:py-20">
        <div className="mx-auto grid max-w-2xl grid-cols-1 items-center gap-x-8 gap-y-16 px-4 lg:max-w-8xl lg:grid-cols-2 lg:px-8 xl:gap-x-16 xl:px-12">
          <div className="relative z-10 md:text-center lg:text-left">
            <Image
              className="absolute bottom-full right-full -mb-56 -mr-72 opacity-50"
              src={blurCyanImage}
              alt=""
              width={530}
              height={530}
              unoptimized
              priority
            />
            <div className="relative">
              <p className="inline bg-gradient-to-r from-indigo-200 via-sky-400 to-indigo-200 bg-clip-text font-display text-5xl tracking-tight text-transparent">
                Hello, World!
              </p>
              <p className="mt-3 text-xl tracking-tight text-slate-300">
                Welcome to the new <SimpleLink href="#">evanbecker.net</SimpleLink>.
              </p>
              <p className="mt-3 text-2xl tracking-tight text-slate-300">
                This UI is built using <SimpleLink href="https://tailwindcss.com/">Tailwind CSS</SimpleLink> and <SimpleLink href="https://nextjs.org/">Next.js</SimpleLink>,
                the backend in <SimpleLink href="https://dotnet.microsoft.com/en-us/download/dotnet/7.0">.NET 7</SimpleLink> w/ <SimpleLink href="https://learn.microsoft.com/en-us/ef/">Entity Framework</SimpleLink>,
                database using <SimpleLink href="https://www.postgresql.org/">PostgreSQL</SimpleLink>
                , <SimpleLink href="https://traefik.io/traefik/">Traefik</SimpleLink> as a reverse proxy, <SimpleLink href="https://en.wikipedia.org/wiki/CI/CD">CI/CD</SimpleLink> using <SimpleLink href="https://github.com/features/actions">GitHub Actions</SimpleLink>,
                containerized using <SimpleLink href="https://www.docker.com/">Docker</SimpleLink>,
                and autonomous deployment to a <SimpleLink href="https://m.do.co/c/bb04ad8bf1c5">DigitalOcean Droplet</SimpleLink>.
              </p>
              <div className="mt-8 flex gap-4 md:justify-center lg:justify-start">
                <Button href="/">So, how&apos;d you do it?</Button>
                <Button href="/" color="blue">
                  View GitHub
                </Button>
              </div>
            </div>
          </div>
          <div className="relative lg:static xl:pl-10">
            <div className="absolute inset-x-[-50vw] -bottom-48 -top-32 [mask-image:linear-gradient(transparent,white,white)] dark:[mask-image:linear-gradient(transparent,white,transparent)] lg:-bottom-32 lg:-top-32 lg:left-[calc(50%+14rem)] lg:right-0 lg:[mask-image:none] lg:dark:[mask-image:linear-gradient(white,white,transparent)]">
              <HeroBackground className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-0 lg:translate-x-0 lg:translate-y-[-60%]" />
            </div>
            <div className="relative">
              <Image
                className="absolute -right-64 -top-64"
                src={blurCyanImage}
                alt=""
                width={530}
                height={530}
                unoptimized
                priority
              />
              <Image
                className="absolute -bottom-40 -right-44"
                src={blurIndigoImage}
                alt=""
                width={567}
                height={567}
                unoptimized
                priority
              />
              <CodeEditor/>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
