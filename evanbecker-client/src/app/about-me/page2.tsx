import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { BannerProfile } from '@/components/BannerProfile'
import { WorkHistory } from '@/components/WorkHistory'

export default function About() {
    return (
        <>
          <Header />
          <main>
            <BannerProfile/>
            <WorkHistory/>
          </main>
          <Footer />
        </>
      )
}