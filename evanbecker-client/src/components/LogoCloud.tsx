import Image from 'next/image'
import milwaukeeToolLogo from '@/images/logos/milwaukee-tool.svg'
import alliantEnergyLogo from '@/images/logos/alliant-energy.svg'
import generacLogo from '@/images/logos/generac.png'
import silganLogo from '@/images/logos/silgan.png'

export function LogoCloud() {
    return (
      <div className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto grid max-w-lg grid-cols-4 items-center gap-x-8 gap-y-12 sm:max-w-xl sm:grid-cols-6 sm:gap-x-10 sm:gap-y-14 lg:mx-0 lg:max-w-none lg:grid-cols-4">
            <Image
              className="col-span-2 max-h-12 w-full object-contain lg:col-span-1"
              src={milwaukeeToolLogo}
              alt="Milwaukee Electric Tool"
              width={158}
              height={48}
            />
            <Image
              className="col-span-2 max-h-12 w-full object-contain lg:col-span-1"
              src={alliantEnergyLogo}
              alt="Alliant Energy"
              width={158}
              height={48}
            />
            <Image
              className="col-span-2 max-h-12 w-full object-contain lg:col-span-1"
              src={generacLogo}
              alt="Generac"
              width={158}
              height={48}
            />
            <Image
              className="col-span-2 max-h-12 w-full object-contain sm:col-start-2 lg:col-span-1"
              src={silganLogo}
              alt="Silgan"
              width={158}
              height={48}
            />
          </div>
        </div>
      </div>
    )
  }