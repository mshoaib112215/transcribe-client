// This file exports all APIs related functions. It is a single point of entry
// for all APIs related functions.
const root_url = "https://www.noteclimber.com/noteclimberConnection.php/api";

export const getTrans = async () => {
    try {
        const res = await fetch(root_url + "/get-trans");
        const data = await res.json();
        return data;
    } catch (err) {
        console.error(err);
        throw err;
    }
}
export const universalRequest = async (method, endpoint) => {
    const response = await fetch(root_url + endpoint, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({data})
    })
    const data = await response.json()
    return data
}

