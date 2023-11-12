"use client"

import {Header} from "@/components/Header";
import {Footer} from "@/components/Footer";
import portraitImage from '@/images/custom/evan-becker.png';
import {Container} from "@/components/Container";
import Image from 'next/image'
import {Button} from "@/components/Button";
import { BriefcaseIcon, ArrowDownIcon} from "@heroicons/react/24/solid";
import clsx from "clsx";
import Link from "next/link";
import {GitHubIcon, GitLabIcon, LinkedInIcon} from "@/components/SocialIcons";
import nvisiaLogo from '@/images/logos/nvisia_logo.jpg'
import mitutoyoLogo from '@/images/logos/mitutoyorda_logo.jpg'
import stack41Logo from '@/images/logos/Stack41.png'
import uwMilwaukeeLogo from '@/images/logos/uwm_logo.jpg'
import {useEffect, useState} from "react";
import {ChevronRightIcon} from "@heroicons/react/20/solid";
import LoadingSpinnerLarge from "../../components/LoadingSpinnerLarge";

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

function classNames(...classes){
    return classes.filter(Boolean).join(' ')
}

export default function AboutMe() {
    const [isHealthCheckLoading, setIsHealthCheckLoading] = useState(false);
    const [healthCheckItems, setHealthCheckItems] = useState([]);

    const getServiceHealthCheck = async () => {
        setIsHealthCheckLoading(true);
        try {
            const call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/healthcheck`, {
                method: "GET",
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: "cors",
            });
            let healthCheckItems = await call.json();
            setHealthCheckItems(healthCheckItems)

        } catch (e) {
            console.error("Something didn't work", e);
        }

        setIsHealthCheckLoading(false);
    }

    useEffect(() => {
        getServiceHealthCheck().then()
    }, [])

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
                                    className="aspect-square animate-jump rotate-2 rounded-2xl bg-slate-100 object-cover bg-slate-800 "
                                />
                            </div>
                        </div>
                        <div className="lg:order-first lg:row-span-2">
                            <h1 className="text-4xl font-bold tracking-tight text-light sm:text-5xl text-slate-200">
                                I&apos;m Evan Becker, a software architect living in MKE, dealing with the -ilities.
                            </h1>
                            <div className="mt-6 space-y-7 text-base text-slate-300">
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
                            <h1 className="text-2xl font-bold tracking-tight text-light sm:text-3xl mt-20 mb-4 text-slate-200">
                                Service Health
                            </h1>
                            {isHealthCheckLoading && <LoadingSpinnerLarge/>}
                            {!isHealthCheckLoading && (
                                <>
                                    <ul role="list" className="divide-y divide-white/5">
                                        {healthCheckItems?.map((healthCheck, index) => (
                                            <li key={index} className="relative flex items-center space-x-4 py-4">
                                                <div className="min-w-0 flex-auto">
                                                    <div className="flex items-center gap-x-3">
                                                        <div className={classNames(statuses[healthCheck.status], 'flex-none rounded-full p-1')}>
                                                            <div className="h-2 w-2 rounded-full bg-current" />
                                                        </div>
                                                        <h2 className="min-w-0 text-sm font-semibold leading-6 text-white">
                                                            <a href={"https://"+healthCheck.url} className="flex gap-x-2">
                                                                <span className="truncate">{healthCheck.name}</span>
                                                                <span className="text-gray-400">/</span>
                                                                <span className="whitespace-nowrap">{healthCheck.url}</span>
                                                                <span className="absolute inset-0" />
                                                            </a>
                                                        </h2>
                                                    </div>
                                                    <div className="mt-3 flex items-center gap-x-2.5 text-xs leading-5 text-gray-400">
                                                        <p className="truncate">Deployed from GitHub</p>
                                                        <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 flex-none fill-gray-300">
                                                            <circle cx={1} cy={1} r={1} />
                                                        </svg>
                                                        <p className="whitespace-nowrap">Created {new Date(healthCheck.created).toLocaleDateString('en-US', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })}</p>
                                                    </div>
                                                </div>
                                                <div
                                                    className={classNames(
                                                        environments[healthCheck.environment],
                                                        'rounded-full flex-none py-1 px-2 text-xs font-medium ring-1 ring-inset'
                                                    )}
                                                >
                                                    {healthCheck.environment}
                                                </div>
                                                <ChevronRightIcon className="h-5 w-5 flex-none text-gray-400" aria-hidden="true" />
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            <div>
                                <Button href="/account/projects" type="button" variant="outline" color="white" className="w-full mt-6">
                                    View All Projects
                                </Button>
                            </div>
                        </div>
                        <div className="lg:pl-20">
                            <ul role="list">
                                <SocialLink href="https://www.linkedin.com/in/evanbeckerdotnet/" icon={LinkedInIcon} className="mt-4">
                                    Follow on LinkedIn
                                </SocialLink>
                                <SocialLink href="https://gitlab.com/evanbecker" icon={GitLabIcon} className="mt-4">
                                    Follow on GitLab
                                </SocialLink>
                                <SocialLink href="https://github.com/evanjbecker" icon={GitHubIcon} className="mt-4">
                                    Follow on GitHub
                                </SocialLink>

                                <SocialLink
                                    href="mailto:me@evanbecker.net"
                                    icon={MailIcon}
                                    className="pt-6 mt-6 border-t border-slate-300/50"
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
            className="rounded-2xl border p-6 border-slate-700/40"
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
                    className="min-w-0 flex-auto appearance-none rounded-md border border-slate-900/10 bg-slate-800 px-3 py-[calc(theme(spacing.2)-1px)] shadow-md shadow-slate-800/5 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-teal-500/10 border-slate-700 bg-slate-700/[0.15] text-slate-200 placeholder:text-slate-500 focus:border-teal-400 focus:ring-teal-400/10 sm:text-sm"
                />
                <Button type="submit" variant="solid" color="blue" className="ml-4 flex-none">
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
            <div className="relative mt-1 flex h-12 w-12 flex-none items-center justify-center rounded-full shadow-md shadow-slate-800/5 ring-1 ring-slate-900/5 border border-slate-700/50 bg-slate-800 ring-0">
                <Image src={role.logo} alt="" className="h-9 w-9 rounded-full bg-white p-1" unoptimized />
            </div>
            <dl className="flex flex-auto flex-wrap gap-x-2">
                <dt className="sr-only">Company</dt>
                <dd className="w-full flex-none text-sm font-medium text-slate-100">
                    {role.company}
                </dd>
                <dt className="sr-only">Role</dt>
                <dd className="text-xs text-slate-400">
                    {role.title}
                </dd>
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
            title: 'Technical Architect',
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
            company: 'Stack41',
            title: 'Software Engineer',
            logo: stack41Logo,
            start: '2018',
            end: '2018',
        },
        {
            company: 'UW-Milwaukee',
            title: 'Software Engineer',
            logo: uwMilwaukeeLogo,
            start: '2016',
            end: '2018',
        },
    ];

    return (
        <div className="rounded-2xl border p-6 border-slate-700/40">
            <h2 className="flex text-sm font-semibold text-slate-100">
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

function SocialLink({
                        className,
                        href,
                        children,
                        icon: Icon,
                    })
{
    return (
        <li className={clsx(className, 'flex')}>
            <Link
                href={href}
                className="group flex text-sm font-medium transition hover:text-tertiary text-slate-200"
            >
                <Icon className="h-6 w-6 flex-none fill-slate-400 transition group-hover:fill-tertiary" />
                <span className="ml-4">{children}</span>
            </Link>
        </li>
    )
}