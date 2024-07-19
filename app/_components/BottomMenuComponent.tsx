// @/components/DummyPage.js
import React from 'react'
import BottomMenu from './bottomMenu'
import styles from './bottomMenu/bottomMenu.module.css'

export default function BottomMenuComponent({ title, children }) {
    return (
        <BottomMenu pageTitle={title}>
            <div className={`${styles.content_height} flex flex-col`}>
                <div className="m-auto">
                    <div className={`${styles.content_container} text-4xl`}>{title} content</div>
                    {children}
                </div>
            </div>
        </BottomMenu>
    )
}