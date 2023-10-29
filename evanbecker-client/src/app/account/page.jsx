"use client";

import {useEffect, useState} from 'react'
import {AccountLayout} from "@/components/Account/AccountLayout";
import LoadingSpinnerLarge from "../../components/LoadingSpinnerLarge";


const secondaryNavigation = [


    { name: 'Overview', href: '#', current: true },
]
const stats = [


    { name: 'Number of pipeline runs', value: '405', unit: null },
    { name: 'Average pipeline time', value: '3.65', unit: 'mins' },
    { name: 'Number of domains', value: '3', unit: null },
    { name: 'Pipeline success rate', value: '98.5%', unit: null },
]
const statuses = { Completed: 'text-green-400 bg-green-400/10', Error: 'text-rose-400 bg-rose-400/10' }
const activityItems = [


    {
        user: {
            name: 'Michael Foster',
            imageUrl:
                'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
        commit: '2d89f0c8',
        branch: 'main',
        status: 'Completed',
        duration: '25s',
        date: '45 minutes ago',
        dateTime: '2023-01-23T11:00',
    },
    // More items...
]

function classNames(...classes){
    return classes.filter(Boolean).join(' ')
}

export default function Dashboard() {

    const [isDashboardLoading, setIsDashboardLoading] = useState(false);
    const [dashboardItems, setDashboardItems] = useState({});

    const getDashboardMetrics = async () => {
        setIsDashboardLoading(true);
        try {
            const call = await fetch(`${process.env.NEXT_PUBLIC_API_URL}api/v1/project/dashboard`, {
                method: "GET",
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: "cors",
            });
            let newDashboardItems = await call.json();
            console.log(newDashboardItems);
            setDashboardItems(newDashboardItems)

        } catch (e) {
            console.error("Something didn't work", e);
        }

        setIsDashboardLoading(false);
    }

    const buildPipelineSuccessRateState = (successRate) => {
        if (parseFloat(successRate) < 50)
        {
            return (<p className="mt-2 flex items-baseline gap-x-2">
                <span className="text-4xl font-semibold tracking-tight text-red-600">{successRate}%</span>
            </p>)
        }

        if (parseFloat(successRate) < 75)
        {
            return (<p className="mt-2 flex items-baseline gap-x-2">
                <span className="text-4xl font-semibold tracking-tight text-yellow-600">{successRate}%</span>
            </p>)
        }

        return (<p className="mt-2 flex items-baseline gap-x-2">
            <span className="text-4xl font-semibold tracking-tight text-tertiary">{successRate}%</span>
        </p>)
    }

    const environmentTag = (env) => {
        switch(env) {
            case "Dev":
            case "dev":
                return (<div className="rounded-full bg-indigo-400/10 px-2 py-1 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-400/30 ">
                    {env}
                </div>);
            case "Test":
            case "test":
                return (<div className="rounded-full bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-400/30 ">
                    {env}
                </div>);
            case "UAT":
            case "uat":
            case "Uat":
                return (<div className="rounded-full bg-green-400/10 px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-400/30 ">
                    {env}
                </div>);
            case "Stage":
            case "stage":
                return (<div className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/30 ">
                    {env}
                </div>);
            case "prod":
            case "Prod":
            case "production":
            case "Production":
                return (<div className="rounded-full bg-tertiary/10 px-2 py-1 text-xs font-medium text-tertiary ring-1 ring-inset ring-tertiary/30 ">
                    {env}
                </div>);
        }
    }

    useEffect(() => {
        getDashboardMetrics().then();
    }, [])

    return (
        <>
            <AccountLayout>
                <main>
                        <header>
                            {/* Secondary navigation */}
                            <nav className="flex overflow-x-auto border-b border-white/10 py-4">
                                <ul
                                    role="list"
                                    className="flex min-w-full flex-none gap-x-6 px-4 text-sm font-semibold leading-6 text-gray-400 sm:px-6 lg:px-8"
                                >
                                    {secondaryNavigation.map((item) => (
                                        <li key={item.name}>
                                            <a href={item.href} className={item.current ? 'text-secondary' : ''}>
                                                {item.name}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>

                            {isDashboardLoading && <LoadingSpinnerLarge/>}

                            {dashboardItems?.dashboardCards?.map(card => (
                                <div className="border-b border-slate-500/75">
                                    <div className="flex flex-col items-start justify-between gap-x-8 gap-y-4 bg-gray-700/10 px-4 py-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-x-3">
                                                <div className="flex-none rounded-full bg-green-400/10 p-1 text-green-400">
                                                    <div className="h-2 w-2 rounded-full bg-current" />
                                                </div>
                                                <h1 className="flex gap-x-3 text-base leading-7">
                                                    <span className="font-semibold text-white">{card.projectName}</span>
                                                    <span className="text-gray-600">/</span>
                                                    <span className="font-semibold text-white">{card.type}</span>
                                                </h1>
                                            </div>
                                            <p className="mt-2 text-xs leading-6 text-gray-400">Deploys from GitHub via `main` branch</p>
                                        </div>

                                        {card.environmentNames?.map(environmentTag)}

                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-1 bg-gray-700/10 sm:grid-cols-2 lg:grid-cols-4">
                                        <div className='lg:border-l border-t border-white/5 py-6 px-4 sm:px-6 lg:px-8'>
                                            <p className="text-sm font-medium leading-6 text-gray-400">Number of pipeline runs</p>
                                            <p className="mt-2 flex items-baseline gap-x-2">
                                                <span className="text-4xl font-semibold tracking-tight text-white">{card.numberOfPipelineRuns}</span>
                                            </p>
                                        </div>
                                        <div className='sm:border-l border-t border-white/5 py-6 px-4 sm:px-6 lg:px-8'>
                                            <p className="text-sm font-medium leading-6 text-gray-400">Average pipeline time</p>
                                            <p className="mt-2 flex items-baseline gap-x-2">
                                                <span className="text-4xl font-semibold tracking-tight text-white">{card.averagePipelineTime}</span>
                                                <span className="text-sm text-gray-400">mins</span>
                                            </p>
                                        </div>
                                        <div className='lg:border-l border-t border-white/5 py-6 px-4 sm:px-6 lg:px-8'>
                                            <p className="text-sm font-medium leading-6 text-gray-400">Number of domains</p>
                                            <p className="mt-2 flex items-baseline gap-x-2">
                                                <span className="text-4xl font-semibold tracking-tight text-white">{card.numberOfDomains}</span>
                                            </p>
                                        </div>
                                        <div
                                            className='sm:border-l border-t border-white/5 py-6 px-4 sm:px-6 lg:px-8'
                                        >
                                            <p className="text-sm font-medium leading-6 text-gray-400">Pipeline success rate</p>
                                            {buildPipelineSuccessRateState(card.pipelineSuccessRate)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </header>

                        {/* Activity list */}
                        <div className="border-t border-white/10 pt-11">
                            <h2 className="px-4 text-base font-semibold leading-7 text-white sm:px-6 lg:px-8">Latest pipeline activity</h2>
                            {isDashboardLoading && <LoadingSpinnerLarge/>}
                            {!isDashboardLoading && (
                                <table className="mt-6 w-full whitespace-nowrap text-left">
                                    <colgroup>
                                        <col className="w-full sm:w-4/12" />
                                        <col className="lg:w-4/12" />
                                        <col className="lg:w-2/12" />
                                        <col className="lg:w-1/12" />
                                        <col className="lg:w-1/12" />
                                    </colgroup>
                                    <thead className="border-b border-white/10 text-sm leading-6 text-white">
                                    <tr>
                                        <th scope="col" className="py-2 pl-4 pr-8 font-semibold sm:pl-6 lg:pl-8">
                                            User
                                        </th>
                                        <th scope="col" className="hidden py-2 pl-0 pr-8 font-semibold sm:table-cell">
                                            Commit
                                        </th>
                                        <th scope="col" className="py-2 pl-0 pr-4 text-right font-semibold sm:pr-8 sm:text-left lg:pr-20">
                                            Status
                                        </th>
                                        <th scope="col" className="hidden py-2 pl-0 pr-8 font-semibold md:table-cell lg:pr-20">
                                            Duration
                                        </th>
                                        <th
                                            scope="col"
                                            className="hidden py-2 pl-0 pr-4 text-right font-semibold sm:table-cell sm:pr-6 lg:pr-8"
                                        >
                                            Pipeline ran at
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                    {dashboardItems?.latestDeployments?.map((item) => (
                                        <tr key={item.sha}>
                                            <td className="py-4 pl-4 pr-8 sm:pl-6 lg:pl-8">
                                                <div className="flex items-center gap-x-4">
                                                    <img src={item.userAvatar} alt="" className="h-8 w-8 rounded-full bg-slate-800" />
                                                    <div className="truncate text-sm font-medium leading-6 text-white">{item.userLogin}</div>
                                                </div>
                                            </td>
                                            <td className="hidden py-4 pl-0 pr-4 sm:table-cell sm:pr-8">
                                                <div className="flex gap-x-3">
                                                    <div className="font-mono text-sm leading-6 text-gray-400">{item.sha}</div>
                                                    <span className="inline-flex items-center rounded-md bg-gray-400/10 px-2 py-1 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-400/20">
                                                    {item.branch}
                                                </span>
                                                </div>
                                            </td>
                                            <td className="py-4 pl-0 pr-4 text-sm leading-6 sm:pr-8 lg:pr-20">
                                                <div className="flex items-center justify-end gap-x-2 sm:justify-start">
                                                    <time className="text-gray-400 sm:hidden" dateTime={item.created}>
                                                        {item.date}
                                                    </time>
                                                    <div className={classNames(item.conclusion == "Success" ? statuses.Completed : statuses.Error, 'flex-none rounded-full p-1')}>
                                                        <div className="h-1.5 w-1.5 rounded-full bg-current" />
                                                    </div>
                                                    <div className="hidden text-white sm:block">{item.conclusion}</div>
                                                </div>
                                            </td>
                                            <td className="hidden py-4 pl-0 pr-8 text-sm leading-6 text-gray-400 md:table-cell lg:pr-20">
                                                {item.duration}
                                            </td>
                                            <td className="hidden py-4 pl-0 pr-4 text-right text-sm leading-6 text-gray-400 sm:table-cell sm:pr-6 lg:pr-8">
                                                <time dateTime={item.dateTime}>{item.created}</time>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            )}

                        </div>
                    </main>
            </AccountLayout>
        </>
    )
}