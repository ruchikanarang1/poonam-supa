import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminOverview from '../components/admin/AdminOverview';
import EmployeeDashboard from './EmployeeDashboard';
import Catalogue from './Catalogue';

export default function Home() {
    const { currentUser, userData, isAdmin } = useAuth();
    const roles = userData?.roles || [];

    if (!currentUser) {
        return <Catalogue />;
    }

    if (isAdmin) {
        return <AdminOverview />;
    }

    // Logged-in employee (any role) or regular user
    return <EmployeeDashboard />;
}
