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
      className="inline-block rounded-lg px-2 py-1 text-sm text-light hover:bg-slate-700 hover:text-slate-900"
    >
      {children}
    </Link>
  )
}
