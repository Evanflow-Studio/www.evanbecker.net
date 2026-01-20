import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export default function NotFound() {
  return (
    <>
      <Header />
      <Container className="flex h-full items-center pt-16 sm:pt-32">
        <div className="flex flex-col items-center">
          <p className="text-base font-semibold text-slate-500">🧭 404 🔍</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl">
            Page not found
          </h1>
          <p className="mt-4 text-base text-slate-400">
            Sorry, I couldn’t find the page you’re looking for.
          </p>
          <Button href="/" variant="solid" color="blue" className="mt-4">
            Go back home
          </Button>
        </div>
      </Container>
      <Footer />
    </>
  )
}
