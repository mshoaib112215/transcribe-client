
import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './Home'
import Player from './Player'
import Feeds from '../components/Feeds'

const Pages = ({ user }) => {
    return (
        <>
            <Routes>
                <Route path="/feeds" element={<Feeds user={user} />} />
                <Route path="/" element={<Home user={user} />} />
                <Route path='player' element={<Player user={user} />} />
            </Routes>

        </>
    )
}

export default Pages