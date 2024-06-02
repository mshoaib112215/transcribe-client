import React, { useEffect, useState } from 'react'
import DataTableDisplay from './DataTableDisplay'
import { getBookInfo, getTrans, getTransText } from '../internal'
import { updateGetTransRes } from '../utils'
import DataTable from 'react-data-table-component';
import { toast } from 'react-toastify';

const ProfileTable = ({ type, setWholeData, user, wholeData }) => {
    const [data, setData] = useState([])

    const [showDataTable, setShowDataTable] = useState(false)
    const [selectedFeed, setSelectedFeed] = useState({})
    const [loading, setLoading] = useState(false);
    const [showMore, setShowMore] = useState({})

    const timeFormator = (time) => {
        time = time?.split(',')
        try {
            // push all times with time formate but with comman
            return time.map(t =>  new Date(t * 1000).toISOString().substr(11, 8)).join(', ')
        }
        catch (er) {
            toast.error("Error will converting time " + er + time)
        }
    }
    const columns = [
        {
            name: 'Book Name',
            selector: row => row.book_name,
            sortable: true,
        },
        {
            name: 'Timestamps',
            cell: row => (
                <>
                    {
                        row.timestamps.split(',').length > 5 ?
                            <div className="flex flex-wrap">
                                {row.timestamps.split(',').slice(0, 5).map((time, index) => (
                                    <span key={index} className="inline-block m-1 px-2 py-1 rounded-full bg-violet-500 text-white shadow-sm">
                                        <span className="font-light">{time.includes(':') ? time : timeFormator(time)}</span>
                                    </span>
                                ))}
                                {showMore[row.id] && row.timestamps.split(',').slice(5).map((time, index) => (
                                    <span key={index + 5} className="inline-block m-1 px-2 py-1 rounded-full bg-violet-500 text-white shadow-sm">
                                        <span className="font-light">{time.includes(':') ? time : timeFormator(time)}</span>
                                    </span>
                                ))}
                                <button className="text-blue-600 transition duration-150 ease-in-out focus:outline-none focus:shadow-outline m-1 py-1 px-2 rounded-lg "
                                    onClick={() => setShowMore(prev => {
                                        const newShowMore = { ...prev }
                                        newShowMore[row.id] = !newShowMore[row.id]
                                        return newShowMore
                                    })}>
                                    {showMore[row.id] ? 'Show Less' : `+${row.timestamps.split(',').length - 5} more`}
                                </button>

                            </div>
                            :
                            row.timestamps.split(',').map((time, index) => (
                                <span key={index} className="inline-block m-1 px-2 py-1 rounded-full bg-violet-500 text-white shadow-sm">
                                    <span className="font-light">{time.includes(':') ? time : timeFormator(time)}</span>
                                </span>
                            ))
                    }
                </>
            ),
            sortable: false,
        },
        {
            name: 'Status',
            selector: row => (
                <>
                    {!row.status == '' ?
                        (!row.status.toString().includes('100') && row.status != 'Queue' ? (
                            <div className='space-y-2'>
                                <p>
                                    Process Status ({Number(row.status).toFixed(0)}%)
                                </p>
                                <div className='relative h-[10px] bg-gray-300 rounded-full'>
                                    <div className='h-[10px] bg-blue-500 rounded-full' style={{ width: `${row.status}%` }}></div>
                                </div>
                            </div>
                        ) :
                            row.status.includes('100') ?
                                <p className='text-green-500'>
                                    Completed
                                </p>
                                :
                                row.status == 'Queue' ? <p className='text-yellow-500'>
                                    Pending
                                </p>
                                    : null
                        ) : null}
                </>
            ),
            sortable: true,
        },
        {
            name: 'Action',
            cell: row => (
                <button className='button' onClick={() => regenerateNote(row)}><span className="flex items-center ">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="ml-2">Regenerate Notes</span>
                </span></button>
            ),
            sortable: false,
        },
    ];



    useEffect(() => {
        const fetchData = async () => {
            const data = await getTrans(user.id);
            let newData = null;
            if (type == 1) {
                newData = data.filter(d => d.status.includes('100'))
            }
            else {
                newData = data.filter(d => !d.status.includes('100'))
            }
            setWholeData(data)
            setData(newData)

            for (const feed of newData) {
                if (!newData.find(f => f.id === feed.id)?.transcriptions) {
                    const trans = await getTransText(feed.id)
                    setData(prevFeeds => {
                        return prevFeeds?.map(f => f.id === feed.id ? { ...f, transcriptions: trans } : f)
                    });
                    setWholeData(prevFeeds => {
                        return prevFeeds?.map(f => f.id === feed.id ? { ...f, transcriptions: trans } : f)
                    });
                }
                if (!newData.find(f => f.id === feed.id)?.book_row_id) {
                    const bookInfo = await getBookInfo(feed.book_id)
                    setData(prevFeeds => {
                        return prevFeeds.map(f => f.id === feed.id ? { ...f, ...bookInfo } : f)
                    });
                    setWholeData(prevFeeds => {
                        return prevFeeds.map(f => f.id === feed.id ? { ...f, ...bookInfo } : f)
                    });
                }
            }
            setLoading(false)
        }
        if (wholeData?.length <= 0) {

            fetchData();
            setShowDataTable(false);

        }
        else {
            let newData = null
            if (type == 1) {
                newData = wholeData.filter(d => d.status.includes('100'))
            }
            else {
                newData = wholeData.filter(d => !d.status.includes('100'))
            }
            setData(newData)

        }
        if (!showDataTable) {
            const timer = setInterval(() => {
                fetchData();
                // setSelectedFeed({});
            }, 30000); // 3000 milliseconds = 3 seconds

            return () => clearInterval(timer);
        }
    }, [showDataTable, wholeData, type, user.id]);

    const regenerateNote = (feed) => {
        setShowDataTable(true);
        setSelectedFeed(feed)


    }

    return (
        <>
            <h2 className='text-2xl font-bold mb-4'>{type == 1 ? 'Completed Transcriptions' : 'Pending Transcriptions'}</h2>
            <div className="rounded-lg">

                <DataTable
                    columns={columns}
                    data={data}
                    highlightOnHover
                    striped
                    centered
                    pagination
                    responsive
                />
            </div>

            {showDataTable && <DataTableDisplay data={[selectedFeed]} />}
        </>
    )
}

export default ProfileTable