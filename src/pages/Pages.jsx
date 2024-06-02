
import React, { useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import Home from './Home'
import Player from './Player'
import Feeds from '../components/Feeds'
import { ToastContainer } from 'react-toastify'
import QueueBooks from './Profile/QueueBooks'
import Profile from './Profile/Profile'
import MappedBooks from '../components/MappedBooks'
import QueueMappedBooks from '../components/QueueMappedBooks'
import { HomeIcon, UserIcon, MenuIcon, BadgeCheckIcon, PlayIcon, ShieldCheckIcon } from '@heroicons/react/outline'
import Admin from './Admin/Admin'
import AdminMappedBook from './Admin/AdminMappedBook'
import AdminUsers from './Admin/AdminUsers'
import AdminMappedBooksQueue from './Admin/AdminMappedBooksQueue'
import AdminLayout from './Admin/AdminLayout'
import AdminPlayer from './Admin/AdminPlayer'
import ProfileLayout from './Profile/ProfileLayout'
import MyBooks from './Profile/MyBooks'


const Pages = ({ user }) => {
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
            {/* <ToastContainer /> */}
            <div className={`flex h-screen bg-gray-100`}>

                <div className={`md:hidden absolute z-10 `}
                    onClick={handleMenuClick}>
                    <button className="block  flex-shrink-0 p-4 bg-white rounded-ee-2xl   text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-700 shadow-lg">
                        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />}
                        </svg>
                    </button>
                </div>

                <div className={`${isOpen ? 'block absolute' : 'md:!flex !hidden '} sm:flex sm:flex-shrink-0 md:static  top-12 md:z-0 z-10 shadow-lg`}>
                    <div className="flex flex-col w-64">
                        {/* Sidebar component, swap this with your sidebar component */}
                        <div className="flex flex-col flex-1 h-0 bg-white">
                            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                                <div className="flex items-center flex-shrink-0 px-4">
                                    <img className="h-8 w-auto" src="https://tailwindui.com/img/logos/workflow-logo-indigo-600-mark-gray-800-text.svg" alt="Workflow" />
                                </div>
                                <nav className="mt-5 px-2 space-y-1">
                                    {/* Current: "bg-gray-900 text-white", Default: "text-gray-700 hover:bg-gray-700 hover:text-white" */}


                                    <NavLink
                                        exact
                                        to="/"
                                        className={({ isActive }) =>
                                            `${commonClasses} ${isActive ? activeClasses : ""}`
                                        }
                                        onClick={() => setIsOpen(false)}
                                        aria-current="page"
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <div className={`mr-4 h-6 w-6 text-gray-700 group-hover:!text-white transition-all duration-[250ms] ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                                    <HomeIcon aria-hidden="true" />
                                                </div>
                                                Home
                                            </>
                                        )}
                                    </NavLink>
                                    <NavLink
                                        exact
                                        to="/player"
                                        className={({ isActive }) =>
                                            `${commonClasses} ${isActive ? activeClasses : ""}`
                                        }
                                        onClick={() => setIsOpen(false)}
                                        aria-current="page"
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <div className={`mr-4 h-6 w-6 text-gray-700 group-hover:!text-white transition-all duration-[250ms] ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                                    <PlayIcon aria-hidden="true" />
                                                </div>
                                                Player
                                            </>
                                        )}
                                    </NavLink>


                                    <NavLink

                                        to="/profile"
                                        className={({ isActive }) =>

                                            `${commonClasses} ${isActive ? activeClasses : ""}`
                                        }
                                        onClick={() => setIsOpen(false)}
                                        aria-current="page"
                                    >
                                        {({ isActive }) => (
                                            <>
                                                {/* {console.log(isActive)} */}
                                                <div className={`mr-4 h-6 w-6 text-gray-700 group-hover:!text-white transition-all duration-[250ms] ${isActive ? 'text-white' : 'text-gray-400'}`}>
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
                                        {({ isActive }) => (
                                            <>
                                                <div className={`mr-4 h-6 w-6 text-gray-700 group-hover:!text-white transition-all duration-[250ms] ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                                    <MenuIcon aria-hidden="true" />
                                                </div>
                                                Mapped Books
                                            </>
                                        )}
                                    </NavLink>
                                    <div className="w-full">
                                        <NavLink to="/admin" className={({ isActive }) =>
                                            `${commonClasses} ${isActive ? activeClasses : ""}`
                                        } type="button" onClick={() => setIsOpen(!isOpen)}>
                                            <div className="flex items-center">
                                                <div className="mr-4 h-6 w-6 ">
                                                    <ShieldCheckIcon aria-hidden="true" />
                                                </div>
                                                <span className="">Admin Panel</span>
                                            </div>
                                            <div className={`${isOpen ? 'rotate-180' : ''} ml-auto h-6 w-6 transition-all `}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </NavLink>
                                        <div className={`transition-all duration-[250ms] max-h-0 overflow-hidden ${isOpen ? 'max-h-[500px]' : ''}`}>
                                            <nav className="flex flex-col gap-1 ml-5 mt-1">
                                                <NavLink
                                                    to="/admin/users"
                                                    className={({ isActive }) =>
                                                        `${commonClasses} ${isActive ? activeClasses : ""}`
                                                    }
                                                    aria-current="page"
                                                    onClick={() => window.innerWidth < 425 && setIsOpen(false)}
                                                >
                                                    {({ isActive }) => (
                                                        <>
                                                            <div className={`mr-4 h-6 w-6 text-gray-700 group-hover:!text-white transition-all duration-[250ms] ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                                                <BadgeCheckIcon aria-hidden="true" />
                                                            </div>
                                                            Users
                                                        </>
                                                    )}
                                                </NavLink>

                                                <NavLink
                                                    to="/admin/mapped-books"
                                                    className={({ isActive }) =>
                                                        `${commonClasses} ${isActive ? activeClasses : ""}`
                                                    }
                                                    aria-current="page"
                                                    onClick={() => window.innerWidth < 425 && setIsOpen(false)}
                                                >
                                                    {({ isActive }) => (
                                                        <>
                                                            <div className={`mr-4 h-6 w-6 text-gray-700 group-hover:!text-white transition-all duration-[250ms] ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                                                <ShieldCheckIcon aria-hidden="true" />
                                                            </div>
                                                            Mapped Books
                                                        </>
                                                    )}
                                                </NavLink>
                                                <NavLink
                                                    to="/admin/player"
                                                    className={({ isActive }) =>
                                                        `${commonClasses} ${isActive ? activeClasses : ""}`
                                                    }
                                                    aria-current="page"
                                                    onClick={() => window.innerWidth < 425 && setIsOpen(false)}
                                                >
                                                    {({ isActive }) => (
                                                        <>
                                                            <div className={`mr-4 h-6 w-6 text-gray-700 group-hover:!text-white transition-all duration-[250ms] ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                                                <PlayIcon aria-hidden="true" />
                                                            </div>
                                                            Admin Player
                                                        </>
                                                    )}
                                                </NavLink>

                                            </nav>
                                        </div>
                                    </div>

                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="min-w-0 mt-5 md:mt-0 flex-1 p-3 overflow-auto">
                    <main className="flex-1 relative z-0 focus:outline-none" tabIndex={0}>
                        <div className="py-6 pb-1">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-4">
                                <Routes>
                                    <Route path="/" element={<Feeds user={user} setFeeds={setFeeds} feeds={feeds} />} />
                                    <Route path="/player" element={<Player user={user} />} />

                                    {/* Profile routes */}
                                    <Route path="/profile" element={<ProfileLayout user={user}>
                                        <Profile />
                                    </ProfileLayout>} />
                                    <Route path="/profile/queue" element={<ProfileLayout user={user}>
                                        <QueueBooks />
                                    </ProfileLayout>} />
                                    <Route path="/profile/my-books" element={<ProfileLayout user={user}>
                                        <MyBooks />
                                    </ProfileLayout>} />


                                    {/* MappedBooks routes */}
                                    < Route path="/mapped-books" element={<MappedBooks user={user} setWholeData={setWholeDataMap} wholeData={wholeDataMap} />} />
                                    <Route path="/mapped-books/queue" element={<QueueMappedBooks user={user} setWholeData={setWholeDataMap} wholeData={wholeDataMap} />} />

                                    {/* Admin routes */}
                                    <Route exact path="/admin" element={<AdminLayout>
                                        <Admin />
                                    </AdminLayout>} />
                                    <Route exact path="/admin/mapped-books" element={<AdminLayout menu={1}>
                                        <AdminMappedBook />
                                    </AdminLayout>} />
                                    <Route exact path="/admin/mapped-books/queue" element={<AdminLayout menu={2}>
                                        <AdminMappedBooksQueue />
                                    </AdminLayout>} />
                                    <Route exact path="/admin/users" element={<AdminLayout menu={3}>
                                        <AdminUsers />
                                    </AdminLayout>} />

                                    {/* player */}
                                    <Route path="admin/player" element={<AdminPlayer user={user} />} />

                                </Routes>
                            </div>
                        </div>
                    </main>
                </div>

            </div>

        </>

    )
}
export default Pages

