import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Home from '../pages/Home';
import Player from '../pages/Player';
import io from 'socket.io-client';
import React, { useEffect, useState } from 'react';

import Protected from '../Protected/Protected';
import Login from './Login';
import Pages from '../pages/Pages';
import Logout from './Logout';

const Routers = () => {
    const [isAuth, setIsAuth] = useState(false);
    const [user, setUser] = useState(null);

    

    return (
        <Router>

            <Routes>
                <Route
                    path="/login"
                    element={<Login setIsAuth={setIsAuth} isAuth={isAuth} setUser={setUser} />}
                />
                <Route
                    path="/logout"
                    element={<Logout setIsAuth={() => setIsAuth()} isAuth={isAuth} />}
                />
                <Route
                    path="*"
                    element={
                        <Protected isAuth={isAuth} setIsAuth={setIsAuth} setUser={setUser} >
                            <Pages user={user }/>
                            {/* isAuth ? <Pages /> : <Navigate to="/login" /> */}
                        </Protected>
                    }
                />
            </Routes>
        </Router>
    );
};

export default Routers;
