import React from 'react'
import { Route } from 'react-router-dom'

import LiveMatchesPage from '../../features/live-matches/pages/LiveMatchesPage'
import RulesPage from '../../features/rules/pages/RulesPage'
import SettingsPage from '../../features/settings/pages/SettingsPage'
import LedgerPage from '../../features/ledger/pages/LedgerPage'
import DashboardHomePage from '../../features/dashboard/pages/DashboardHomePage'
import PasswordPage from '../../features/auth/pages/PasswordPage'
import MatchDetails from '../../features/match-details/MatchDetails'

const DashboardRoutes = () => {

    return (

        <>

            <Route path="dashboard" element={<DashboardHomePage />} />
            <Route path="dashboard/live" element={<LiveMatchesPage />} />
            <Route path="dashboard/rules" element={<RulesPage />} />
            <Route path="dashboard/settings" element={<SettingsPage />} />
            <Route path="dashboard/ledger" element={<LedgerPage />} />
            <Route path="dashboard/password" element={<PasswordPage />} />
            <Route path="match/:matchId" element={<MatchDetails />} />

        </>

    )

}

export default DashboardRoutes
