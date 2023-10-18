import { type Metadata } from 'next'
import {Header} from "@/components/Header";
import {Footer} from "@/components/Footer";
import portraitImage from '@/images/custom/evan-becker.png';
import {Container} from "@/components/Container";
import Image, { type ImageProps } from 'next/image'
import {Button} from "@/components/Button";
import { BriefcaseIcon, ArrowDownIcon} from "@heroicons/react/24/solid";
import clsx from "clsx";
import Link from "next/link";
import {GitHubIcon, GitLabIcon, LinkedInIcon} from "@/components/SocialIcons";
import ProjectList from "@/components/ProjectList";
import {SimpleLink} from "@/components/SimpleLink";


export const metadata: Metadata = {
    title: 'About',
    description:
        'I’m Spencer Sharp. I live in New York City, where I design the future.',
}

export default function AboutMe() {
    return (
        <>
            <Header />
            <main>
                <Container className="mt-8 sm:mt-16">
                    <div className="grid grid-cols-1 gap-y-16 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-y-8">
                        <div className="lg:pl-20 lg:pr-16">
                            <div className="max-w-xs px-2.5 lg:max-w-none">
                                <Image
                                    src={portraitImage}
                                    alt=""
                                    sizes="(min-width: 1024px) 32rem, 20rem"
                                    className="aspect-square animate-jump rotate-2 rounded-2xl bg-slate-100 object-cover dark:bg-slate-800 "
                                />
                            </div>
                        </div>
                        <div className="lg:order-first lg:row-span-2">
                            <h1 className="text-4xl font-bold tracking-tight text-light sm:text-5xl">
                                I&apos;m Evan Becker, a software architect living in MKE, dealing with the -ilities.
                            </h1>
                            <div className="mt-6 space-y-7 text-base text-slate-600 dark:text-slate-300">
                                <p>
                                    I am experienced in helping enterprises design scalable and consumable
                                    systems that bring real value. I am employed as a Technical Architect at nvisia,
                                    where I consult clean code and clean architecture. My most recent clients have
                                    been Milwaukee Tool, Alliant Energy, and Generac.
                                </p>
                                <p>
                                    I prefer working with object-oriented languages, my favorite
                                    being in C# and the .NET ecosystem. I am a strong advocate of
                                    software and architectural principles championed by folks like
                                    Robert C. Martin, Martin Fowler, Mark Richards, and Neal Ford.
                                </p>
                                <p>
                                    At my clients, being DASM certified, I will also often advocate for improving their agile practices,
                                    particularly inspired by pmi.org&apos;s Discipline Agile Delivery (DAD)
                                    evolutionary practices.
                                </p>
                                <p>
                                    On the side, I apply the same enthusiam I do at work at home
                                    for software in personal and side client projects.
                                    I am passionate about working in 3D, particularly those involving complicated
                                    mathematics. Whether its designing a model in Fusion 360 for my printer,
                                    working on a new renderer or shader for Unity or Unreal Engine, developing video
                                    games, or dealing with sensors in 3D embedded IoT
                                    environments, I have fun with the challenges.
                                </p>
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-light sm:text-3xl mt-20 mb-4">
                                Most Recent Changes
                            </h1>
                            <ProjectList/>
                            <div>
                                <Button type="submit" variant="outline" color="white" className="w-full mt-6">
                                    View All Projects
                                </Button>
                            </div>
                        </div>
                        <div className="lg:pl-20">
                            <ul role="list">
                                <SocialLink href="#" icon={LinkedInIcon} className="mt-4">
                                    Follow on GitHub
                                </SocialLink>
                                <SocialLink href="#" icon={GitLabIcon} className="mt-4">
                                    Follow on GitLab
                                </SocialLink>
                                <SocialLink href="#" icon={GitHubIcon} className="mt-4">
                                    Follow on GitHub
                                </SocialLink>

                                <SocialLink
                                    href="mailto:me@evanbecker.net"
                                    icon={MailIcon}
                                    className="mt-8 border-t border-slate-100 pt-8 dark:border-slate-700/40"
                                >
                                    me@evanbecker.net
                                </SocialLink>
                            </ul>
                            <div className="space-y-10 pt-12 ">
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
            action="/thank-you"
            className="rounded-2xl border border-slate-100 p-6 dark:border-slate-700/40"
        >
            <h2 className="flex text-sm font-semibold text-slate-300 dark:text-slate-100">
                <MailIcon className="h-6 w-6 flex-none fill-slate-400" />
                <span className="ml-3">Stay up to date</span>
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Get notified when I publish something new, and unsubscribe at any time.
            </p>
            <div className="mt-6 flex">
                <input
                    type="email"
                    placeholder="Email address"
                    aria-label="Email address"
                    required
                    className="min-w-0 flex-auto appearance-none rounded-md border border-slate-900/10 bg-white px-3 py-[calc(theme(spacing.2)-1px)] shadow-md shadow-slate-800/5 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-700/[0.15] dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-teal-400 dark:focus:ring-teal-400/10 sm:text-sm"
                />
                <Button type="submit" variant="solid" color="blue" className="ml-4 flex-none">
                    Join
                </Button>
            </div>
        </form>
    )
}

interface Role {
    company: string
    title: string
    logo: ImageProps['src']
    start: string | { label: string; dateTime: string }
    end: string | { label: string; dateTime: string }
}

function Role({ role }: { role: Role }) {
    let startLabel =
        typeof role.start === 'string' ? role.start : role.start.label
    let startDate =
        typeof role.start === 'string' ? role.start : role.start.dateTime

    let endLabel = typeof role.end === 'string' ? role.end : role.end.label
    let endDate = typeof role.end === 'string' ? role.end : role.end.dateTime

    return (
        <li className="flex gap-4">
            <div className="relative mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-full shadow-md shadow-slate-800/5 ring-1 ring-slate-900/5 dark:border dark:border-slate-700/50 dark:bg-slate-800 dark:ring-0">
                <Image src={role.logo} alt="" className="h-7 w-7" unoptimized />
            </div>
            <dl className="flex flex-auto flex-wrap gap-x-2">
                <dt className="sr-only">Company</dt>
                <dd className="w-full flex-none text-sm font-medium text-slate-900 dark:text-slate-100">
                    {role.company}
                </dd>
                <dt className="sr-only">Role</dt>
                <dd className="text-xs text-slate-500 dark:text-slate-400">
                    {role.title}
                </dd>
                <dt className="sr-only">Date</dt>
                <dd
                    className="ml-auto text-xs text-slate-400 dark:text-slate-500"
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
    let resume: Array<Role> = [
        {
            company: 'nvisia',
            title: 'Technical Architect',
            //logo: logoPlanetaria,
            start: '2019',
            end: {
                label: 'Present',
                dateTime: new Date().getFullYear().toString(),
            },
        },
        {
            company: 'Mitutoyo-RDA',
            title: 'Software Engineer',
            //logo: logoAirbnb,
            start: '2014',
            end: '2019',
        },
        {
            company: 'Stack41',
            title: 'Software Engineer',
            //logo: logoFacebook,
            start: '2011',
            end: '2014',
        },
        {
            company: 'UW-Milwaukee',
            title: 'Software Engineer',
            //logo: logoStarbucks,
            start: '2008',
            end: '2011',
        },
    ] as Array<Role>;

    return (
        <div className="rounded-2xl border border-slate-100 p-6 dark:border-slate-700/40">
            <h2 className="flex text-sm font-semibold text-slate-900 dark:text-slate-100">
                <BriefcaseIcon className="h-6 w-6 flex-none fill-slate-400" />
                <span className="ml-3">Work</span>
            </h2>
            <ol className="mt-6 space-y-4">
                {resume.map((role, roleIndex) => (
                    <Role key={roleIndex} role={role} />
                ))}
            </ol>
            <Button href="#" variant="solid" color="blue"  className="group mt-6 w-full">
                Download Resume
                <ArrowDownIcon className="h-4 w-4 stroke-slate-400 transition group-active:stroke-slate-600 dark:group-hover:stroke-slate-50 dark:group-active:stroke-slate-50" />
            </Button>
        </div>
    )
}

function MailIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
            <path
                fillRule="evenodd"
                d="M6 5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6Zm.245 2.187a.75.75 0 0 0-.99 1.126l6.25 5.5a.75.75 0 0 0 .99 0l6.25-5.5a.75.75 0 0 0-.99-1.126L12 12.251 6.245 7.187Z"
            />
        </svg>
    )
}

function SocialLink({
                        className,
                        href,
                        children,
                        icon: Icon,
                    }: {
    className?: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    children: React.ReactNode
}) {
    return (
        <li className={clsx(className, 'flex')}>
            <Link
                href={href}
                className="group flex text-sm font-medium text-slate-800 transition hover:text-tertiary dark:text-slate-200"
            >
                <Icon className="h-6 w-6 flex-none fill-slate-400 transition group-hover:fill-tertiary" />
                <span className="ml-4">{children}</span>
            </Link>
        </li>
    )
}