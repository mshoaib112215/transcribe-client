
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
    const [wholeDataMap, setWholeDataMap] = useState([])
    const [isOpen, setIsOpen] = useState(false)
    const [data, setData] = useState([])
    const [feeds, setFeeds] = useState([])
    const handleMenuClick = () => setIsOpen(!isOpen)

    const commonClasses = "group flex items-center px-2 py-2 text-base font-medium rounded-md hover:bg-gray-600 hover:text-white text-gray-900 transition duration-[250ms] ease-in-out";
    const activeClasses = "bg-gray-900 hover:!bg-gray-900 !text-white";
    const activeIconClasses = "text-white";

    return (
        <>
            <ToastContainer />
            {/* <div className={`flex h-screen bg-gray-100`}>

                <div className="sm:hidden absolute" onClick={handleMenuClick}>
                    <button className="block sm:hidden flex-shrink-0 p-4 text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-700 ">
                        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            { isOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /> }
                        </svg>
                    </button>
                </div>

                <div className={`${isOpen ? '!block' : '!hidden'} sm:flex sm:flex-shrink-0 md:static absolute top-12 z-10`}>
                    <div className="flex flex-col w-64"> */}
            {/* Sidebar component, swap this with your sidebar component */}
            {/* <div className="flex flex-col flex-1 h-0 bg-white">
                            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                                <div className="flex items-center flex-shrink-0 px-4">
                                    <img className="h-8 w-auto" src="https://tailwindui.com/img/logos/workflow-logo-indigo-600-mark-gray-800-text.svg" alt="Workflow" />
                                </div>
                                <nav className="mt-5 px-2 space-y-1"> */}
            {/* Current: "bg-gray-900 text-white", Default: "text-gray-700 hover:bg-gray-700 hover:text-white" */}


            {/* <NavLink
                                        exact
                                        to="/"
                                        className={({ isActive }) =>
                                            `${commonClasses} ${isActive ? activeClasses : ""}`
                                        }
                                        onClick={() => setIsOpen(false)}
                                        aria-current="page"
                                    >
                                        {(isActive) => (
                                            <>
                                                <div className={`mr-4 h-6 w-6 text-gray-700 ${isActive ? 'text-white' : 'text-gray-300'}`}>
                                                    <HomeIcon aria-hidden="true" />
                                                </div>
                                                Home
                                            </>
                                        )}
                                    </NavLink>


                                    <NavLink
                                        exact
                                        to="/profile/completed"
                                        className={({ isActive }) =>
                                            `${commonClasses} ${isActive ? activeClasses : ""}`
                                        }
                                        onClick={() => setIsOpen(false)}
                                        aria-current="page"
                                    >
                                        {(isActive) => (
                                            <>
                                                <div className={`mr-4 h-6 w-6 text-gray-700 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                                    <UserIcon aria-hidden="true" />
                                                </div>
                                                Profile
                                            </>
                                        )}
                                    </NavLink>

                                    <NavLink
                                        exact
                                        to="/mapped-books"
                                        className={({ isActive }) =>
                                            `${commonClasses} ${isActive ? activeClasses : ""}`
                                        }
                                        aria-current="page"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        {(isActive) => (
                                            <>
                                                <div className={`mr-4 h-6 w-6 text-gray-700 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                                    <MenuIcon aria-hidden="true" />
                                                </div>
                                                Mapped Books
                                            </>
                                        )}
                                    </NavLink>

                                    <NavLink
                                        exact
                                        to="/profile/queue"
                                        className={({ isActive }) =>
                                            `${commonClasses} ${isActive ? activeClasses : ""}`
                                        }
                                        aria-current="page"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        {(isActive) => (
                                            <>
                                                <div className={`mr-4 h-6 w-6 text-gray-700 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                                    <BadgeCheckIcon aria-hidden="true" />
                                                </div>
                                                Queue
                                            </>
                                        )}
                                    </NavLink>



                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="min-w-0 mt-5 md:mt-0 flex-1 p-3 overflow-hidden">
                    <main className="flex-1 relative z-0 focus:outline-none" tabIndex={0}>
                        <div className="py-6"> */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <Routes>
                    <Route path="/" element={<Feeds user={user} setFeeds = {setFeeds} feeds = {feeds}/>} />
                    <Route path="/player" element={<Player user={user} />} />
                    <Route path="/profile/completed" element={<Profile user={user} setWholeData={setWholeData} wholeData={wholeData} />} />
                    <Route path="/profile/queue" element={<QueueBooks user={user} setWholeData={setWholeData} wholeData={wholeData} />} />

                    <Route path="/mapped-books" element={<MappedBooks user={user} setWholeData={setWholeDataMap} wholeData={wholeDataMap} />} />
                    <Route path="/mapped-books/queue" element={<QueueMappedBooks user={user} setWholeData={setWholeDataMap} wholeData={wholeDataMap} />} />
                </Routes>
            </div>
            {/* </div>
                    </main>
                </div>
            </div> */}

        </>

    )
}
export default Pages
