import React from 'react'
//import DummyPage from '../../../_components/DummyPage'
import BottomMenuComponent from '@components/BottomMenuComponent'

async function getData() {
    // fake user profile infomation
    const user = await fetch(`${process.env.BASE_URL}` + '/user-profile/api', { cache: 'no-store' })
    //const user = await fetch(`${process.env.BASE_URL}` + '/api/user-profile', { cache: 'no-store' })
    return user.json()
}

export default async function ContactPage() {
    const data = await getData()
    return (
        <BottomMenuComponent title="About me">
            <div>
                <p>user profile</p>
                <ul>
                    <li>{ data.name }</li>
                    <li>{ data.email }</li>
                    <li>{ data.info1 }</li>
                    <li>{ data.info2 }</li>
                    <li>{ data.info3 }</li>
                </ul>
            </div>
        </BottomMenuComponent>
    )
}