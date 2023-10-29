'use client'

import { useContext } from 'react'
import { useRouter } from 'next/navigation'

import { AppContext } from '@/app/providers'
import { BlogContainer } from '@/components/BlogContainer'
import { Prose } from '@/components/Prose'
import { type ArticleWithSlug } from '@/lib/articles'
import { formatDate } from '@/lib/formatDate'
import {Header} from "@/components/Header";
import {Footer} from "@/components/Footer";
import {CommentSection} from "@/components/CommentSection";

function ArrowLeftIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
    return (
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
            <path
                d="M7.25 11.25 3.75 8m0 0 3.5-3.25M3.75 8h8.5"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export function ArticleLayout({
                                  article,
                                  children,
                              }: {
    article: ArticleWithSlug
    children: React.ReactNode
}) {
    let router = useRouter()
    let { previousPathname } = useContext(AppContext)

    return (
        <>
            <Header/>
            <BlogContainer className="mt-8 lg:mt-16">
                <div className="xl:relative">
                    <div className="mx-auto max-w-2xl">
                        {(
                            <button
                                type="button"
                                onClick={() => {
                                    if (previousPathname)
                                        router.back()
                                    else
                                        router.push('/');
                                }}
                                aria-label="Go back to articles"
                                className="group mb-8 flex h-10 w-10 items-center justify-center rounded-full shadow-md transition border border-slate-700/50 bg-slate-800 ring-0 hover:border-slate-700 hover:ring-white/20 lg:absolute lg:-left-5 lg:-mt-2 lg:mb-0 xl:-top-1.5 xl:left-0 xl:mt-0"
                            >
                                <ArrowLeftIcon className="h-4 w-4 stroke-slate-500 transition group-hover:stroke-slate-700 stroke-slate-300 group-hover:stroke-slate-100" />
                            </button>
                        )}
                        <article>
                            <header className="flex flex-col">
                                <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl">
                                    {article.title}
                                </h1>
                                <time
                                    dateTime={article.date}
                                    className="order-first flex items-center text-base text-slate-400"
                                >
                                    <span className="h-4 w-0.5 rounded-full bg-slate-500" />
                                    <span className="ml-3">{formatDate(article.date)}</span>
                                </time>
                            </header>
                            <Prose className="mt-8 text-slate-300" data-mdx-content>
                                {children}
                            </Prose>
                        </article>
                    </div>
                </div>
            </BlogContainer>
            <CommentSection/>
            <Footer/>

        </>
    )
}
