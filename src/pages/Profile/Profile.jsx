import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProfileTable from '../../components/ProfileTable'

const Profile = ({ user, setWholeData, wholeData }) => {
    console.log(user)
    return (

        <>
            <ProfileTable type="1" setWholeData={setWholeData} user={user} wholeData={wholeData} />
        </>
    )
}

export default Profile