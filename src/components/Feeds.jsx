import React, { useEffect, useState } from 'react'
import DataTableDisplay from './DataTableDisplay'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'
import { getTrans } from '../internal'
import { updateGetTransRes } from '../utils'

const Feeds = ({ user, feeds, setFeeds }) => {

    const [showDataTable, setShowDataTable] = useState(false)
    const [selectedFeed, setSelectedFeed] = useState({})
    const [loading, setLoading] = useState(false)
    const [showMore, setShowMore] = useState(false)

    useEffect(() => {
        const fetchFeeds = async () => {
            // const res = await fetch('https://www.noteclimber.com/noteclimberConnection.php/api/get-trans', {
            //     method: 'GET',
            // })

            const data = await getTrans();
            const newData = updateGetTransRes(data)
            // console.log(data)
            setFeeds(newData.filter(d => d.status.includes('100')))
            setLoading(false)
        }
        if (feeds?.length <= 0 || feeds == undefined) {
            if (!loading) {
                setLoading(true); // Set loading state to true to indicate fetching is in progress
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
        setSelectedFeed({});
        const timer = setInterval(() => {
            if (!(feeds?.length <= 0 || feeds == undefined)) {
                fetchFeeds();
            }
            // setSelectedFeed({});
        }, 30000); // 3000 milliseconds = 3 seconds

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
        setShowDataTable(true);
        setSelectedFeed(feed)


    }
    return (
        <>

            <div className=" p-4 ">

                <h1 className="text-2xl font-bold mb-4">Feeds</h1>
                <table className="w-full  border-collapse  rounded-lg text-sm  shadow-lg">
                    <thead className="bg-gray-300">
                        <tr className="border-b">
                            <th className="p-2 rounded-tl-lg border-r font-semibold">Book Name</th>
                            <th className="p-2 border-r font-semibold">Timestamps</th>
                            <th className="p-2 rounded-tr-lg font-semibold">Action</th>
                        </tr>
                    </thead>

                    <tbody className=' border-b  bg-white text-sm leading-relaxed  divide-y divide-gray-200 dark:divide-gray-700 '>
                        {!loading ?
                            feeds?.length > 0 ?
                                feeds.map((feed, i) => (
                                    <tr key={feed.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <td className="p-2 border-r text-gray-900 capitalize">
                                            {feed.book_name}
                                        </td>
                                        <td className="p-2 border-r text-gray-600">
                                            {
                                                feed.timestamps.split(',').length > 5 ?
                                                    <>
                                                        {feed.timestamps.split(',').slice(0, 5).map((time, index) => (
                                                            <span key={index} className="inline-block m-1 px-2 py-1 rounded-full bg-violet-500 text-white shadow-sm">
                                                                <span className="font-light">{time.includes(':') ? time : timeFormator(time)}</span>
                                                            </span>
                                                        ))}
                                                        {showMore[i] && feed.timestamps.split(',').slice(5).map((time, index) => (
                                                            <span key={index + 5} className="inline-block m-1 px-2 py-1 rounded-full bg-violet-500 text-white shadow-sm">
                                                                <span className="font-light">{time.includes(':') ? time : timeFormator(time)}</span>
                                                            </span>
                                                        ))}
                                                        <button className="text-blue-600 transition duration-150 ease-in-out focus:outline-none focus:shadow-outline m-1 py-1 px-2 rounded-lg"
                                                            onClick={() => setShowMore(prev => {
                                                                const newShowMore = { ...prev }
                                                                newShowMore[i] = !newShowMore[i]
                                                                return newShowMore
                                                            })}>
                                                            {showMore[i] ? 'Show Less' : `+${feed.timestamps.split(',').length - 5} more`}
                                                        </button>

                                                    </>
                                                    :
                                                    feed.timestamps.split(',').map((time, index) => (
                                                        <span key={index} className="inline-block m-1 px-2 py-1 rounded-full bg-violet-500 text-white shadow-sm">
                                                            <span className="font-light">{time.includes(':') ? time : timeFormator(time)}</span>
                                                        </span>
                                                    ))
                                            }
                                        </td>



                                        <td className={`p-2 text-right  ${i == 0 ? '' : 'border-t'}`} >
                                            <button className='button' onClick={() => regenerateNote(feed)}>
                                                <span className="flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    <span className="ml-2">Regenerate Notes</span>
                                                </span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                                :
                                <tr>
                                    <td className="p-2 text-gray-900 text-center" colSpan="3">No feeds found</td>
                                </tr>
                            :
                            <>
                                <tr>
                                    <td class="p-2">
                                        <div class="h-8 bg-gray-200 rounded-full overflow-hidden relative">
                                            <div class="h-full absolute inset-0 bg-gradient-to-r from-gray-200 via-white to-gray-200 animate-glass"></div>
                                        </div>
                                    </td>
                                    <td class="p-2">
                                        <div class="h-8 bg-gray-200 rounded-full overflow-hidden relative">
                                            <div class="h-full absolute inset-0 bg-gradient-to-r from-gray-200 via-white to-gray-200 animate-glass"></div>
                                        </div>
                                    </td>
                                    <td class="p-2">
                                        <div class="h-8 bg-gray-200 rounded-full overflow-hidden relative">
                                            <div class="h-full absolute inset-0 bg-gradient-to-r from-gray-200 via-white to-gray-200 animate-glass"></div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="p-2">
                                        <div class="h-8 bg-gray-200 rounded-full overflow-hidden relative">
                                            <div class="h-full absolute inset-0 bg-gradient-to-r from-gray-200 via-white to-gray-200 animate-glass"></div>
                                        </div>
                                    </td>
                                    <td class="p-2">
                                        <div class="h-8 bg-gray-200 rounded-full overflow-hidden relative">
                                            <div class="h-full absolute inset-0 bg-gradient-to-r from-gray-200 via-white to-gray-200 animate-glass"></div>
                                        </div>
                                    </td>
                                    <td class="p-2">
                                        <div class="h-8 bg-gray-200 rounded-full overflow-hidden relative">
                                            <div class="h-full absolute inset-0 bg-gradient-to-r from-gray-200 via-white to-gray-200 animate-glass"></div>
                                        </div>
                                    </td>
                                </tr>

                            </>




                        }
                    </tbody>
                </table>
                {showDataTable && <DataTableDisplay data={[selectedFeed]} />}
            </div >
        </>

    )
}

export default Feeds