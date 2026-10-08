import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { SessionGate } from './components/auth/SessionGate'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SessionGate><App /></SessionGate>
  </React.StrictMode>,
)
