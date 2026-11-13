import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { NotificationsProvider } from './store/NotificationsContext'
import './index.css'
import { RouterProvider } from './router'
import { AppProvider } from './store/AppContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <NotificationsProvider>
      <RouterProvider>
        <App />
      </RouterProvider>
      </NotificationsProvider>
    </AppProvider>
  </React.StrictMode>,
)
