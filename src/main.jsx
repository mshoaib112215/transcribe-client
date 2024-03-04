import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './pages/Home.jsx'
import './index.css'
import Routers from './components/Routes.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Routers />
  </React.StrictMode>,
)
