import React from 'react'
import { Routes, Route } from 'react-router-dom'

import LoginPage from '../../features/auth/pages/LoginPage'
import DashboardPage from '../../features/dashboard/pages/DashboardPage'

import MainLayout from '../layouts/MainLayout'
import DashboardRoutes from './DashboardRoutes'
import DashboardLayout from '../layouts/DashboardLayout'
import NotFoundPage from '../../features/home/pages/NotFoundPage'
import HomePage from '../../features/home/pages/HomePage'

const AppRoutes = () => {
    return (

            <Routes>
                {/* Public */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                {/* Protected layout */}
                <Route element={<MainLayout />}>

                    <Route path="/dashboard" element={<DashboardPage />} />
                    
                    <Route element={<DashboardLayout />}>
                        {DashboardRoutes()}
                    </Route>
                </Route>
                <Route path="*" element={<NotFoundPage />} />
            </Routes>

    )
}

export default AppRoutes
