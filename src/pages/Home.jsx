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

    // Default to Dashboard for logged-in users
    return <EmployeeDashboard />;
}
