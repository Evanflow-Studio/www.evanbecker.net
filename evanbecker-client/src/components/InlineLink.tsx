import Link from 'next/link'

export function InlineLink({
  href,
  children
}: { href: string; children?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-light underline hover:text-tertiary"
    >
      {children}
    </Link>
  )
}