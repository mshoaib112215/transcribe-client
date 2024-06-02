import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBooks } from '../../internal'

const ProfileLayout = ({ children, user }) => {
    const [wholeData, setWholeData] = useState([])
    const [books, setBooks] = useState([])
    useEffect(() => {
        const fetch = async () => {
            const res = await fetchBooks(user.id);
            const data = await res.json() 
            console.log(data)
            setBooks(data)
        }
        fetch()
    }, [])
    return (
        <>
            <div className="container m-auto p-3">

                <h1 className="text-2xl font-bold mb-4">Profile</h1>

                <div className='flex justify-center flex-wrap  whitespace-nowrap gap-3'>

                    <Link to='/profile' className='border bg-white  shadow-md flex-1 p-12 flex justify-center rounded-lg cursor-pointer'>
                        <div className='flex items-center gap-2'>
                            Your Completed Books: <span className='text-xl'>{wholeData.filter(d => d.status.includes('100')).length.toString()}</span>
                        </div>
                    </Link>
                    <Link to='/profile/queue' className='border bg-white  shadow-md flex-1 flex justify-center p-12 rounded-lg cursor-pointer'>
                        <div className='flex items-center gap-2'>
                            Your Pending Books: <span className='text-xl'>{wholeData.filter(d => !d.status.includes('100')).length.toString()}</span>
                        </div>
                    </Link>
                    <Link to='/profile/my-books' className='border bg-white  shadow-md flex-1 flex justify-center p-12 rounded-lg cursor-pointer'>
                        <div className='flex items-center gap-2'>
                            Your Books: <span className='text-xl'>{books.length.toString()}</span>
                        </div>
                    </Link>

                </div>
                <div className='mt-4'>

                    {React.Children.map(children, (child) => {
                        return React.cloneElement(child, { user, setWholeData, wholeData, books })
                    })}

                </div>
            </div>

        </>
    )
}

export default ProfileLayout