import {Header} from "@/components/Header";
import {Container} from "@/components/Container";
import {Footer} from "@/components/Footer";

export default function Shop() {
    return (
        <>
            <Header/>

            <Container className="mt-8 sm:mt-16 w-full">
                <h1 className="text-4xl font-bold tracking-tight text-light sm:text-5xl text-slate-200">
                    Shop
                </h1>
                <div className="mt-6 space-y-7 text-base text-slate-300">
                    <p>
                        A tagged list of (randomly assorted) resources that I&apos;ve found
                        useful, fun, or interesting.
                        Have fun and look around 👀!
                    </p>
                </div>
                <div className="">
                </div>

            </Container>
            <Footer/>
        </>
    )
}