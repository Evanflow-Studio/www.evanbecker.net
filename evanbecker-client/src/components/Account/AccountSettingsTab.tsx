const secondarySettingsNavigation = [
    { name: 'Account', href: '#', current: true },
]


export function AccountSettingsTab()
{
    return (
        <header className="border-b border-white/5">
            {/* Secondary navigation */}
            <nav className="flex overflow-x-auto py-4">
                <ul
                    role="list"
                    className="flex min-w-full flex-none gap-x-6 px-4 text-sm font-semibold leading-6 text-gray-400 sm:px-6 lg:px-8"
                >
                    {secondarySettingsNavigation.map((item) => (
                        <li key={item.name}>
                            <a href={item.href} className={item.current ? 'text-secondary' : ''}>
                                {item.name}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </header>
    );
}