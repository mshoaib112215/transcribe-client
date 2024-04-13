// This file exports all APIs related functions. It is a single point of entry

import { toast } from "react-toastify";

// for all APIs related functions.
const root_url = "https://www.noteclimber.com/noteclimberConnection.php/api";

export const getTrans = async (user_id = "all") => {
    try {


        const res = await fetch(root_url + "/get-trans?id=" + user_id);
        const data = await res.json();
        return data;

        
    } catch (err) {
        console.error(err);
        toast.error("Error in fetching Feeds");
        throw err;
    }
}
export const universalRequest = async (method, endpoint) => {
    const response = await fetch(root_url + endpoint, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data })
    })
    const data = await response.json()
    return data
}

