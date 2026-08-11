import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/authProvider'
import { TenantProvider } from './context/TenantContext'
import { PermissionProvider } from './context/permissionProvider'
import App from './App'
import { ThemeProvider } from './context/themeProvider'
import { NotificationProvider } from './context/notificationProvider'
import { Analytics } from '@vercel/analytics/react'

function Root() {
  // Ensure default tenant slug is present in localStorage
  if (!localStorage.getItem('x-tenant-slug')) {
    localStorage.setItem('x-tenant-slug', 'admin');
  }

  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <TenantProvider>
            <PermissionProvider>
              <NotificationProvider>
                <App />
                <Analytics />
              </NotificationProvider>
            </PermissionProvider>
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
