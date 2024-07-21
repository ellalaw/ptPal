// @/components/DummyPage.js
import React from 'react'
import BottomMenu from './bottomMenu'
import styles from './bottomMenu/bottomMenu.module.css'

export default function BottomMenuComponent({ title, children }) {
    return (
        <BottomMenu pageTitle={title}>
            <div className={`${styles.content_height} h-[90%] flex flex-col`}>
                <div className="m-auto">
                    <div className={`${styles.content_container} text-4xl`}>{title} content</div>
                    {children}
                    <div className="mt-5 tracking-normal underline bg-clip-content p-6 bg-violet-300 border-4 border-violet-300 border-dashed">paragraph a</div>
                    <div className={`${styles.content_style}`}>paragraph b</div>
                    <div className={`${styles.content_style}`}>paragraph c</div>
                </div>
            </div>
        </BottomMenu>
    )
}