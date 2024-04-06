import React, { useEffect, useState } from 'react'
import DataTableDisplay from './DataTableDisplay'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'
import { getTrans } from '../internal'
import { updateGetTransRes } from '../utils'

const Feeds = ({user}) => {
    const [feeds, setFeeds] = useState([])
    const [showDataTable, setShowDataTable] = useState(false)
    const [selectedFeed, setSelectedFeed] = useState({})
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setLoading(true)
        const fetchFeeds = async() => {
            // const res = await fetch('https://www.noteclimber.com/noteclimberConnection.php/api/get-trans', {
            //     method: 'GET',
            // })
            
            const data = await getTrans();
            const newData = updateGetTransRes(data)
            // console.log(data)
            setFeeds(newData.filter(d => d.status.includes('100') ))
            setLoading(false)
        }
        fetchFeeds();
        setShowDataTable(false);
        setSelectedFeed({});
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
            <div className="flex justify-start gap-3">

                <Link to="/player" className="text-white   bg-blue-500 px-4 py-2  rounded-md ">Go to Player</Link>
                <Link to="/profile" className="text-white   bg-blue-500 px-4 py-2 rounded-md ">Go to Profile</Link>
                <Link to="/mapped-books/" className="text-white   bg-blue-500 px-4 py-2 rounded-md ">Go to Mapped Books</Link>
            </div>
            <div className=" p-4 ">

                <h1 className="text-2xl font-bold mb-4">Feeds</h1>
                <table className="w-full border border-collapse border-gray-300 transition-all">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="p-2 ">Book Name</th>
                            <th className="p-2 ">Timestamps</th>
                            <th className="p-2 ">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {!loading ?
                            feeds.length > 0 ?
                                feeds.map((feed, i) => (
                                    <tr key={feed.id} className="mb-2">
                                        <td className="p-2 text-sm border capitalize">{feed.book_name}</td>
                                        <td className="p-2 text-sm text-gray-600 border word-break-all">{feed.timestamps.includes(':') ? feed.timestamps : timeFormator(feed.timestamps)}</td>
                                        <td className={`p-2 text-sm  flex justify-center ${i == 0 ? '' : 'border-t'}`} >
                                            <button className='bg-blue-500 hover:bg-blue-700 text-white mx-auto  font-bold py-2 px-4 rounded' onClick={() => regenerateNote(feed)}>Regenerate Notes</button>
                                        </td>
                                    </tr>
                                ))
                                :
                                <tr>
                                    <td className="p-2 text-sm  capitalize">No feeds found</td>
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