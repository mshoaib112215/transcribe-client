import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import Player from '../pages/Player';
import io from 'socket.io-client';
import { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';

const Routers = () => {
   

    
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path='player' element={<Player/>} />
            </Routes>
        </Router>

    )
}

export default Routers;