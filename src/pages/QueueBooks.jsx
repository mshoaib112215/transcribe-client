import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import ProfileTable from '../components/ProfileTable'

const QueueBooks = ({ user, setWholeData, wholeData}) => {
    console.log(wholeData)
    return (
        <>
            <div className="flex justify-start gap-3">

                <Link to="/" className="text-white   bg-blue-500 px-4 py-2  rounded-md ">Go to Home</Link>
                <Link to="/profile/completed" className="text-white   bg-blue-500 px-4 py-2 rounded-md ">Go to Profile</Link>
                <Link to="/player" className="text-white   bg-blue-500 px-4 py-2  rounded-md ">Go to player</Link>
            </div>
            <div className="container m-auto p-3">

                <h1 className="text-2xl font-bold mb-4">Profile</h1>

                <div className='flex justify-center flex-wrap  whitespace-nowrap gap-3'>

                    <Link to='/profile/completed' className='border shadow-md flex-1 p-12 flex justify-center rounded-lg cursor-pointer'>
                        <div className='flex items-center gap-2'>
                            Your Completed Books: <span className='text-xl'>{wholeData.filter(d => d.status.includes('100') ).length.toString()}</span>
                        </div>
                    </Link>
                    <Link to='/profile/queue' className='border shadow-md flex-1 flex justify-center p-12 rounded-lg cursor-pointer'>
                        <div className='flex items-center gap-2'>
                            Your Pending Books: <span className='text-xl'>{wholeData.filter(d => !d.status.includes('100') ).length.toString()}</span>
                        </div>
                    </Link>
                </div>
                <div className='mt-4'>

                    <ProfileTable type="2" setWholeData={setWholeData} user={user} wholeData={wholeData} />
                </div>
            </div>


            {/* list of pending/queuing books */}

        </>
    )
}

export default QueueBooks