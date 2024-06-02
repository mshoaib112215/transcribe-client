import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import WholeBookTable from './WholeBookTable';

const MappedBooks = ({setWholeData, wholeData}) => {

    return (
        <>
            <div className="container m-auto p-3">

                <h1 className="text-2xl font-bold mb-4">Mapped Books</h1>

                <div className='flex justify-center flex-wrap  whitespace-nowrap gap-3'>

                    <Link to='/mapped-books' className='border shadow-md bg-white flex-1 p-12 flex justify-center rounded-lg cursor-pointer'>
                        <div className='flex items-center gap-2'>
                            Your Completed Books: <span className='text-xl'>{wholeData?.filter(d => d.status.includes('100')).length.toString()}</span>
                            
                        </div>
                    </Link>
                    <Link to='/mapped-books/queue' className='border shadow-md bg-white  flex-1 flex justify-center p-12 rounded-lg cursor-pointer'>
                        <div className='flex items-center gap-2'>
                            Your Pending Books: <span className='text-xl'>{wholeData?.filter(d => !d.status.includes('100') ).length.toString()}</span>
                        </div>
                    </Link>
                </div>
                <div className='mt-4'>

                    <WholeBookTable type="1" setWholeData={setWholeData} wholeData={wholeData} />
                </div>
            </div>

        </>




    )
}

export default MappedBooks