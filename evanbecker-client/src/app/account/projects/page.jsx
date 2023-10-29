"use client"

import {AccountLayout} from "@/components/Account/AccountLayout";
import {useState, Fragment, useEffect} from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {CheckIcon, ChevronRightIcon, ChevronUpDownIcon, PlusIcon} from '@heroicons/react/20/solid'
import {useAuth0} from "@auth0/auth0-react";
import {usePathname} from "next/navigation";
import LoadingSpinner from "../../../components/LoadingSpinner";
import {formatDate} from "../../../lib/formatDate";

const statuses = {
    offline: 'text-gray-500 bg-gray-100/10',
    online: 'text-green-400 bg-green-400/10',
    error: 'text-rose-400 bg-rose-400/10',
}

const environments = {
    Preview: 'text-gray-400 bg-gray-400/10 ring-gray-400/20',
    Production: 'text-tertiary bg-tertiary/10 ring-tertiary/30',
}
const deployments = [
    {
        id: 1,
        href: '#',
        projectName: 'ios-app',
        teamName: 'Planetaria',
        status: 'offline',
        statusText: 'Initiated 1m 32s ago',
        description: 'Deploys from GitHub',
        environment: 'Preview',
    },
    // More deployments...
]
const activityItems = [


    {
        user: {
            name: 'Michael Foster',
            imageUrl:
                'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        projectName: 'ios-app',
        commit: '2d89f0c8',
        branch: 'main',
        date: '1h',
        dateTime: '2023-01-23T11:00',
    },
    // More items...
]

export default function AccountProjects() {
    const [open, setOpen] = useState(false)

    const [projectName, setProjectName] = useState(null);
    const [isLoading, setLoading] = useState(false);
    const [projects, setProjects] = useState(null);
    const [areProjectsLoading, setProjectsLoading] = useState(false);

    const { getAccessTokenSilently } = useAuth0();
    const pathname = usePathname();

    const createProject = async () => {
        setLoading(true);
        try {
            const accessToken = await getAccessTokenSilently();
            const call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/new/${projectName}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                mode: "cors",
            });
            let project = await call.json();
            console.log("New Project Returned: ", project);
        } catch (e) {
            console.error("Something didn't work", e);
        }
        setLoading(false);
        setOpen(false);
    }

    const [isDeploymentLoading, setDeploymentLoading] = useState(false);
    const [deployments, setDeployments] = useState({});

    const getDeployments = async (page = 1) => {
        setDeploymentLoading(true);
        try {
            const call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/deployments/all/page/${page}`, {
                method: "GET",
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: "cors",
            });
            let newDeployments = await call.json();
            setDeployments(newDeployments)

        } catch (e) {
            console.error("Something didn't work", e);
        }

        setDeploymentLoading(false);
    }

    const getProjects = async () => {
        setProjectsLoading(true);
        try {
            const call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/`, {
                method: "GET",
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: "cors",
            });
            let projects = await call.json();
            console.log("Projects: ", projects);
            setProjects(projects);
        } catch (e) {
            console.error("Something didn't work", e);
        }
        setProjectsLoading(false);
    }

    useEffect(() => {
        getProjects().then()
        getDeployments().then()
    }, [])

    var getDeploymentStatusClass = (status) => {
        switch (status)
        {
            case 'offline':
                return statuses.offline;
                break;
            case 'online':
                return statuses.online;
                break;
            case 'error':
                return statuses.error;
                break;
        }
    }

    return (
        <>
            <Transition.Root show={open} as={Fragment}>
                <Dialog as="div" className="relative z-40" onClose={setOpen}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-950 bg-opacity-75 transition-opacity" />
                    </Transition.Child>

                    <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                                enterTo="opacity-100 translate-y-0 sm:scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            >
                                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-slate-950 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
                                    <div>
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
                                            <PlusIcon className="h-6 w-6 text-secondary" aria-hidden="true" />
                                        </div>
                                        <div className="mt-3 text-center sm:mt-5">
                                            <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-slate-300">
                                                Create New Project
                                            </Dialog.Title>
                                            <div className="mt-2">
                                                <input
                                                    type="text"
                                                    name="urlname"
                                                    id="urlname"
                                                    autoComplete="urlname"
                                                    value={projectName}
                                                    onChange={(e) => setProjectName(e.target.value)}
                                                    className="flex-1 text-center border-1 pl-2 bg-slate-950 py-1.5 pl-1 text-white focus:ring-0 sm:text-sm sm:leading-6"
                                                    placeholder="My Awesome Project"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-5 sm:mt-6">
                                        <button
                                            type="button"
                                            className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                            onClick={() => createProject()}
                                        >
                                            {isLoading ? <LoadingSpinner/> : <>Create Project</>}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition.Root>
            <AccountLayout> {/* lg:right-0 lg:top-16 w-full xl:w-1/3 */}

                <div className="lg:pr-96">
                    <header className="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                        <h1 className="text-base font-semibold leading-7 text-white">Projects</h1>

                        <div className="flex">
                            <button
                                type="button"
                                onClick={() => setOpen(!open)}
                                className="flex inline-flex items-center rounded-md bg-tertiary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                            >
                                <PlusIcon className="h-4 w-4 mr-1"/>
                                Add New Project
                            </button>
                        </div>
                    </header>

                    {areProjectsLoading ?
                        <div className="relative flex justify-center pt-16 items-center">
                            <LoadingSpinner/>
                        </div>
                        : (<ul role="list" className="divide-y divide-white/5">
                        {projects && projects.map((deployment) => (
                            <li key={deployment.id} className="relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8">
                                <div className="min-w-0 flex-auto">
                                    <div className="flex items-center gap-x-3">
                                        <div className={classNames(statuses.online, 'flex-none rounded-full p-1')}>
                                            <div className="h-2 w-2 rounded-full bg-current" />
                                        </div>
                                        <h2 className="min-w-0 text-sm font-semibold leading-6 text-white">
                                            <a href={`/account/projects/${deployment.id}`} className="flex gap-x-2">
                                                <span className="truncate">EvanFlow Studio</span>
                                                <span className="text-gray-400">/</span>
                                                <span className="whitespace-nowrap">{deployment.name}</span>
                                                <span className="absolute inset-0" />
                                            </a>
                                        </h2>
                                    </div>
                                    <div className="mt-3 flex items-center gap-x-2.5 text-xs leading-5 text-gray-400">
                                        <p className="truncate">Deploys from GitHub</p>
                                        <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 flex-none fill-gray-300">
                                            <circle cx={1} cy={1} r={1} />
                                        </svg>
                                        <p className="whitespace-nowrap">Created <time
                                            dateTime={deployment.created}
                                            className=""
                                        >
                                            <span className="h-4 w-0.5 rounded-full bg-slate-500" />
                                            <span>{new Date(deployment.created).toLocaleDateString('en-US', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                                timeZone: 'UTC',
                                            })} @ {new Date(deployment.created).toLocaleTimeString('en-US', {
                                                timeZone: 'UTC',
                                            })}</span>
                                        </time></p>
                                    </div>
                                </div>
                                <div
                                    className={classNames(
                                        environments.Production,
                                        'rounded-full flex-none py-1 px-2 text-xs font-medium ring-1 ring-inset'
                                    )}
                                >
                                    Website
                                </div>
                                <ChevronRightIcon className="h-5 w-5 flex-none text-gray-400" aria-hidden="true" />
                            </li>
                        ))}
                    </ul>)}
                </div>


                <aside className="bg-black/10 lg:fixed lg:bottom-0 lg:right-0 lg:top-16 lg:w-96 lg:overflow-y-auto lg:border-l lg:border-white/5">
                    <header className="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                        <h2 className="text-base font-semibold leading-7 text-white">Activity feed</h2>
                    </header>
                    <ul role="list" className="divide-y divide-white/5">
                        {deployments?.results?.map((item) => (
                            <li key={item.sha} className="px-4 py-4 sm:px-6 lg:px-8">
                                <div className="flex items-center gap-x-3">
                                    <img src={item.userAvatar} alt="" className="h-6 w-6 flex-none rounded-full bg-slate-800" />
                                    <h3 className="flex-auto truncate text-sm font-semibold leading-6 text-white">{item.userLogin}</h3>
                                    <time dateTime={item.created} className="flex-none text-xs text-slate-400">
                                        {new Date(item.created).toLocaleDateString('en-US', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: '2-digit',
                                        })} @ {new Date(item.created).toLocaleTimeString('en-US')}
                                    </time>
                                </div>
                                <p className="mt-3 truncate text-sm text-slate-400">
                                    Pipeline run for <span className="text-gray-300 pr-1">{item.branch}</span>
                                    (<span className="font-mono text-gray-300">{item.sha.substring(0,5)}...</span>) was{' '}
                                    <span className="text-gray-300">{item.conclusion}</span>
                                </p>
                            </li>
                        ))}
                    </ul>
                </aside>

            </AccountLayout>
        </>
    )
}

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}