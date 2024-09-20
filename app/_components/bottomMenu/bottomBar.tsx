"use client";

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './bottomMenu.module.css'

export default function BottomBar() {
    const router = useRouter();
    //console.log("bottom bar:" + router);

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
        <>
            <div className={`${styles.bottom_height} h-[10%] flex flex-row`}>
                <MenuItem name="Home" route="/a1" />&nbsp;
                <MenuItem name="Planner" route="/a2" />&nbsp;
                <MenuItem name="Me" route="/user-profile" />
            </div>
        </>
    )
}
