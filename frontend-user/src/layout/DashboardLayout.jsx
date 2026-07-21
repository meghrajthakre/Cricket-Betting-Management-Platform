import React from 'react'
import { Outlet } from 'react-router-dom'

const DashboardLayout = () => {

    return (

        <div className="min-h-[calc(100dvh-6rem)]">

                <Outlet />

        </div>

    )

}

export default DashboardLayout
