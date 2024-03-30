import React, { useEffect, useState } from 'react'
import DataTableDisplay from './DataTableDisplay'

const ProfileTable = ({ type, setWholeData, user }) => {
    const [data, setData] = useState([])

    const [showDataTable, setShowDataTable] = useState(false)
    const [selectedFeed, setSelectedFeed] = useState({})
    const [loading, setLoading] = useState(false);

    const memoShowDataTable = React.useMemo(() => {
        return showDataTable
    }, [showDataTable]);


    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch('http://localhost/noteclimberConnection.php/api/get-trans', {
                method: 'GET',
            })
            const data = await res.json();
            let newData = null;
            if (type == 1) {
                newData = data.filter(d => d.status.includes('100') && d.user_id == user.id)
            }
            else {
                newData = data.filter(d => !d.status.includes('100') && d.user_id == user.id)
            }
            setData(newData)
            setWholeData(data)
            setLoading(false)
        }
        fetchData();
        setShowDataTable(false);
        const timer = setInterval(() => {
            fetchData();
            // setSelectedFeed({});
        }, 10000); // 3000 milliseconds = 3 seconds

        return () => clearInterval(timer);
    }, []);
    const regenerateNote = (feed) => {
        setShowDataTable(true);
        setSelectedFeed(feed)


    }
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
    return (
        <>

            <h2 className='text-2xl font-bold mb-4'>{type == 1 ? 'Completed Transcriptions' : 'Pending Transcriptions'}</h2>


            <table className="w-full border border-collapse border-gray-300 transition-all mt-3 h-fit">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="p-2 ">Book Name</th>
                        <th className="p-2 ">Timestamps</th>
                        <th className="p-2 ">Status</th>
                        <th className="p-2 ">Action</th>
                    </tr>
                </thead>

                <tbody>
                    {!loading ?
                        data.length > 0 ?
                            data.map((feed, i) => (
                                <tr key={feed.id} className="mb-2">
                                    <td className="p-2 text-sm border capitalize">{feed.book_name}</td>
                                    <td className="p-2 text-sm text-gray-600 border">{feed.timestamps.includes(':') ? feed.timestamps : timeFormator(feed.timestamps)}</td>

                                    <td className="p-2 text-sm border capitalize whitespace-nowrap">
                                        {!feed.status == '' ?
                                            (!feed.status.toString().includes('100') && feed.status != 'Queue' ? <div className='space-y-2'>
                                                <p>
                                                    Process Status ({Number(feed.status).toFixed(0)}%)
                                                </p>
                                                <div className='relative h-[10px] bg-gray-300 rounded-full'>
                                                    <div className='h-[10px] bg-blue-500 rounded-full' style={{ width: `${feed.status}%` }}></div>
                                                </div>
                                            </div>
                                                :

                                                feed.status.includes('100') ?
                                                    <p className='text-green-500'>
                                                        Completed
                                                    </p>
                                                    :
                                                    feed.status == 'Queue' ? <p className='text-yellow-500'>
                                                        Pending
                                                    </p>
                                                        : null
                                            ) :
                                            <p className='text-yellow-500'>
                                                Pending
                                            </p>
                                        }
                                    </td>

                                    <td className={`p-2 text-sm  flex justify-center ${i == 0 ? '' : 'border-t'}`} >
                                        <button className='bg-blue-500 hover:bg-blue-700 text-white mx-auto  font-bold py-2 px-4 rounded' onClick={() => regenerateNote(feed)}>Generate Notes</button>
                                    </td>
                                </tr>
                            ))
                            :
                            <tr>
                                <td className="p-2 text-sm  capitalize">No data found</td>
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
            {memoShowDataTable && <DataTableDisplay data={[selectedFeed]} />}
        </>
    )
}

export default ProfileTable