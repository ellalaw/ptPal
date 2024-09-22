// @/components/DummyPage.js
"use client";
import Link from 'next/link'
import React from 'react'
import { useRouter } from 'next/navigation'

import BottomMenu from './bottomMenu' // useless
import styles from './bottomMenu/bottomMenu.module.css'

export default function BottomMenuComponent({ title, children }) {
    const router = useRouter();
    const MenuItem = ({ icon, name, route }) => {
        const colorClass = 'bg-indigo-200';//router.pathname === route ? "text-white" : "text-white/50 hover:text-white";

        return (
            <Link
                href={route}
                className={`${colorClass} ${styles.menu_box} text-center basis-1/2 hover:bg-indigo-500`}
            >
                <div className={`${styles.menu_text}`}>{name}</div>
            </Link>
        )
    }

    return (
        <div className="flex flex-col flex-grow w-screen">
            <div className={`${styles.content_height} flex flex-col`}>
                <div className="m-auto">
                    <div className={`${styles.content_container} text-4xl`}>{title} content</div>
                    {children}
                    <div className="mt-5 tracking-normal underline bg-clip-content p-6 bg-violet-300 border-4 border-violet-300 border-dashed">paragraph a</div>
                    <div className={`${styles.content_style}`}>paragraph b</div>
                </div>
            </div>

            <div className={`${styles.bottom_height} flex flex-row w-screen`}>
                <MenuItem name="Home" route="/a1" />&nbsp;
                <MenuItem name="Planner" route="/a2" />&nbsp;
                <MenuItem name="Me" route="/user-profile" />
            </div>

        </div>
    )
}
