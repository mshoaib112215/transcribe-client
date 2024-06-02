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
export const getTransText = async (id = null) => {
    try {


        const res = await fetch(root_url + "/get-trans-text?id=" + id);
        const data = await res.json();
        return data;


    } catch (err) {
        console.error(err);
        toast.error("Error in fetching Feeds");
        throw err;
    }
}
export const getBookInfo = async (id = null) => {
    try {


        const res = await fetch(root_url + "/get-book-info?id=" + id);
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

export const getAllWholeTrans = async () => {
    try {
        const res = await fetch('https://www.noteclimber.com/noteclimberConnection.php/api/get-all-whole-trans', {
            method: 'GET',
        })
        const data = await res.json();
        return data

    } catch (error) {
        console.log(error)
        toast.error("Error in fetching Whole Mapped Books");
        throw error

    }
}
export const getUsers = async () => {
    try {
        const res = await fetch('https://www.noteclimber.com/noteclimberConnection.php/api/get-users', {
            method: 'GET',
        })
        const data = await res.json();
        return data

    } catch (error) {
        console.log(error)
        toast.error("Error in fetching Whole Mapped Books");
        throw error

    }
}
export const fetchBooks = async (user_id) => {
    try {
        const res = await fetch('https://www.noteclimber.com/noteclimberConnection.php/api/get-user-book?user_id=' + user_id , {
            method: 'GET',
        })
        return res

    } catch (error) {
        console.log(error)
        // toast.error("Error in fetching books");
        throw error

    }
}
export const downloadAudioBook = async (book) => {
    const rootUrl = "http://127.0.0.1:5111";
    const res = await fetch(rootUrl + "/download-audio/" + book.audio_book_name);
    const url = window.URL.createObjectURL(new Blob([res.body]));
    const link = document.createElement('a');
    link.classList.add('hidden');
    link.href = url;
    link.setAttribute('download', book.audio_book_name);
    document.body.appendChild(link);
    link.click();
}
export const downloadeBook = async (book) => {
    const rootUrl = "http://127.0.0.1:5111";
    const res = await fetch(rootUrl + "/download-ebook/" + book.book_name);
    const url = window.URL.createObjectURL(new Blob([res.body]));
    const link = document.createElement('a');
    link.classList.add('hidden');
    link.href = url;
    link.setAttribute('download', book.book_name + ".pdf"); 
    document.body.appendChild(link);
    link.click();
    // document.body.removeChild(link);
}

