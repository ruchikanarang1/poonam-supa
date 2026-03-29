import React, { useState, useEffect } from 'react';
import { getUsers, updateUserRoles, getUserByEmail } from '../../lib/db';
import { Shield, Truck, FileText, Search, PlusCircle, ShoppingBag, TicketCheck } from 'lucide-react';

export default function TeamManagement() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchEmail, setSearchEmail] = useState('');
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const allUsers = await getUsers();
            // Filter out regular users to keep the list completely clean
            const employeeUsers = allUsers.filter(u => u.role === 'admin' || (u.roles && u.roles.length > 0) || u.isEmployeeCandidate);
            setEmployees(employeeUsers);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        if (!searchEmail.trim()) return;

        setSearching(true);
        try {
            const user = await getUserByEmail(searchEmail);
            if (!user) {
                alert(`No user found with email ${searchEmail}. Ensure they have signed into the website with Google at least once!`);
                setSearching(false);
                return;
            }

            // Check if already in list
            if (employees.find(e => e.id === user.id)) {
                alert("This user is already in the employee list below.");
                setSearchEmail('');
                setSearching(false);
                return;
            }

            // Temporarily add them to the UI as a candidate so the admin can assign roles
            setEmployees([...employees, { ...user, isEmployeeCandidate: true, roles: user.roles || [] }]);
            setSearchEmail('');
            alert("User found! They have been added to the table below. Please check the boxes to assign them their portal permissions.");

        } catch (err) {
            console.error('Failed to find user', err);
            alert("Error searching database");
        } finally {
            setSearching(false);
        }
    };

    const toggleRole = async (userId, userRoles = [], roleName) => {
        let newRoles = [...userRoles];
        if (newRoles.includes(roleName)) {
            newRoles = newRoles.filter(r => r !== roleName);
        } else {
            newRoles.push(roleName);
        }

        try {
            await updateUserRoles(userId, newRoles);
            // Updating local state instantly
            setEmployees(employees.map(u => u.id === userId ? { ...u, roles: newRoles } : u));
        } catch (err) {
            console.error('Failed to update role', err);
            alert("Failed to update user role");
        }
    };

    if (loading) return <p>Loading team members...</p>;

    return (
        <div className="card">
            <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-accent-blue)' }}>Team & Role Management</h3>

            <div style={{ marginBottom: 'var(--spacing-xl)', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <PlusCircle size={20} color="var(--color-primary)" />
                    Add New Employee
                </h4>
                <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'gray' }}>
                    Enter the exact Google Email address the employee uses to sign into the website. Once added, you can grant them portal permissions.
                </p>
                <form onSubmit={handleAddEmployee} style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'gray' }} />
                        <input
                            type="email"
                            className="input-field"
                            placeholder="employee@gmail.com"
                            style={{ paddingLeft: '2.5rem' }}
                            value={searchEmail}
                            onChange={e => setSearchEmail(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={searching}>
                        {searching ? 'Finding...' : 'Add to Team'}
                    </button>
                </form>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                        <th style={{ padding: '0.5rem' }}>Employee Name</th>
                        <th style={{ padding: '0.5rem' }}>Email</th>
                        <th style={{ padding: '0.5rem' }}>Admin Role</th>
                        <th style={{ padding: '0.5rem' }}>Transport Portal</th>
                        <th style={{ padding: '0.5rem' }}>Billing Portal</th>
                        <th style={{ padding: '0.5rem' }}>Purchase Portal</th>
                        <th style={{ padding: '0.5rem' }}>Tickets Portal</th>
                    </tr>
                </thead>
                <tbody>
                    {employees.map(u => {
                        const roles = u.roles || [];
                        // Handle legacy 'role: admin' string from phase 1
                        const isLegacyAdmin = u.role === 'admin';
                        const isAdmin = isLegacyAdmin || roles.includes('admin');

                        return (
                            <tr key={u.id} style={{ borderBottom: '1px solid var(--color-secondary)' }}>
                                <td style={{ padding: '0.75rem 0.5rem' }}>
                                    <strong>{u.displayName}</strong>
                                    {u.businessName && <div style={{ fontSize: '0.8rem', color: 'gray' }}>{u.businessName}</div>}
                                </td>
                                <td style={{ padding: '0.75rem 0.5rem' }}>{u.email}</td>
                                <td style={{ padding: '0.75rem 0.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={isAdmin}
                                            onChange={() => toggleRole(u.id, roles, 'admin')}
                                            disabled={isLegacyAdmin}
                                        />
                                        <Shield size={16} color={isAdmin ? 'var(--color-primary)' : 'gray'} />
                                    </label>
                                </td>
                                <td style={{ padding: '0.75rem 0.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={roles.includes('transport')}
                                            onChange={() => toggleRole(u.id, roles, 'transport')}
                                        />
                                        <Truck size={16} color={roles.includes('transport') ? 'var(--color-accent-orange)' : 'gray'} />
                                    </label>
                                </td>
                                <td style={{ padding: '0.75rem 0.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={roles.includes('bills')}
                                            onChange={() => toggleRole(u.id, roles, 'bills')}
                                        />
                                        <FileText size={16} color={roles.includes('bills') ? 'var(--color-accent-blue)' : 'gray'} />
                                    </label>
                                </td>
                                <td style={{ padding: '0.75rem 0.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={roles.includes('orders')}
                                            onChange={() => toggleRole(u.id, roles, 'orders')}
                                        />
                                        <ShoppingBag size={16} color={roles.includes('orders') ? '#e67e22' : 'gray'} />
                                    </label>
                                </td>
                                <td style={{ padding: '0.75rem 0.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={roles.includes('tickets')}
                                            onChange={() => toggleRole(u.id, roles, 'tickets')}
                                        />
                                        <TicketCheck size={16} color={roles.includes('tickets') ? '#6f42c1' : 'gray'} />
                                    </label>
                                </td>
                            </tr>
                        );
                    })}
                    {employees.length === 0 && (
                        <tr>
                            <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'gray' }}>
                                No employees found. Use the search bar above to add an employee.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
