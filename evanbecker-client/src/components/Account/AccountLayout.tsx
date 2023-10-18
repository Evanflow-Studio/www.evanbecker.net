"use client";

import { useState } from 'react'

import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/20/solid'

import { AccountSidebar } from "@/components/Account/AccountSidebar";
import {AccountSearch} from "@/components/Account/AccountSearch";
import {AccountTab} from "@/components/Account/AccountTab";






export function AccountLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div>
            <AccountSidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}/>

            <div className="xl:pl-72">
                <AccountSearch setSidebarOpen={setSidebarOpen}/>

                <main>{children}</main>
            </div>
        </div>
    );
}