
import React, { useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import Home from './Home'
import Player from './Player'
import Feeds from '../components/Feeds'
import { ToastContainer } from 'react-toastify'
import QueueBooks from './QueueBooks'
import Profile from './Profile'
import MappedBooks from '../components/MappedBooks'
import QueueMappedBooks from '../components/QueueMappedBooks'
import { HomeIcon, UserIcon, MenuIcon, BadgeCheckIcon } from '@heroicons/react/outline'

const Pages = ({ user }) => {
    const [wholeData, setWholeData] = useState([])
    const [isOpen, setIsOpen] = useState(false)


    const handleMenuClick = () => setIsOpen(!isOpen)

    const commonClasses = "group flex items-center px-2 py-2 text-base font-medium rounded-md hover:bg-gray-600 hover:text-white text-gray-900 transition duration-[250ms] ease-in-out";
    const activeClasses = "bg-gray-900 hover:!bg-gray-900 !text-white";
    const activeIconClasses = "text-white";

    return (
        <>
            <ToastContainer />
           
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                                <Routes>
                                    <Route path="/" element={<Feeds user={user} />} />
                                    <Route path="/player" element={<Player user={user} />} />
                                    -                                    <Route path="/profile/completed" element={<Profile user={user} setWholeData={setWholeData} wholeData={wholeData} />} />
                                    -                                    <Route path="/mapped-books" element={<MappedBooks user={user} />} />
                                    -                                    <Route path="/profile/queue" element={<QueueBooks user={user} setWholeData={setWholeData} wholeData={wholeData} />} />
                                </Routes>
                            </div>
        </>

    )
}
export default Pages
