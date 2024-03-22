import React, { useEffect, useState } from 'react'

const Feeds = () => {
    const [feeds, setFeeds] = useState([])
    useEffect(() => {
        const fetchFeeds = async () => {
            const res = await fetch('http://localhost/noteclimberConnection.php/api/get-trans', {
                method: 'GET',
            })
            const data = await res.json();
            console.log(data)
            setFeeds(data)
        }
        fetchFeeds();
    }, [])
    
    const timeFormator = (time) => {
        try {

            return new Date(time * 1000).toISOString().substr(11, 8);
        }
        catch (er) {
            toast.error("Error will converting time " + er + time)
        }
    }
    return (
        <div className=" p-4 ">
            <h1 className="text-2xl font-bold mb-4">Feeds</h1>
            <table className="w-full border border-collapse border-gray-300">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="p-2 ">Book Name</th>
                        <th className="p-2 ">Timestamps</th>
                    </tr>
                </thead>

                <tbody>
                    {feeds.map((feed) => (
                        <tr key={feed.id} className="mb-2">
                            <td className="p-2 text-lg border capitalize">{feed.book_name}</td>
                            <td className="p-2 text-sm text-gray-600 border">{timeFormator(feed.timestamps)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

    )
}

export default Feeds