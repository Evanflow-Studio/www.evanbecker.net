import { CallToAction } from '@/components/CallToAction'
import { Faqs } from '@/components/Faqs'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { NewHero } from '@/components/NewHero'
import { Pricing } from '@/components/Pricing'
import { PrimaryFeatures } from '@/components/PrimaryFeatures'
import { SecondaryFeatures } from '@/components/SecondaryFeatures'
import { Testimonials } from '@/components/Testimonials'
import {Container} from "@/components/Container";
import {Button} from "@/components/Button";


export default function Home() {
  return (
    <>
      <Header />
      <main>
        <NewHero />
      </main>
      <Footer />
    </>
  )
}


