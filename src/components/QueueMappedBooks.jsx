import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
import ProfileTable from './ProfileTable';
import WholeBookTable from './WholeBookTable';

const QueueMappedBooks = ({setWholeData, wholeData}) => {

    // useEffect(() => {
    //     const fetchData = async () => {
    //         const res = await fetch('https://www.noteclimber.com/noteclimberConnection.php/api/get-all-whole-trans', {
    //             // const res = await fetch('https://www.noteclimber.com/noteclimberConnection.php/api/get-all-whole-trans', {
    //             method: 'GET',
    //         })
    //         const data = await res.json();
    //         setData(data)

    //         // setLoading(false)
    //     }
    //     fetchData();
    //     // // setShowDataTable(false);
    //     const timer = setInterval(() => {
    //         fetchData();
    //         // setSelectedFeed({});
    //     }, 10000); // 3000 milliseconds = 3 seconds

    //     return () => clearInterval(timer);
    // }, []);
    return (
        <>
            <div className="flex justify-start gap-3">

                <Link to="/" className="text-white   bg-blue-500 px-4 py-2  rounded-md ">Go to Home</Link>
                <Link to="/mapped-books" className="text-white   bg-blue-500 px-4 py-2 rounded-md ">Go to Pending Books</Link>
            </div>
            <div className="container m-auto p-3">

                <h1 className="text-2xl font-bold mb-4">Mapped Books</h1>

                <div className='flex justify-center flex-wrap  whitespace-nowrap gap-3'>

                    <Link to='/mapped-books' className='border shadow-md flex-1 p-12 flex justify-center rounded-lg cursor-pointer'>
                        <div className='flex items-center gap-2'>
                            Your Completed Books: <span className='text-xl'>{wholeData?.filter(d => d.status.includes('100')).length.toString()}</span>

                        </div>
                    </Link>
                    <Link to='/mapped-books/queue' className='border shadow-md flex-1 flex justify-center p-12 rounded-lg cursor-pointer'>
                        <div className='flex items-center gap-2'>
                            Your Pending Books: <span className='text-xl'>{wholeData?.filter(d => !d.status.includes('100')).length.toString()}</span>
                        </div>
                    </Link>
                </div>
                <div className='mt-4'>

                    <WholeBookTable type="2" setWholeData={setWholeData} wholeData={wholeData} />
                </div>
            </div>

        </>
    )
}

export default QueueMappedBooks