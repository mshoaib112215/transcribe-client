import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import ProfileTable from '../../components/ProfileTable'

const QueueBooks = ({ user, setWholeData, wholeData }) => {
    console.log(wholeData)
    return (
        <>
            <ProfileTable type="2" setWholeData={setWholeData} user={user} wholeData={wholeData} />
        </>
    )
}

export default QueueBooks