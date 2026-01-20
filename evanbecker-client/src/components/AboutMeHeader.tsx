import { ChevronDownIcon } from '@heroicons/react/16/solid'
import { useState } from 'react'
import { InlineLink } from '@/components/InlineLink'

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

export default function AboutMeHeader() {

  const [selectedTab, setSelectedTab] = useState({name: 'Alliant Energy'})

  const [tabs, setTabs] = useState([
    { name: 'Alliant Energy', href: '#', current: true },
    { name: 'Milwaukee Tool', href: '#', current: false },
    { name: 'Generac', href: '#', current: false },
    { name: 'Silgan', href: '#', current: false },
    { name: 'Internal', href: '#', current: false }
  ])

  function switchTab(tab: {name: string, current: boolean}) {
    const y = [...tabs]
    y.forEach((x) => {
      if (x.name === tab.name){
        x.current = true
        setSelectedTab(x)
      }
      x.current = x.name === tab.name
    })
    setTabs(y)
  }

  return (
    <div className="pb-5 sm:pb-0">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white pb-2">
        Client Highlights
      </h3>
      <div className="mt-3 pb-4 sm:mt-4">
        <div className="grid grid-cols-1 sm:hidden">
          {/* Use an "onChange" listener to redirect the user to the selected tab URL. */}
          <select
            defaultValue={tabs.find((tab) => tab.current)!.name}
            aria-label="Select a tab"
            className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-2 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-slate-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:*:bg-gray-800 dark:focus:outline-white"
          >
            {tabs.map((tab) => (
              <option key={tab.name}>{tab.name}</option>
            ))}
          </select>
          <ChevronDownIcon
            aria-hidden="true"
            className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-gray-500 dark:fill-gray-400"
          />
        </div>
        <div className="hidden sm:block">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <a
                key={tab.name}
                onClick={() => switchTab(tab)}
                aria-current={tab.current ? 'page' : undefined}
                className={classNames(
                  tab.current
                    ? 'border-slate-400 text-slate-200'
                    : 'cursor-pointer border-transparent text-gray-400 hover:border-white/20 hover:text-white',
                  'border-b-2 px-1 pb-4 text-sm font-medium whitespace-nowrap',
                )}
              >
                {tab.name}
              </a>
            ))}
          </nav>
        </div>
      </div>
      {selectedTab?.name === 'Alliant Energy' && (
        <p>
          I helped design the architecture for monitoring servers and devices to
          support{' '}
          <InlineLink href="https://www.nerc.com/standards/reliability-standards/cip">
            NERC CIP
          </InlineLink>{' '}
          compliance. The system collected detailed information, including OS
          and hardware specs, open ports, running processes, and installed
          software versions. This initiative was recognized internally at
          Alliant as the highest-priority project of the year, reflecting its importance to
          the organization’s security and compliance efforts.
        </p>
      )}
      {selectedTab?.name === 'Milwaukee Tool' && (
        <p>
          I contributed to the VIPER project, an internal platform integrating
          product design lifecycles across teams. The tool has been described as
          a “mini Azure DevOps” for mechanical and electrical engineers,
          connecting engineering work with business and financial milestones.
          Later, I supported ongoing VIPER and{' '}
          <InlineLink href="https://www.stiletto.com/">Stiletto</InlineLink>{' '}
          initiatives before transitioning to the Connect project, which serves
          as the primary portal for Milwaukee Tool resellers, enabling order
          placement, warranty management, and other business processes.
        </p>
      )}
      {selectedTab?.name === 'Generac' && (
        <p>
          I helped design and develop the{' '}
          <InlineLink href="https://www.youtube.com/watch?v=8_9UBvhhBKE">
            PowerPlay
          </InlineLink>{' '}
          platform, a progressive web application guiding users through
          generator selection, estimating, planning, and signing proposals.
        </p>
      )}

      {selectedTab?.name === 'Silgan' && (
        <p>
          I architected and developed their customer support platform, enabling
          customers to log in and receive assistance with a variety of
          product-related issues.
        </p>
      )}

      {selectedTab?.name === 'Internal' && (
        <p>
          At nvisia, my work extends past architecture and development. I’ve
          contributed to shaping client proposals and responses to RFPs, served
          as a “voice of the customer” for our marketing team, and participated
          on the{' '}
          <InlineLink href="https://www.linkedin.com/posts/dnhenry_maythe4thbewithyou-activity-6927640270729580544-VczN/">
            JEDI Award
          </InlineLink>{' '}
          board after receiving the award myself. I also focus on exploring AI
          applications and emerging technologies to help our clients innovate.
        </p>
      )}
    </div>
  )
}
