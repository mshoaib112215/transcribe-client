import React from 'react'
import DataTable from 'react-data-table-component';
import { downloadAudioBook, downloadeBook } from '../../internal';
import { DownloadIcon } from '@heroicons/react/outline';

const MyBooks = ({ user, books }) => {
    const [data, setData] = React.useState(books);
    const columns = [
        {
            name: 'Audio Book Name',
            selector: row => row.audio_book_name,
            sortable: true,
        },
        {
            name: 'eBook Name',
            selector: row => row.book_name,
            sortable: true,
        },
        // {
        //     name: 'Status',
        //     selector: row => (
        //         <>
        //             {!row.status == '' ?
        //                 (!row.status.toString().includes('100') && row.status != 'Queue' ? (
        //                     <div className='space-y-2'>
        //                         <p>
        //                             Process Status ({Number(row.status).toFixed(0)}%)
        //                         </p>
        //                         <div className='relative h-[10px] bg-gray-300 rounded-full'>
        //                             <div className='h-[10px] bg-blue-500 rounded-full' style={{ width: `${row.status}%` }}></div>
        //                         </div>
        //                     </div>
        //                 ) :
        //                     row.status.includes('100') ?
        //                         <p className='text-green-500'>
        //                             Completed
        //                         </p>
        //                         :
        //                         row.status == 'Queue' ? <p className='text-yellow-500'>
        //                             Pending
        //                         </p>
        //                             : null
        //                 )
        //                 : null
        //             }
        //         </>
        //     ),
        //     sortable: true,
        // },
        {
            name: 'Action',
            cell: row => (
                <div className='flex flex-col gap-1 my-1'>
                    <button
                        className='button flex-1'
                        onClick={() => downloadAudioBook(row)}
                    >
                        <span className="flex items-center">
                            <DownloadIcon className="h-6 w-6" />
                            <span className="ml-2">Download Audio</span>
                        </span>
                    </button>
                    <button
                        className='button w-full'
                        onClick={() => downloadeBook(row)}
                    >
                        <span className="flex items-center">

                            <DownloadIcon className="h-6 w-6" />
                            <span className="ml-2">Download eBook</span>
                        </span>
                    </button>
                </div>
            ),
            sortable: false,
        },
    ];

    return (
        <>
            <h2 className='text-2xl font-bold mb-4'>Your Books Files</h2>

            <div className="w-full">
                <DataTable
                    columns={columns}
                    data={data}
                    pagination
                    paginationServer
                    paginationTotalRows={data?.length}
                    onChangePage={(currentPage) => console.log('Current page:', currentPage)}
                    paginationRowsPerPageOptions={[10, 20, 30]}
                />
            </div>
        </>
    );
}

export default MyBooks