import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, Plus, Edit2, Trash2, Save, X } from 'lucide-react';

export default function ManageCustomers() {
    const { currentUser, userData, isAdmin, currentCompanyId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        customer_name: '',
        business_name: '',
        location: '',
        phone_number: ''
    });

    const hasAccess = isAdmin || userData?.roles?.includes('customer_orders');

    useEffect(() => {
        if (!hasAccess || !currentCompanyId) {
            setLoading(false);
            return;
        }
        loadCustomers();
    }, [hasAccess, currentCompanyId]);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            console.log('Loading customers for company:', currentCompanyId);
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('company_id', currentCompanyId)
                .order('customer_name');

            if (error) {
                console.error('Supabase error loading customers:', error);
                throw error;
            }

            console.log('Customers loaded:', data);
            setCustomers(data || []);
        } catch (err) {
            console.error('Failed to load customers:', err);
            
            // Check if table doesn't exist
            if (err.message.includes('relation "public.customers" does not exist') || 
                err.message.includes('Could not find the table')) {
                alert('Customers table not found. Please run the customer_database_migration.sql in Supabase SQL Editor first.');
            } else {
                alert(`Error loading customers: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newCustomer.customer_name.trim()) {
            alert('Customer name is required');
            return;
        }

        try {
            console.log('Adding customer:', newCustomer);
            const { data, error } = await supabase
                .from('customers')
                .insert([{
                    company_id: currentCompanyId,
                    ...newCustomer
                }])
                .select();

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            console.log('Customer added successfully:', data);
            alert('Customer added successfully!');
            setNewCustomer({ customer_name: '', business_name: '', location: '', phone_number: '' });
            setShowAddForm(false);
            loadCustomers();
        } catch (err) {
            console.error('Error adding customer:', err);
            alert(`Error: ${err.message}`);
        }
    };

    const handleEdit = (customer) => {
        setEditingId(customer.id);
        setEditForm(customer);
    };

    const handleSave = async () => {
        try {
            const { error } = await supabase
                .from('customers')
                .update({
                    customer_name: editForm.customer_name,
                    business_name: editForm.business_name,
                    location: editForm.location,
                    phone_number: editForm.phone_number
                })
                .eq('id', editingId);

            if (error) throw error;

            setEditingId(null);
            setEditForm({});
            loadCustomers();
        } catch (err) {
            console.error('Error updating customer:', err);
            alert(`Error: ${err.message}`);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this customer?')) return;

        try {
            const { error } = await supabase
                .from('customers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            loadCustomers();
        } catch (err) {
            console.error('Error deleting customer:', err);
            alert(`Error: ${err.message}`);
        }
    };

    if (!currentUser) return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}><p>Please log in.</p></div>;
    if (!currentCompanyId) return <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ background: '#fff', padding: '3rem', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '500px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>No Company Selected</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: 1.6 }}>You need to be part of an active company to manage customers.</p>
        </div>
    </div>;
    if (!hasAccess) return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'red' }}>Access Denied</h2></div>;
    if (loading) return <div className="container" style={{ padding: '2rem' }}><p>Loading...</p></div>;

    return (
        <div className="container" style={{ padding: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--color-accent-blue)', color: 'white', padding: '0.5rem', borderRadius: '6px' }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>Manage Customers</h2>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>{customers.length} customers</p>
                    </div>
                </div>
                <button 
                    className="btn btn-primary" 
                    onClick={() => setShowAddForm(!showAddForm)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={18} /> Add Customer
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '2px solid var(--color-accent-blue)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: '#1e293b' }}>Add New Customer</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem', color: '#475569' }}>Customer Name *</label>
                            <input
                                type="text"
                                className="input-field"
                                value={newCustomer.customer_name}
                                onChange={e => setNewCustomer({ ...newCustomer, customer_name: e.target.value })}
                                placeholder="Enter customer name"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem', color: '#475569' }}>Business Name</label>
                            <input
                                type="text"
                                className="input-field"
                                value={newCustomer.business_name}
                                onChange={e => setNewCustomer({ ...newCustomer, business_name: e.target.value })}
                                placeholder="Enter business name"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem', color: '#475569' }}>Location</label>
                            <input
                                type="text"
                                className="input-field"
                                value={newCustomer.location}
                                onChange={e => setNewCustomer({ ...newCustomer, location: e.target.value })}
                                placeholder="Enter location"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem', color: '#475569' }}>Phone Number</label>
                            <input
                                type="text"
                                className="input-field"
                                value={newCustomer.phone_number}
                                onChange={e => setNewCustomer({ ...newCustomer, phone_number: e.target.value })}
                                placeholder="Enter phone number"
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-primary" onClick={handleAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Save size={16} /> Save Customer
                        </button>
                        <button className="btn" onClick={() => setShowAddForm(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#e2e8f0' }}>
                            <X size={16} /> Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Customers Table */}
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <tr>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Customer Name</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Business Name</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Location</th>
                            <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Phone Number</th>
                            <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                    No customers found. Click "Add Customer" to create one.
                                </td>
                            </tr>
                        ) : (
                            customers.map(customer => (
                                <tr key={customer.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    {editingId === customer.id ? (
                                        <>
                                            <td style={{ padding: '0.75rem' }}>
                                                <input
                                                    type="text"
                                                    className="input-field"
                                                    value={editForm.customer_name}
                                                    onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })}
                                                    style={{ fontSize: '0.9rem' }}
                                                />
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <input
                                                    type="text"
                                                    className="input-field"
                                                    value={editForm.business_name || ''}
                                                    onChange={e => setEditForm({ ...editForm, business_name: e.target.value })}
                                                    style={{ fontSize: '0.9rem' }}
                                                />
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <input
                                                    type="text"
                                                    className="input-field"
                                                    value={editForm.location || ''}
                                                    onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                                                    style={{ fontSize: '0.9rem' }}
                                                />
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <input
                                                    type="text"
                                                    className="input-field"
                                                    value={editForm.phone_number || ''}
                                                    onChange={e => setEditForm({ ...editForm, phone_number: e.target.value })}
                                                    style={{ fontSize: '0.9rem' }}
                                                />
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={handleSave}
                                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                    >
                                                        <Save size={14} /> Save
                                                    </button>
                                                    <button
                                                        className="btn"
                                                        onClick={() => { setEditingId(null); setEditForm({}); }}
                                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', background: '#e2e8f0' }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td style={{ padding: '0.75rem', fontWeight: 600, color: '#1e293b' }}>{customer.customer_name}</td>
                                            <td style={{ padding: '0.75rem', color: '#475569' }}>{customer.business_name || '—'}</td>
                                            <td style={{ padding: '0.75rem', color: '#475569' }}>{customer.location || '—'}</td>
                                            <td style={{ padding: '0.75rem', color: '#475569' }}>{customer.phone_number || '—'}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button
                                                        className="btn"
                                                        onClick={() => handleEdit(customer)}
                                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', background: '#dbeafe', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                    >
                                                        <Edit2 size={14} /> Edit
                                                    </button>
                                                    <button
                                                        className="btn"
                                                        onClick={() => handleDelete(customer.id)}
                                                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                    >
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
