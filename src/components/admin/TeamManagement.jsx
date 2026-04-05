import React, { useState, useEffect } from 'react';
import { 
    getCompanyEmployees, updateCompanyEmployeeRoles, 
    addCompanyEmployee, getUserByEmail, updateEmployeeProfile
} from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Truck, FileText, Search, PlusCircle, ShoppingBag, TicketCheck, User, Edit2, X, Save } from 'lucide-react';

export default function TeamManagement() {
    const { currentCompanyId } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchEmail, setSearchEmail] = useState('');
    const [searching, setSearching] = useState(false);
    
    // Profile modal state
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [profileForm, setProfileForm] = useState({
        display_name: '',
        phone_number: '',
        email: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (currentCompanyId) fetchEmployees();
    }, [currentCompanyId]);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const companyUsers = await getCompanyEmployees(currentCompanyId);
            setEmployees(companyUsers);
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

            // Add them to the company in the database
            await addCompanyEmployee(currentCompanyId, user.id);
            
            setSearchEmail('');
            alert("User found and added to the company! They have been added to the table below. Please check the boxes to assign them their portal permissions.");
            fetchEmployees();

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
            await updateCompanyEmployeeRoles(currentCompanyId, userId, newRoles);
            // Updating local state instantly
            setEmployees(employees.map(u => u.id === userId ? { ...u, roles: newRoles } : u));
        } catch (err) {
            console.error('Failed to update role', err);
            alert("Failed to update user role");
        }
    };
    
    const handleViewProfile = (employee) => {
        setSelectedEmployee(employee);
        setProfileForm({
            display_name: employee.display_name || '',
            phone_number: employee.phone_number || '',
            email: employee.email || ''
        });
        setIsEditing(false);
        setShowProfileModal(true);
    };
    
    const handleSaveProfile = async () => {
        if (!profileForm.display_name.trim()) {
            alert('Display name is required');
            return;
        }
        
        setSaving(true);
        try {
            await updateEmployeeProfile(selectedEmployee.id, {
                display_name: profileForm.display_name,
                phone_number: profileForm.phone_number
            });
            
            // Update local state
            setEmployees(employees.map(emp => 
                emp.id === selectedEmployee.id 
                    ? { ...emp, display_name: profileForm.display_name, phone_number: profileForm.phone_number }
                    : emp
            ));
            
            setSelectedEmployee({
                ...selectedEmployee,
                display_name: profileForm.display_name,
                phone_number: profileForm.phone_number
            });
            
            setIsEditing(false);
            alert('Profile updated successfully!');
        } catch (err) {
            console.error('Failed to update profile:', err);
            alert('Failed to update profile');
        } finally {
            setSaving(false);
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
                            <tr 
                                key={u.id} 
                                style={{ 
                                    borderBottom: '1px solid var(--color-secondary)',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                            >
                                <td 
                                    style={{ padding: '0.75rem 0.5rem' }}
                                    onClick={() => handleViewProfile(u)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <User size={16} color="var(--color-accent-blue)" />
                                        <div>
                                            <strong>{u.display_name}</strong>
                                            {u.businessName && <div style={{ fontSize: '0.8rem', color: 'gray' }}>{u.businessName}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td 
                                    style={{ padding: '0.75rem 0.5rem' }}
                                    onClick={() => handleViewProfile(u)}
                                >
                                    {u.email}
                                </td>
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
            
            {/* Employee Profile Modal */}
            {showProfileModal && selectedEmployee && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User size={24} /> Employee Profile
                            </h3>
                            <button 
                                onClick={() => setShowProfileModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        {!isEditing ? (
                            // View Mode
                            <div>
                                <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                                                Display Name
                                            </label>
                                            <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-accent-blue)' }}>
                                                {selectedEmployee.display_name || 'Not set'}
                                            </div>
                                        </div>
                                        
                                        {selectedEmployee.email && (
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                                                    Email
                                                </label>
                                                <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                                                    {selectedEmployee.email}
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                                                Phone Number
                                            </label>
                                            <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                                                {selectedEmployee.phone_number || 'Not set'}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                                                Assigned Roles
                                            </label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                {(selectedEmployee.roles || []).length === 0 && (
                                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No roles assigned</span>
                                                )}
                                                {(selectedEmployee.roles || []).includes('admin') && (
                                                    <span style={{ background: 'var(--color-accent-blue)', color: 'white', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Shield size={14} /> Admin
                                                    </span>
                                                )}
                                                {(selectedEmployee.roles || []).includes('transport') && (
                                                    <span style={{ background: 'var(--color-accent-orange)', color: 'white', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Truck size={14} /> Transport
                                                    </span>
                                                )}
                                                {(selectedEmployee.roles || []).includes('bills') && (
                                                    <span style={{ background: '#3b82f6', color: 'white', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <FileText size={14} /> Bills
                                                    </span>
                                                )}
                                                {(selectedEmployee.roles || []).includes('orders') && (
                                                    <span style={{ background: '#e67e22', color: 'white', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <ShoppingBag size={14} /> Orders
                                                    </span>
                                                )}
                                                {(selectedEmployee.roles || []).includes('tickets') && (
                                                    <span style={{ background: '#6f42c1', color: 'white', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <TicketCheck size={14} /> Tickets
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <button 
                                    className="btn btn-primary" 
                                    onClick={() => setIsEditing(true)}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    <Edit2 size={16} /> Edit Profile
                                </button>
                            </div>
                        ) : (
                            // Edit Mode
                            <div>
                                <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                                            Display Name *
                                        </label>
                                        <input 
                                            type="text"
                                            className="input-field"
                                            value={profileForm.display_name}
                                            onChange={e => setProfileForm({ ...profileForm, display_name: e.target.value })}
                                            placeholder="Enter display name"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                                            Phone Number
                                        </label>
                                        <input 
                                            type="tel"
                                            className="input-field"
                                            value={profileForm.phone_number}
                                            onChange={e => setProfileForm({ ...profileForm, phone_number: e.target.value })}
                                            placeholder="Enter phone number"
                                        />
                                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                            Required for WhatsApp notifications
                                        </p>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button 
                                        className="btn btn-outline" 
                                        onClick={() => {
                                            setIsEditing(false);
                                            setProfileForm({
                                                display_name: selectedEmployee.display_name || '',
                                                phone_number: selectedEmployee.phone_number || '',
                                                email: selectedEmployee.email || ''
                                            });
                                        }}
                                        style={{ flex: 1 }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={handleSaveProfile}
                                        disabled={saving}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
