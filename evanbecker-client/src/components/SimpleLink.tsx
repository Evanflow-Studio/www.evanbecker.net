export function SimpleLink({
                            href,
                            children,
                        }: {
    href: string
    children: React.ReactNode
}) {
    return (
            <a href={href}
               className="inline-flex relative after:bg-secondary after:absolute after:h-0.5 after:w-0 after:bottom-0 after:left-0 hover:after:w-full after:transition-all after:duration-300 cursor-pointer">
                {children}
            </a>

    )
}