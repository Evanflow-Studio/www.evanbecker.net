import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { NewHero } from '@/components/NewHero'
import { Container } from '@/components/Container'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <NewHero />
        <Container className="mt-24 md:mt-28"></Container>
      </main>
      <Footer />
    </>
  )
}
