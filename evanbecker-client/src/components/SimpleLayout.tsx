import { Container } from '@/components/Container'
import {Header} from "@/components/Header";
import {Footer} from "@/components/Footer";

export function SimpleLayout({
                                 title,
                                 intro,
                                 children,
                             }: {
    title: string
    intro: string
    children?: React.ReactNode
}) {
    return (
        <>
            <Header/>
            <Container className="mt-8 sm:mt-16">
                <header className="max-w-2xl">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl">
                        {title}
                    </h1>
                    <p className="mt-6 text-base text-slate-400">
                        {intro}
                    </p>
                </header>
                {children && <div className="mt-16 sm:mt-20">{children}</div>}
            </Container>
            <Footer/>
        </>
    )
}
