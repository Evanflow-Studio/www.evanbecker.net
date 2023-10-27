import {AccountLayout} from "@/components/Account/AccountLayout";
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/20/solid'

export default function AccountServiceStatus () {
    return (
        <AccountLayout>
            <div className="p-6">
                <h3 className="text-base font-semibold leading-6 text-slate-400">This Months Stats</h3>
                <dl className="mt-5 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg shadow md:grid-cols-3 md:divide-x md:divide-y-0">
                    {stats.map((item) => (
                        <div key={item.name} className="px-4 py-5 sm:p-6">
                            <dt className="text-base font-normal text-slate-400">{item.name}</dt>
                            <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
                                <div className="flex items-baseline text-2xl font-semibold text-tertiary">
                                    {item.stat}
                                    <span className="ml-2 text-sm font-medium text-slate-400">from {item.previousStat}</span>
                                </div>

                                <div
                                    className={classNames(
                                        item.changeType === 'increase' ? 'bg-tertiary text-green-100' : 'bg-red-800 text-red-100',
                                        'inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0'
                                    )}
                                >
                                    {item.changeType === 'increase' ? (
                                        <>
                                            <ArrowUpIcon
                                                className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-green-100 absolute"
                                                aria-hidden="true"
                                            />
                                            <ArrowUpIcon
                                                className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-green-100 animate-ping"
                                                aria-hidden="true"
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <ArrowDownIcon
                                                className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-green-100 absolute"
                                                aria-hidden="true"
                                            />
                                            <ArrowDownIcon
                                                className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-green-100 animate-ping"
                                                aria-hidden="true"
                                            />
                                        </>
                                    )}

                                    <span className="sr-only"> {item.changeType === 'increase' ? 'Increased' : 'Decreased'} by </span>
                                    {item.change}
                                </div>
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
        </AccountLayout>
    )
}

const stats = [
    { name: 'Comments', stat: '71,897', previousStat: '70,946', change: '12%', changeType: 'increase' },
    { name: 'New Users', stat: '58.16%', previousStat: '56.14%', change: '2.02%', changeType: 'increase' },
    { name: 'Avg. Click Rate', stat: '24.57%', previousStat: '28.62%', change: '4.05%', changeType: 'decrease' },
]

function classNames(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
