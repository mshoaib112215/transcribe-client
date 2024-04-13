import React, { useEffect, useState } from 'react'
import DataTableDisplay from './DataTableDisplay'
import { getTrans } from '../internal'
import { updateGetTransRes } from '../utils'

const ProfileTable = ({ type, setWholeData, user, wholeData }) => {
    const [data, setData] = useState([])

    const [showDataTable, setShowDataTable] = useState(false)
    const [selectedFeed, setSelectedFeed] = useState({})
    const [loading, setLoading] = useState(false);

    const memoShowDataTable = React.useMemo(() => {
        return showDataTable
    }, [showDataTable]);


    useEffect(() => {
        const fetchData = async () => {
            const data = await getTrans(user.id);
            const resData = updateGetTransRes(data)
            console.log(resData)
            let newData = null;
            if (type == 1) {
                newData = resData.filter(d => d.status.includes('100'))
            }
            else {
                newData = resData.filter(d => !d.status.includes('100'))
            }
            setWholeData(resData)
            setData(newData)
            setLoading(false)
        }
        console.log(wholeData)
        if (wholeData?.length <= 0) {
            
            fetchData();
            setShowDataTable(false);
            
        }
        else{
            let newData = null
            if (type == 1) {
                newData = wholeData.filter(d => d.status.includes('100'))
            }
            else {
                newData = wholeData.filter(d => !d.status.includes('100'))
            }
            setData(newData)

        }
        const timer = setInterval(() => {
            fetchData();
            // setSelectedFeed({});
        }, 30000); // 3000 milliseconds = 3 seconds

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

            <div className="w-full">

                <table className="w-full  border-collapse   text-sm  shadow-lg">
                    <thead className="bg-gray-300">
                        <tr className="border-b">
                            <th className="p-2 rounded-tl-lg border-r font-semibold">Book Name</th>
                            <th className="p-2 border-r font-semibold">Timestamps</th>
                            <th className="p-2 border-r font-semibold">Status</th>
                            <th className="p-2 rounded-tr-lg font-semibold">Action</th>
                        </tr>
                    </thead>

                    <tbody className=' border-b  bg-white text-sm leading-relaxed  divide-y divide-gray-200 dark:divide-gray-700 '>
                        {!loading ?
                            data?.length > 0 ?
                                data.map((feed, i) => (
                                    <tr key={feed.id} className="mb-2">
                                        <td className="p-2 text-sm border capitalize">{feed.book_name}</td>
                                        <td className="p-2 text-sm text-gray-600 border word-break-all">{feed.timestamps?.includes(':') ? feed.timestamps : timeFormator(feed.timestamps)}</td>

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
                                            <button className='button' onClick={() => regenerateNote(feed)}><span className="flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                <span className="ml-2">Regenerate Notes</span>
                                            </span></button>
                                        </td>
                                    </tr>
                                ))
                                :
                                <tr>
                                    <td className="p-2 text-sm  capitalize" colSpan="4">No data found</td>
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
            </div>

            {memoShowDataTable && <DataTableDisplay data={[selectedFeed]} />}
        </>
    )
}

export default ProfileTable