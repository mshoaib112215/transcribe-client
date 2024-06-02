import React, { useEffect, useState } from 'react'
import DataTableDisplay from './DataTableDisplay'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'
import { getBookInfo, getTrans, getTransText } from '../internal'
import { updateGetTransRes } from '../utils'
import { isEqual } from 'lodash'
import DataTable from 'react-data-table-component';

const Feeds = ({ user, feeds, setFeeds }) => {

    const [showDataTable, setShowDataTable] = useState(false)
    const [selectedFeed, setSelectedFeed] = useState({})
    const [loading, setLoading] = useState(false)
    const [showMore, setShowMore] = useState([])
    const [instantGenerate, setInstantGenerate] = useState(null)

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
            name: 'Book info Status',
            cell: row => (
                <>
                    {instantGenerate == row.id ? "Please wait..." : row.book_text ? 'completed' : 'gathering'}
                </>
            ),
            sortable: false,
        },
        {
            name: 'Action',
            cell: row => (
                <button className='button' onClick={() => regenerateNote(row)}>
                    <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="ml-2">Regenerate Notes</span>
                    </span>
                </button>
            ),
            sortable: false,
        },
    ];

    useEffect(() => {
        console.log(DataTableDisplay)
    }, [DataTableDisplay])
    useEffect(() => {
        const fetchFeeds = async () => {
            // const res = await fetch('https://www.noteclimber.com/noteclimberConnection.php/api/get-trans', {
            //     method: 'GET',
            // })

            const data = await getTrans();
            // Check if the previous data is equal to the new data
            const doneDataLength = data.filter(d => d.status.includes('100')).length;
            const isDataChanged = feeds.length != doneDataLength;

            // Only update the state if the new data is different from the previous data
            if (isDataChanged) {
                setFeeds(prevFeeds => {
                    const filteredData = data.filter(d => {
                        const prevFeed = prevFeeds.find(pd => pd.id === d.id);
                        return !prevFeed || (!prevFeed.status.includes('100') && !(prevFeed.transcriptions && prevFeed.book_row_id))
                    });
                    return [...prevFeeds, ...filteredData];
                });
            }


            setLoading(false)

            for (const feed of data) {
                if (!feeds.find(f => f.id === feed.id)?.transcriptions) {
                    const trans = await getTransText(feed.id)
                    setFeeds(prevFeeds => {
                        return prevFeeds.map(f => f.id === feed.id ? { ...f, transcriptions: trans } : f)
                    });
                }
                if (!feeds.find(f => f.id === feed.id)?.book_row_id) {
                    const bookInfo = await getBookInfo(feed.book_id)
                    setFeeds(prevFeeds => {
                        return prevFeeds.map(f => f.id === feed.id ? { ...f, ...bookInfo } : f)
                    });
                }
            }


        }
        if (feeds?.length <= 0 || feeds == undefined) {
            if (!loading) {
                setLoading(true); // Set loading state to true to indicate fetching is in progress
                setSelectedFeed({});

                fetchFeeds();
            } else {
                console.log('Fetch is already in progress.');
            }

        }
        else {
            let newData = null

            newData = feeds?.filter(d => d.status.includes('100'))

            setFeeds(newData)

        }
        setShowDataTable(false);
        const timer = setInterval(() => {
            if (!(feeds?.length <= 0 || feeds == undefined)) {
                fetchFeeds();
            }
            // setSelectedFeed({});
        }, 3000); // 3000 milliseconds = 3 seconds

        return () => clearInterval(timer);
    }, [])

    const timeFormator = (time) => {
        time = time.split(',')
        try {
            // push all times with time formate but with comman
            return time.map(t => new Date(t * 1000).toISOString().substr(11, 8)).join(', ')
        }
        catch (er) {
            toast.error("Error will converting time " + er + time)
        }
    }
    const regenerateNote = (feed) => {
        if (!feed.book_text) {
            setInstantGenerate(feed.id)
            getBookInfo(feed.book_id).then(res1 => {
                getTransText(feed.id).then(res2 => {

                    console.log(res1)
                    console.log(res2)
                    setFeeds(prevFeeds => {
                        const prevData = prevFeeds;
                        const newData = [...prevData.filter(f => f.id !== feed.id), { ...feed, ...res1, transcriptions: res2 }]
                        return newData;
                    })
                    setSelectedFeed({ ...feed, ...res1, transcriptions: res2 })
                    setShowDataTable(true)
                    setInstantGenerate(null)
                })

            })
        }
        else {

            setShowDataTable(true);
            setSelectedFeed(feed)
        }


    }
    return (
        <>

            <div className=" p-4 ">

                <h1 className="text-2xl font-bold mb-4">Feeds</h1>
                <div className="rounded-lg">

                    <DataTable
                        columns={columns}
                        data={feeds}
                        highlightOnHover
                        striped
                        centered
                        pagination
                        responsive
                    />
                </div>

                {showDataTable && (selectedFeed.book_text ? <DataTableDisplay data={[selectedFeed]} /> : <div className="text-center text-2xl">Getting Book Information...</div>)}
            </div >
        </>

    )
}

export default Feeds