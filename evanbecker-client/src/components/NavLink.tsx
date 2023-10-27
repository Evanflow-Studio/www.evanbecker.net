import Link from 'next/link'

export function NavLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="inline-block rounded-lg px-2 py-1 text-sm text-light text-slate-200 hover:bg-slate-700 hover:text-slate-300"
    >
      {children}
    </Link>
  )
}
