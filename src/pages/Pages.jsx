
import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './Home'
import Player from './Player'
import Feeds from '../components/Feeds'
import { ToastContainer } from 'react-toastify'

const Pages = ({ user }) => {
    return (
        <>
                <ToastContainer />
            <Routes>
                <Route path="/" element={<Feeds user={user} />} />
                {/* <Route path="/" element={<Home user={user} />} /> */}
                <Route path='/player' element={<Player user={user} />} />
            </Routes>

        </>
    )
}

export default Pages