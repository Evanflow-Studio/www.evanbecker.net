'use client'

import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid'
import {Header} from "@/components/Header";
import {Container} from "@/components/Container";
import {Footer} from "@/components/Footer";
import {Button} from "@/components/Button";

const statuses: any = {
    Complete: 'inline-flex items-center rounded-md bg-gray-400/10 px-2 py-1 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-400/20',
    Math: 'inline-flex items-center rounded-md bg-red-400/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-400/20',
    Fiction: 'inline-flex items-center rounded-md bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-500 ring-1 ring-inset ring-yellow-400/20',
    0: 'inline-flex items-center rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-500/20',
    History: 'inline-flex items-center rounded-md bg-blue-400/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-400/30',
    Religion: 'inline-flex items-center rounded-md bg-indigo-400/10 px-2 py-1 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-400/30',
    Software: 'inline-flex items-center rounded-md bg-purple-400/10 px-2 py-1 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-400/30',
    4: 'inline-flex items-center rounded-md bg-pink-400/10 px-2 py-1 text-xs font-medium text-pink-400 ring-1 ring-inset ring-pink-400/20'
};
const projects: any[] = [
    {
        id: 1,
        name: 'GraphQL API',
        href: '#',
        status: 'Complete',
        createdBy: 'Leslie Alexander',
        dueDate: 'March 17, 2023',
        dueDateTime: '2023-03-17T00:00Z',
    },
    {
        id: 2,
        name: 'New benefits plan',
        href: '#',
        status: 'In progress',
        createdBy: 'Leslie Alexander',
        dueDate: 'May 5, 2023',
        dueDateTime: '2023-05-05T00:00Z',
    },
    {
        id: 3,
        name: 'Onboarding emails',
        href: '#',
        status: 'In progress',
        createdBy: 'Courtney Henry',
        dueDate: 'May 25, 2023',
        dueDateTime: '2023-05-25T00:00Z',
    },
    {
        id: 4,
        name: 'iOS app',
        href: '#',
        status: '4',
        createdBy: 'Leonard Krasner',
        dueDate: 'June 7, 2023',
        dueDateTime: '2023-06-07T00:00Z',
    },
    {
        id: 5,
        name: 'Marketing site redesign',
        href: '#',
        status: 'Archived',
        createdBy: 'Courtney Henry',
        dueDate: 'June 10, 2023',
        dueDateTime: '2023-06-10T00:00Z',
    },
]

function classNames(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}

export default function Resources() {
    return (
        <>
            <Header/>

            <Container className="mt-8 sm:mt-16 w-full">
                <h1 className="text-4xl font-bold tracking-tight text-light sm:text-5xl">
                    Resources
                </h1>
                <div className="mt-6 space-y-7 text-base text-slate-600 dark:text-slate-300">
                    <p>
                        A tagged list of (randomly assorted) resources that I&apos;ve found
                        useful, fun, or interesting.
                        Have fun and look around 👀!
                    </p>
                </div>
                <div className="">
                    <ul role="list" className="divide-y divide-slate-700">
                        {projects.map((project) => (
                            <li key={project.id} className="flex items-center justify-between gap-x-6 py-5">
                                <div className="min-w-0">
                                    <div className="flex items-start gap-x-3">
                                        <p className="text-lg font-semibold leading-6 text-slate-200">{project.name}</p>
                                        <p
                                            className={classNames(
                                                statuses[project.status],
                                                'rounded-md whitespace-nowrap mt-0.5 px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset'
                                            )}
                                        >
                                            {project.status}
                                        </p>
                                    </div>
                                    <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-slate-500">
                                        <p className="whitespace-nowrap">
                                            Created <time dateTime={project.dueDateTime}>{project.dueDate}</time>
                                        </p>
                                        <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
                                            <circle cx={1} cy={1} r={1} />
                                        </svg>
                                        <p className="truncate">By Evan Becker</p>
                                    </div>
                                    <div className="mt-1 flex items-center gap-x-2 text-sm leading-5 text-slate-400">
                                        This really helped with my chess skills
                                    </div>
                                </div>
                                <div className="flex flex-none items-center gap-x-4">
                                    <Button type="submit" variant="outline" color="white" className="w-full mt-6"
                                    >
                                        Check it out!<span className="sr-only">, {project.name}</span>
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

            </Container>
            <Footer/>
        </>
    )
}
