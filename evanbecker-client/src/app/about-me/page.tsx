'use client'

import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import portraitImage from '@/images/custom/evan-becker.png'
import { Container } from '@/components/Container'
import Image from 'next/image'
import { Button } from '@/components/Button'
import { BriefcaseIcon, ArrowDownIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import Link from 'next/link'
import { GitHubIcon, GitLabIcon, LinkedInIcon } from '@/components/SocialIcons'
import nvisiaLogo from '@/images/logos/nvisia_logo.jpg'
import mitutoyoLogo from '@/images/logos/mitutoyorda_logo.jpg'
import stack41Logo from '@/images/logos/Stack41.png'
import uwMilwaukeeLogo from '@/images/logos/uwm_logo.jpg'
import { InlineLink } from '@/components/InlineLink'
import AboutMeHeader from '@/components/AboutMeHeader'
import { Section } from '@/components/Section'
import { Card } from '@/components/Card'

const statuses = {
  Unavailable: 'text-gray-500 bg-gray-100/10',
  Success: 'text-green-400 bg-green-400/10',
  Failure: 'text-rose-400 bg-rose-400/10',
}

const environments = {
  Test: 'text-yellow-400 bg-yellow-400/10 ring-yellow-400/20',
  test: 'text-yellow-400 bg-yellow-400/10 ring-yellow-400/20',
  UAT: 'text-gray-400 bg-gray-400/10 ring-gray-400/20',
  Uat: 'text-gray-400 bg-gray-400/10 ring-gray-400/20',
  uat: 'text-gray-400 bg-gray-400/10 ring-gray-400/20',
  Stage: 'text-gray-400 bg-gray-400/10 ring-gray-400/20',
  stage: 'text-gray-400 bg-gray-400/10 ring-gray-400/20',
  prod: 'text-tertiary bg-tertiary/10 ring-tertiary/30',
  Prod: 'text-tertiary bg-tertiary/10 ring-tertiary/30',
  production: 'text-tertiary bg-tertiary/10 ring-tertiary/30',
  Production: 'text-tertiary bg-tertiary/10 ring-tertiary/30',
}

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

function SpeakingSection({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Section>) {
  return (
    <Section {...props}>
      <div className="space-y-16">{children}</div>
    </Section>
  )
}

function Appearance({
  title,
  description,
  event,
  cta,
  href,
}: {
  title: string
  description: string
  event: string
  cta: string
  href: string
}) {
  return (
    <Card as="article">
      <Card.Title as="h3" href={href}>
        {title}
      </Card.Title>
      <Card.Eyebrow decorate>{event}</Card.Eyebrow>
      <Card.Description>{description}</Card.Description>
      <Card.Cta>{cta}</Card.Cta>
    </Card>
  )
}

export default function AboutMe() {
  return (
    <>
      <Header />
      <main>
        <Container className="mt-8 sm:mt-16">
          <div className="grid grid-cols-1 gap-y-16 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-y-8">
            <div className="lg:pr-16 lg:pl-20">
              <div className="max-w-xs px-2.5 lg:max-w-none">
                <Image
                  src={portraitImage}
                  alt=""
                  sizes="(min-width: 1024px) 32rem, 20rem"
                  className="animate-jump aspect-square rotate-2 rounded-2xl bg-slate-800 object-cover"
                />
              </div>
            </div>
            <div className="lg:order-first lg:row-span-2">
              <h1 className="text-4xl font-bold tracking-tight text-slate-200 sm:text-5xl">
                I&apos;m Evan Becker, a MKE-based software architect who deals
                with the -ilities.
              </h1>
              <div className="mt-6 space-y-7 text-base text-slate-300">
                <p>
                  I help enterprises design scalable, evolvable systems that
                  deliver real value. I work as a Senior Technical Architect at{' '}
                  <InlineLink href="https://www.nvisia.com/">nvisia</InlineLink>
                  , consulting on clean architecture, data strategy, security,
                  and coding principles.
                </p>
                <p>
                  I tend to prefer object-oriented languages, with C# in the
                  .NET ecosystem being my primary focus. My approach to software
                  design is influenced by established architectural and
                  engineering principles, particularly those championed by{' '}
                  <InlineLink href="https://en.wikipedia.org/wiki/Robert_C._Martin">
                    Robert C. Martin
                  </InlineLink>
                  ,{' '}
                  <InlineLink href="https://en.wikipedia.org/wiki/Martin_Fowler_(software_engineer)">
                    Martin Fowler
                  </InlineLink>
                  ,{' '}
                  <InlineLink href="https://developertoarchitect.com/mark-richards.html">
                    Mark Richards
                  </InlineLink>
                  , and{' '}
                  <InlineLink href="https://nealford.com/">
                    Neal Ford
                  </InlineLink>
                  . I also draw from PMI’s Disciplined Agile Delivery when
                  thinking about how teams plan and execute work.
                </p>
                <p>
                  I enjoy combining 3D systems and applied math. At{' '}
                  <InlineLink href="https://www.mitutoyo.com/">
                    Mitutoyo
                  </InlineLink>
                  , I worked on the{' '}
                  <InlineLink href="https://www.mitutoyo.com/micat-planner/">
                    MiCAT Planner
                  </InlineLink>{' '}
                  and{' '}
                  <InlineLink href="https://www.mitutoyo.com/mcosmos/">
                    MCOSMOS
                  </InlineLink>{' '}
                  product suite, developing a scene-tree framework utilizing{' '}
                  <InlineLink href="HOOPS Visualize">
                    HOOPS Visualize
                  </InlineLink>
                  , along with algorithmic path generation and collision
                  detection for{' '}
                  <InlineLink href="https://en.wikipedia.org/wiki/Coordinate-measuring_machine">
                    coordinate-measuring machines
                  </InlineLink>{' '}
                  (CMMs). The software supports{' '}
                  <InlineLink href="https://en.wikipedia.org/wiki/Metrology">
                    metrology
                  </InlineLink>{' '}
                  inspection workflows used across aerospace and space-adjacent
                  manufacturing, where components are designed, measured, and
                  validated against extremely tight tolerances.
                </p>
                <p>
                  I’ve always enjoyed working on networks. Early in my career, I
                  spent a short but formative period at a startup that was later
                  acquired by{' '}
                  <InlineLink href="https://www.potawatomi.com/">
                    Potawatomi
                  </InlineLink>
                  ’s{' '}
                  <InlineLink href="https://dataholdings.com/">
                    Data Holdings
                  </InlineLink>
                  . The work combined electrical engineering, IoT, data science,
                  and Data Center as a Service (DCaaS) offerings at a time when
                  these ideas were well understood, but the ecosystem around
                  them was still taking shape. Large platforms existed, but they
                  were not yet the default. That environment made the work
                  challenging but fun.
                </p>
                <p>
                  As an undergraduate at UW-Milwaukee, I worked as a
                  co-researcher with Professor{' '}
                  <InlineLink href="https://jacquesduplessis.com/cv/">
                    Jacques du Plessis
                  </InlineLink>{' '}
                  on an audio-based language tool designed to help visually
                  impaired learners acquire new languages. Our work explored
                  different accessibility-focused interfaces, emphasizing an
                  audio-first approach to make learning more intuitive and
                  inclusive.
                </p>

                <AboutMeHeader />
              </div>
             {/* <div>
                <Button
                  href="/account/projects"
                  type="button"
                  variant="outline"
                  color="white"
                  className="mt-6 w-full"
                >
                  View Consulting Highlights
                </Button>
              </div>*/}
            </div>
            <div className="lg:pl-20">
              <ul role="list">
                <SocialLink
                  href="https://www.linkedin.com/in/evanbeckerdotnet/"
                  icon={LinkedInIcon}
                  className="mt-4"
                >
                  Follow on LinkedIn
                </SocialLink>
                <SocialLink
                  href="https://gitlab.com/evanbecker"
                  icon={GitLabIcon}
                  className="mt-4"
                >
                  Follow on GitLab
                </SocialLink>
                <SocialLink
                  href="https://github.com/evanjbecker"
                  icon={GitHubIcon}
                  className="mt-4"
                >
                  Follow on GitHub
                </SocialLink>

                <SocialLink
                  href="mailto:me@evanbecker.net"
                  icon={MailIcon}
                  className="mt-6 border-t border-slate-300/50 pt-6"
                >
                  me@evanbecker.net
                </SocialLink>
              </ul>
              <div className="space-y-10 pt-12">
                <Newsletter />
                <Resume />
              </div>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  )
}

function Newsletter() {
  return (
    <form
      action="/thank-you-subscribing"
      className="rounded-2xl border border-slate-700/40 p-6"
    >
      <h2 className="flex text-sm font-semibold text-slate-100">
        <MailIcon className="h-6 w-6 flex-none fill-slate-400" />
        <span className="ml-3">Stay up to date</span>
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        Get notified when I publish something new, and unsubscribe at any time.
      </p>
      <div className="mt-6 flex">
        <input
          type="email"
          placeholder="Email address"
          aria-label="Email address"
          required
          className="min-w-0 flex-auto appearance-none rounded-md border border-slate-700 border-slate-900/10 bg-slate-700/[0.15] bg-slate-800 px-3 py-[calc(theme(spacing.2)-1px)] text-slate-200 shadow-md shadow-slate-800/5 placeholder:text-slate-400 placeholder:text-slate-500 focus:border-primary focus:border-teal-400 focus:ring-4 focus:ring-teal-400/10 focus:ring-teal-500/10 focus:outline-none sm:text-sm"
        />
        <Button
          type="submit"
          variant="solid"
          color="blue"
          className="ml-4 flex-none"
        >
          Join
        </Button>
      </div>
    </form>
  )
}

function Role({ role }) {
  let startLabel =
    typeof role.start === 'string' ? role.start : role.start.label
  let startDate =
    typeof role.start === 'string' ? role.start : role.start.dateTime

  let endLabel = typeof role.end === 'string' ? role.end : role.end.label
  let endDate = typeof role.end === 'string' ? role.end : role.end.dateTime

  return (
    <li className="flex gap-4">
      <div className="relative mt-1 flex h-12 w-12 flex-none items-center justify-center rounded-full border border-slate-700/50 bg-slate-800 shadow-md ring-0 ring-1 shadow-slate-800/5 ring-slate-900/5">
        <Image
          src={role.logo}
          alt=""
          className="h-9 w-9 rounded-full bg-white p-1"
          unoptimized
        />
      </div>
      <dl className="flex flex-auto flex-wrap gap-x-2">
        <dt className="sr-only">Company</dt>
        <dd className="w-full flex-none text-sm font-medium text-slate-100">
          {role.company}
        </dd>
        <dt className="sr-only">Role</dt>
        <dd className="text-xs text-slate-400">{role.title}</dd>
        <dt className="sr-only">Date</dt>
        <dd
          className="ml-auto text-xs text-slate-400"
          aria-label={`${startLabel} until ${endLabel}`}
        >
          <time dateTime={startDate}>{startLabel}</time>{' '}
          <span aria-hidden="true">—</span>{' '}
          <time dateTime={endDate}>{endLabel}</time>
        </dd>
      </dl>
    </li>
  )
}

function Resume() {
  let resume = [
    {
      company: 'nvisia',
      title: 'Senior Technical Architect',
      logo: nvisiaLogo,
      start: '2019',
      end: {
        label: 'Present',
        dateTime: new Date().getFullYear().toString(),
      },
    },
    {
      company: 'Mitutoyo-RDA',
      title: 'Software Engineer',
      logo: mitutoyoLogo,
      start: '2018',
      end: '2019',
    },
    {
      company: 'Stack41 / Caravela IoT',
      title: 'Software Engineer',
      logo: stack41Logo,
      start: '2018',
      end: '2018',
    },
    {
      company: 'UW-Milwaukee',
      title: 'Software Engineer (Undergraduate Research)',
      logo: uwMilwaukeeLogo,
      start: '2016',
      end: '2018',
    },
  ]

  return (
    <div className="rounded-2xl border border-slate-700/40 p-6">
      <h2 className="flex text-sm font-semibold text-slate-100">
        <BriefcaseIcon className="h-6 w-6 flex-none fill-slate-400" />
        <span className="ml-3">Work</span>
      </h2>
      <ol className="mt-6 space-y-4">
        {resume.map((role, roleIndex) => (
          <Role key={roleIndex} role={role} />
        ))}
      </ol>
      <Button
        href="#"
        variant="solid"
        color="blue"
        className="group mt-6 w-full"
      >
        Download Resume
        <ArrowDownIcon className="h-4 w-4 stroke-slate-400 transition group-hover:stroke-slate-50 group-active:stroke-slate-50" />
      </Button>
    </div>
  )
}

function MailIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M6 5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6Zm.245 2.187a.75.75 0 0 0-.99 1.126l6.25 5.5a.75.75 0 0 0 .99 0l6.25-5.5a.75.75 0 0 0-.99-1.126L12 12.251 6.245 7.187Z"
      />
    </svg>
  )
}

function SocialLink({ className, href, children, icon: Icon }) {
  return (
    <li className={clsx(className, 'flex')}>
      <Link
        href={href}
        className="group flex text-sm font-medium text-slate-200 transition hover:text-tertiary"
      >
        <Icon className="h-6 w-6 flex-none fill-slate-400 transition group-hover:fill-tertiary" />
        <span className="ml-4">{children}</span>
      </Link>
    </li>
  )
}
