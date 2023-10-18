'use client'

import { useEffect, useId, useState } from 'react'
import Image from 'next/image'
import { Tab } from '@headlessui/react'
import clsx from 'clsx'
import { DiamondIcon } from '@/components/DiamondIcon'
import { LogoCloud } from '@/components/LogoCloud'

const jobs = [
    {
        name: "nvisia",
        span: "Sep. 2019 - "
    },
    {
        name: "Mitutoyo",
        span: "Aug. 2018 - Aug. 2019"
    },
    {
        name: "Stack41",
        span: "Jan. 2018 - Aug. 2018"
    },
    {
        name: "UW - Milwaukee",
        span: "Jan. 2016 - Jan. 2018"
    },
    {
        name: "PRO-CAST, Inc",
        span: "Jan. 2014 - Nov. 2015"
    }
]

export function WorkHistory() {
    let id = useId()
    let [tabOrientation, setTabOrientation] = useState('horizontal')

    useEffect(() => {
        let lgMediaQuery = window.matchMedia('(min-width: 1024px)')
    
        function onMediaQueryChange({ matches }: { matches: boolean }) {
          setTabOrientation(matches ? 'vertical' : 'horizontal')
        }
    
        onMediaQueryChange(lgMediaQuery)
        lgMediaQuery.addEventListener('change', onMediaQueryChange)
    
        return () => {
          lgMediaQuery.removeEventListener('change', onMediaQueryChange)
        }
      }, [])

      return (
        <section
          id="speakers"
          aria-labelledby="speakers-title"
          className="py-2 sm:py-4"
        >
          <div className={clsx('mx-auto max-w-7xl px-4 sm:px-6 lg:px-8')}>
            <div className="mx-auto max-w-2xl lg:mx-0">
              <h2
                id="work-history-title"
                className="font-display text-4xl font-medium tracking-tighter sm:text-4xl"
              >
                Experiences
              </h2>
            </div>
            <Tab.Group
              as="div"
              className="mt-14 grid grid-cols-1 items-start gap-x-8 gap-y-8 sm:mt-8 sm:gap-y-16 lg:grid-cols-4"
              vertical={tabOrientation === 'vertical'}
            >
              <div className="relative -mx-4 flex overflow-x-auto pb-4 sm:mx-0 sm:block sm:overflow-visible sm:pb-0">
                <div className="absolute bottom-0 left-0.5 top-2 hidden w-px bg-slate-200 lg:block" />
                <Tab.List className="grid auto-cols-auto grid-flow-col justify-start gap-x-8 gap-y-10 whitespace-nowrap px-4 sm:mx-auto sm:max-w-2xl sm:grid-cols-3 sm:px-0 sm:text-center lg:grid-flow-row lg:grid-cols-1 lg:text-left">
                  {({ selectedIndex }) => (
                    <>
                      {jobs.map((job, dayIndex) => (
                        <div key={job.name} className="relative lg:pl-8">
                          <DiamondIcon
                            className={clsx(
                              'absolute left-[-0.5px] top-[0.5625rem] hidden h-1.5 w-1.5 overflow-visible lg:block',
                              dayIndex === selectedIndex
                                ? 'fill-blue-600 stroke-blue-600'
                                : 'fill-transparent stroke-slate-400',
                            )}
                          />
                          <div className="relative">
                            <div
                              className={clsx(
                                'text-sm',
                                dayIndex === selectedIndex
                                  ? 'text-blue-600'
                                  : 'text-slate-500',
                              )}
                            >
                              <Tab className="ui-not-focus-visible:outline-none">
                                <span className="absolute inset-0" />
                                {job.span}
                              </Tab>
                            </div>
                            <div
                              className="mt-1.5 block text-2xl font-semibold tracking-tight"
                            >
                              {job.name}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </Tab.List>
              </div>
              <Tab.Panels className="lg:col-span-3">
                <Tab.Panel
                    key="nvisia"
                    className="grid grid-cols-1 gap-x-8 gap-y-10 ui-not-focus-visible:outline-none"
                    unmount={false}
                >
                    At nvisia, I&apos;ve gotten to share and speak to my expertise in Software Architecture and Agile processes at some of the largest enterprises in Wisconsin, 
                    such as Milwaukee Tool, Alliant Energy, Generac, and Silgan. 
                    <LogoCloud/>
                    At nvisia, we have been able to build a reputation as experts in the Milwaukee area due to our ability to solve very difficult problems.                    
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </div>
        </section>
      )
}