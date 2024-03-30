
import React, { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './Home'
import Player from './Player'
import Feeds from '../components/Feeds'
import { ToastContainer } from 'react-toastify'
import QueueBooks from './QueueBooks'
import Profile from './Profile'

const Pages = ({ user }) => {
    const [wholeData, setWholeData] = useState([])

    return (
        <>
            <ToastContainer />
            <Routes>
                <Route path="/" element={<Feeds user={user} />} />
                {/* <Route path="/" element={<Home user={user} />} /> */}
                <Route path='/player' element={<Player user={user} />} />
                <Route path='/profile' element={<Profile user={user} setWholeData = {setWholeData } wholeData = {wholeData}/>} />
                <Route path='/profile/queue' element={<QueueBooks user={user} setWholeData={setWholeData} wholeData={wholeData} />} />
            </Routes>

        </>
    )
}

export default Pages