//"use client";

import Link from 'next/link'
//import { useRouter } from 'next/router'

export default function BottomBar() {
    //const router = useRouter();

    const MenuItem = ({ icon, name, route }) => {
        const colorClass = 'bg-indigo-200';//router.pathname === route ? "text-white" : "text-white/50 hover:text-white";

        return (
            <Link
                href={route}
                className="basis-1/2"
            >
                <div className={`${colorClass} h-14 text-center hover:bg-indigo-500`}>{name}</div>
            </Link>
        )
    }

    return (
        <>
            <div className="h-1/5 flex flex-row">
                <MenuItem name="Home" route="/a1" />&nbsp;
                <MenuItem name="Planner" route="/a2" />&nbsp;
                <MenuItem name="Me" route="/a3" />
            </div>
        </>
    )
}