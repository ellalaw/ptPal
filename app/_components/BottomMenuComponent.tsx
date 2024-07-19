// @/components/DummyPage.js
import React from 'react'
//import Layout from './sidebar'
import BottomMenu from './bottomMenu'

export default function BottomMenuComponent({ title, children }) {
    return (
        <BottomMenu pageTitle={title}>
            <div className="h-5/6 flex flex-col">
                <div className="m-auto">
                    <h1 className="text-4xl">{title} content</h1>
                    {children}
                </div>
            </div>
        </BottomMenu>
    )
}