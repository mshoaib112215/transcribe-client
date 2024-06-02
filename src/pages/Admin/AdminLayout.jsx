import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllWholeTrans, getUsers } from '../../internal';

const AdminLayout = ({ children, menu }) => {
    const [data, setData] = useState([])
    const [selectedFeed, setSelectedFeed] = useState({})
    const [loading, setLoading] = useState(false)
    const [wholeTransData, setWholeTransData] = useState([])
    const [allUsers, setAllUsers] = useState([])

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            let data = null;
            if (menu != 3) {

                data = await getAllWholeTrans()
                setWholeTransData(data)

                data = await getUsers();
                setAllUsers(data)
            }
            else {
                data = await getUsers();
                setAllUsers(data)

                data = await getAllWholeTrans()
                setWholeTransData(data)

            }
            setLoading(false)
            return
        }

        if (wholeTransData?.length <= 0 || wholeTransData == undefined || allUsers?.length <= 0 || allUsers == undefined) {
            if (!loading) {
                fetchData();
            }
        }

        const timer = setInterval(() => {
            if (!(data?.length <= 0 || data == undefined)) {
                fetchData();
            }
        }, 30000); // 3000 milliseconds = 3 seconds

        return () => clearInterval(timer);
    }, [menu]);

    return (
        <div className="container m-auto p-3">
            <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
            <div className='flex justify-center flex-wrap  whitespace-nowrap gap-3'>
                <Link to='/admin/mapped-books' className='border md:w-[32.3%] max-w-full flex-1 shadow-md bg-white   p-12 flex justify-center rounded-lg cursor-pointer'>
                    <div className='flex items-center gap-2'>
                        Total Completed Books: <span className='text-xl'>{wholeTransData.filter(d => d.status.includes('100')).length}</span>

                    </div>
                </Link>
                <Link to='/admin/mapped-books/queue' className='border md:w-[32.3%] flex-1 max-w-full shadow-md bg-white    flex justify-center p-12 rounded-lg cursor-pointer'>
                    <div className='flex items-center gap-2'>
                        Total Pending Books: <span className='text-xl'>{wholeTransData.filter(d => !d.status.includes('100')).length}</span>
                    </div>
                </Link>
                <Link to='/admin/users' className='border shadow-md md:w-[32.3%] flex-1 max-w-full bg-white    flex justify-center p-12 rounded-lg cursor-pointer'>
                    <div className='flex items-center gap-2'>
                        Total Users: <span className='text-xl'>{allUsers.length}</span>
                    </div>
                </Link>
            </div>
            <div className='mt-4 overflow-auto rounded-lg'>
                {React.Children.map(children, (child) => {
                    return React.cloneElement(child, {

                        wholeTransData: wholeTransData,
                        allUsers: allUsers
                    });
                })}
            </div>
        </div>
    )
}

export default AdminLayout