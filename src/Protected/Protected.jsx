import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const Protected = ({ isAuth, setIsAuth, children, setUser }) => {
    const [gotRes, setGotRes] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const sessionInfoCookie = document.cookie.split('; ').find(row => row.startsWith('session_info='));
                let sessionInfo = sessionInfoCookie ? decodeURIComponent(sessionInfoCookie.split('=')[1]) : null;
                sessionInfo = JSON.parse(sessionInfo);
                if (sessionInfo?.user_info?.id) {
                    setIsAuth(true);
                    setUser(sessionInfo.user_info);
                } else {
                    setIsAuth(false);
                }

                setGotRes(true);
            } catch (error) {
                console.error('Error checking session:', error);
                setIsAuth(false);

                setGotRes(true);
            }
        };

        checkSession();
    }, []);
    if (!gotRes) {
        // spinner using tailwindd
        return (
            <div className='flex justify-center items-center'>

                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'>
                </div>
            </div>
        )
    }

    return isAuth ? children : <Navigate to="/login" />;
};

export default Protected;