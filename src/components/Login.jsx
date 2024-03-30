import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';


function Login({ setIsAuth, isAuth, setUser }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    function setCookie(name, value, days) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + days);
        const cookieValue = encodeURIComponent(name) + "=" + encodeURIComponent(value) + "; expires=" + expirationDate.toUTCString() + "; path=/";
        document.cookie = cookieValue;
    }
    if (isAuth) {
        return <Navigate to="/" />
    }
    const handleEmailChange = (e) => {
        setEmail(e.target.value);
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
    };

    const toggleShowPassword = () => {
        setShowPassword(!showPassword);
    };
    const handleLogin = async () => {
        const formdata = new FormData()
        formdata.append('email', email)
        formdata.append('password', password)

        const res = await fetch('http://localhost/noteclimberConnection.php/api/login', {
            credentials: 'same-origin',
            method: 'POST',
            body: formdata
        })
        const data = await res.json()
        // JavaScript equivalent of setting access token in cookies
        if (data?.id && data?.id > 0) {
            setIsAuth(true)
            const access_token = generateAccessToken(); // Generate access token
            const session_info = {
                access_token: access_token,
                user_info: data
            };
            const session_info_json = JSON.stringify(session_info);
            // save data in cookies 
            setCookie('session_info', session_info_json, 60 * 60 * 24);


        }
    }
    function generateAccessToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(byte => ('0' + byte.toString(16)).slice(-2)).join('');
    }
    return (
        <div className="flex flex-col items-center justify-center h-screen">

            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={handleEmailChange}
                className="border border-gray-300 rounded-md p-2 mb-4"
            />
            <div className="relative">
                <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={handlePasswordChange}
                    className="border border-gray-300 rounded-md p-2 mb-4"
                />
                <button
                    onClick={toggleShowPassword}
                    className="absolute top-1/2 right-2 transform -translate-y-1/2"
                >
                    {showPassword ? 'Hide' : 'Show'}
                </button>
            </div>
            <button className="bg-blue-500 text-white px-4 py-2 rounded-md mt-4" onClick={handleLogin}>Login</button>
        </div>
    );
}

export default Login;
