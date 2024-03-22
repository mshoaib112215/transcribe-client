import axios from 'axios';
import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'

const Logout = ({ setIsAuth, isAuth }) => {
    function setCookie(name, value, days) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + days);
        const cookieValue = encodeURIComponent(name) + "=" + encodeURIComponent(value) + "; expires=" + expirationDate.toUTCString() + "; path=/;";
        document.cookie = cookieValue;
    }
    // if (isAuth) {
    useEffect(() => {
      
        const fetchData = async () => {
            try {
                setCookie('session_info', '', 0);
                setIsAuth(false);
            } catch (error) {
                console.error('Error checking session:', error);
                setIsAuth(false);
                return <Navigate to="/login" />;
            }
        };
        fetchData();
    }, []);

    return <Navigate to="/login" />


}

export default Logout