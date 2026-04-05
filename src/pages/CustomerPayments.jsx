import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DollarSign, Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import GenericAutocomplete from '../components/GenericAutocomplete';

export default function CustomerPayments() {
    const { currentUser, userData, isAdmin, currentCompanyId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' or 'pending'
    
    // Form State
    const [formData, setFormData] = useState({
        employee_name: '',
        customer_name: '',
        business_name: '',
        payment_mode: 'cash',
        amount_to_be_paid: '',
        amount_received: '',
        payment_date: '',
        payment_time: '',
        notes: ''
    });
    
    // Data State
    const [allPayments, setAllPayments] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [businessNames, setBusinessNames] = useState([]); // For business name autocomplete
    const [customersRaw, setCustomersRaw] = useState([]); // Store raw customer data
    const [employees, setEmployees] = useState([]);
    const [todayDateStr, setTodayDateStr] = useState('');
    const [todayDayStr, setTodayDayStr] = useState('');

    const hasAccess = isAdmin || userData?.roles?.includes('customer_orders');

    useEffect(() => {
        if (!hasAccess || !currentCompanyId) {
            setLoading(false);
            return;
        }

        // Set date/time immediately
        const now = new Date();
        setFormData({
            employee_name: '',
            customer_name: '',
            business_name: '',
            payment_mode: 'cash',
            amount_to_be_paid: '',
            amount_received: '',
            payment_date: now.toISOString().split('T')[0],
            payment_time: now.toTimeString().split(' ')[0].substring(0, 5),
            notes: ''
        });
        setTodayDateStr(now.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }));
        setTodayDayStr(now.toLocaleDateString('en-US', { weekday: 'long' }));

        loadInitialData();
    }, [hasAccess, currentCompanyId]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // Initialize form with current date/time FIRST
            const now = new Date();
            setFormData(prev => ({
                ...prev,
                payment_date: now.toISOString().split('T')[0],
                payment_time: now.toTimeString().split(' ')[0].substring(0, 5)
            }));

            // Load payments
            const { data: paymentsData, error: paymentsError } = await supabase
                .from('customer_payments')
                .select('*')
                .eq('company_id', currentCompanyId)
                .order('payment_date', { ascending: false });

            if (paymentsError) throw paymentsError;
            setAllPayments(paymentsData || []);

            // Load employees
            const { data: employeesData, error: employeesError } = await supabase
                .from('profiles')
                .select('id, full_name')
                .or(`id.in.(${userData?.company_ids || []})`);

            if (!employeesError && employeesData) {
                setEmployees(employeesData);
            }

            // Try to load customers from customers table first
            const { data: customersData, error: customersError } = await supabase
                .from('customers')
                .select('*')
                .eq('company_id', currentCompanyId)
                .order('customer_name');

            if (!customersError && customersData) {
                // Store raw customer data
                setCustomersRaw(customersData);
                
                // Format customers for autocomplete
                const formattedCustomers = customersData.map(customer => ({
                    id: customer.id,
                    name: customer.customer_name,
                    business_name: customer.business_name,
                    address: customer.location || customer.phone_number || ''
                }));
                setCustomers(formattedCustomers);

                // Format business names for autocomplete (only unique business names)
                const uniqueBusinessNames = [];
                const businessMap = new Map();
                customersData.forEach(customer => {
                    if (customer.business_name && !businessMap.has(customer.business_name)) {
                        businessMap.set(customer.business_name, true);
                        uniqueBusinessNames.push({
                            id: customer.id,
                            name: customer.business_name,
                            customer_name: customer.customer_name,
                            address: customer.location || customer.phone_number || ''
                        });
                    }
                });
                setBusinessNames(uniqueBusinessNames);
            } else {
                // Fallback: Load unique customers from orders if customers table doesn't exist
                console.log('Customers table not found, falling back to orders table');
                const { data: ordersData, error: ordersError } = await supabase
                    .from('orders')
                    .select('customer_name, customer_phone, customer_address')
                    .eq('company_id', currentCompanyId);

                if (ordersError) throw ordersError;
                
                // Create unique customer list
                const uniqueCustomers = [];
                const customerMap = new Map();
                
                (ordersData || []).forEach(order => {
                    if (order.customer_name && !customerMap.has(order.customer_name)) {
                        customerMap.set(order.customer_name, true);
                        uniqueCustomers.push({
                            id: order.customer_name,
                            name: order.customer_name,
                            address: order.customer_address || order.customer_phone || ''
                        });
                    }
                });
                
                setCustomers(uniqueCustomers);
            }

        } catch (err) {
            console.error('Failed to load data:', err);
            alert(`Error loading data: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCustomerNameChange = (value) => {
        setFormData(prev => ({ ...prev, customer_name: value }));
        
        // Auto-fill business name if exact match found
        const matches = customersRaw.filter(c => 
            c.customer_name.toLowerCase() === value.toLowerCase()
        );
        
        if (matches.length === 1) {
            setFormData(prev => ({ 
                ...prev, 
                customer_name: value,
                business_name: matches[0].business_name || '' 
            }));
        }
    };

    const handleBusinessNameChange = (value) => {
        setFormData(prev => ({ ...prev, business_name: value }));
        
        // Auto-fill customer name if exact match found
        const matches = customersRaw.filter(c => 
            c.business_name && c.business_name.toLowerCase() === value.toLowerCase()
        );
        
        if (matches.length === 1) {
            setFormData(prev => ({ 
                ...prev, 
                business_name: value,
                customer_name: matches[0].customer_name 
            }));
        }
    };

    const handleBusinessNameSelect = (business) => {
        setFormData(prev => ({
            ...prev,
            business_name: business.name,
            customer_name: business.customer_name || ''
        }));
    };

    const handleCustomerSelect = (customer) => {
        setFormData(prev => ({
            ...prev,
            customer_name: customer.name,
            business_name: customer.business_name || ''
        }));
    };

    const handleAddCustomer = async (customerName) => {
        try {
            const { data, error } = await supabase
                .from('customers')
                .insert([{
                    company_id: currentCompanyId,
                    customer_name: customerName
                }])
                .select()
                .single();

            if (error) throw error;

            // Reload customers
            await loadInitialData();
            
            // Set the newly added customer in the form
            setFormData(prev => ({ ...prev, customer_name: customerName }));
        } catch (err) {
            console.error('Error adding customer:', err);
            alert(`Error adding customer: ${err.message}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        
        // Validation
        if (!formData.customer_name) {
            alert('Please select a customer');
            return;
        }
        
        if (!formData.amount_to_be_paid || parseFloat(formData.amount_to_be_paid) <= 0) {
            alert('Please enter a valid amount to be paid');
            return;
        }
        
        if (!formData.amount_received || parseFloat(formData.amount_received) < 0) {
            alert('Please enter a valid amount received');
            return;
        }

        setSubmitting(true);
        try {
            const paymentData = {
                company_id: currentCompanyId,
                customer_name: formData.customer_name,
                payment_mode: formData.payment_mode,
                amount_to_be_paid: parseFloat(formData.amount_to_be_paid),
                amount_received: parseFloat(formData.amount_received),
                payment_date: `${formData.payment_date}T${formData.payment_time}:00`,
                created_by: currentUser?.uid,
                notes: formData.notes || null
            };

            const { error } = await supabase
                .from('customer_payments')
                .insert([paymentData]);

            if (error) throw error;

            alert('Payment recorded successfully!');
            
            // Reset form
            const now = new Date();
            setFormData({
                employee_name: '',
                customer_name: '',
                business_name: '',
                payment_mode: 'cash',
                amount_to_be_paid: '',
                amount_received: '',
                payment_date: now.toISOString().split('T')[0],
                payment_time: now.toTimeString().split(' ')[0].substring(0, 5),
                notes: ''
            });
            
            loadInitialData();
        } catch (err) {
            console.error('Error recording payment:', err);
            alert(`Error: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    if (!currentUser) return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}><p>Please log in.</p></div>;
    if (!currentCompanyId) return <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ background: '#fff', padding: '3rem', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '500px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>No Company Selected</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: 1.6 }}>You need to be part of an active company to access Payments/Collection.</p>
        </div>
    </div>;
    if (!hasAccess) return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'red' }}>Access Denied</h2></div>;
    if (loading) return <div className="container" style={{ padding: '2rem' }}><p>Loading...</p></div>;

    const todayStr = new Date().toISOString().split('T')[0];
    const filteredPayments = (activeTab === 'ledger' 
        ? allPayments.filter(p => p.payment_date && p.payment_date.startsWith(todayStr))
        : allPayments.filter(p => p.status === 'pending' || p.status === 'partial'))
        .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));

    return (
        <div className="container" style={{ padding: '0.25rem 0' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ background: 'var(--color-accent-blue)', color: 'white', padding: '0.4rem', borderRadius: '4px' }}>
                        <DollarSign size={18} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--color-accent-blue)' }}>Payments/Collection</h2>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2px' }}>
                            <button onClick={() => setActiveTab('ledger')} className={`portal-tab ${activeTab === 'ledger' ? 'active' : ''}`} style={{ fontSize: '0.7rem', padding: '1px 6px' }}>Ledger</button>
                            <button onClick={() => setActiveTab('pending')} className={`portal-tab ${activeTab === 'pending' ? 'active' : ''}`} style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                                Pending {allPayments.filter(p => p.status === 'pending' || p.status === 'partial').length > 0 && <span style={{ background: 'var(--color-accent-orange)', color: 'white', padding: '0px 4px', borderRadius: '4px', marginLeft: '2px' }}>{allPayments.filter(p => p.status === 'pending' || p.status === 'partial').length}</span>}
                            </button>
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                    <strong>{todayDayStr}</strong>, {todayDateStr}
                </div>
            </div>

            <div className="portal-container">
                {/* Entry Form */}
                {activeTab === 'ledger' && (
                <div className="saas-excel-container">
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {/* First Row */}
                            <div className="saas-form-row-scroll" style={{ overflowX: 'visible' }}>
                                {/* Header Row */}
                                <div className="saas-excel-header">
                                    <div className="saas-excel-label excel-column-flexible">Employee</div>
                                    <div className="saas-excel-label excel-column-flexible">Customer Name</div>
                                    <div className="saas-excel-label excel-column-flexible">Business Name</div>
                                    <div className="saas-excel-label excel-column-flexible">Payment Mode</div>
                                    <div className="saas-excel-label excel-column-flexible">Amount to be Paid</div>
                                    <div className="saas-excel-label excel-column-flexible">Amount Received</div>
                                    <div className="saas-excel-label excel-column-flexible">Pending</div>
                                    <div className="saas-excel-label excel-column-datetime">Date & Time</div>
                                </div>

                                {/* Data Entry Row */}
                                <div className="saas-excel-data-row">
                                    <div className="saas-excel-cell excel-column-flexible" data-label="Employee">
                                        <select 
                                            className="saas-input-box" 
                                            value={formData.employee_name} 
                                            onChange={e => setFormData({...formData, employee_name: e.target.value})}
                                            style={{ width: '100%', fontSize: '0.8rem' }}
                                            required
                                        >
                                            <option value="">Select Employee...</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.full_name}>{emp.full_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="saas-excel-cell excel-column-flexible" data-label="Customer Name">
                                        <GenericAutocomplete 
                                            placeholder="Customer Name..." 
                                            items={customers}
                                            value={formData.customer_name} 
                                            onChange={handleCustomerNameChange}
                                            onSelect={handleCustomerSelect}
                                            onAddNew={handleAddCustomer}
                                            addNewLabel="Add Customer"
                                        />
                                    </div>
                                    <div className="saas-excel-cell excel-column-flexible" data-label="Business Name">
                                        <GenericAutocomplete 
                                            placeholder="Business Name..." 
                                            items={businessNames}
                                            value={formData.business_name} 
                                            onChange={handleBusinessNameChange}
                                            onSelect={handleBusinessNameSelect}
                                        />
                                    </div>
                                    <div className="saas-excel-cell excel-column-flexible" data-label="Payment Mode">
                                        <select 
                                            className="saas-input-box" 
                                            value={formData.payment_mode} 
                                            onChange={e => setFormData({...formData, payment_mode: e.target.value})}
                                            style={{ width: '100%', fontSize: '0.8rem' }}
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="online">Online</option>
                                        </select>
                                    </div>
                                    <div className="saas-excel-cell excel-column-flexible" data-label="Amount to be Paid">
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            required 
                                            className="saas-input-box" 
                                            placeholder="0.00" 
                                            value={formData.amount_to_be_paid} 
                                            onChange={e => setFormData({...formData, amount_to_be_paid: e.target.value})} 
                                        />
                                    </div>
                                    <div className="saas-excel-cell excel-column-flexible" data-label="Amount Received">
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            required 
                                            className="saas-input-box" 
                                            placeholder="0.00" 
                                            value={formData.amount_received} 
                                            onChange={e => setFormData({...formData, amount_received: e.target.value})} 
                                        />
                                    </div>
                                    <div className="saas-excel-cell excel-column-flexible" data-label="Pending">
                                        <input 
                                            type="text" 
                                            className="saas-input-box" 
                                            placeholder="Auto-calc" 
                                            value={formData.amount_to_be_paid && formData.amount_received 
                                                ? (parseFloat(formData.amount_to_be_paid) - parseFloat(formData.amount_received)).toFixed(2)
                                                : ''
                                            }
                                            disabled
                                            style={{ background: '#f8fafc', color: '#64748b' }}
                                        />
                                    </div>
                                    <div className="saas-excel-cell excel-column-datetime" data-label="Date & Time">
                                        <div style={{ display: 'flex', gap: '2px', width: '100%' }}>
                                            <input 
                                                type="date" 
                                                required 
                                                className="saas-input-box" 
                                                style={{ flex: 1.5, fontSize: '0.7rem' }} 
                                                value={formData.payment_date} 
                                                onChange={e => setFormData({...formData, payment_date: e.target.value})} 
                                            />
                                            <input 
                                                type="time" 
                                                required 
                                                className="saas-input-box" 
                                                style={{ flex: 1, fontSize: '0.7rem' }} 
                                                value={formData.payment_time} 
                                                onChange={e => setFormData({...formData, payment_time: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Second Row - Save Button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem 1rem', background: '#fff', borderRadius: '0 0 6px 6px' }}>
                                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 2rem', fontSize: '0.85rem' }} disabled={submitting}>
                                    {submitting ? 'Saving...' : '💾 Save Payment'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                )}

                {/* Ledger Table */}
                <div className="saas-ledger-card">
                    <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--color-border)', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--color-accent-blue)' }}>
                            {activeTab === 'ledger' ? "Today's Payments" : "Pending Payments"}
                        </h3>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)' }}>{filteredPayments.length} items</div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <table className="daily-entries-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th className="saas-table-header" style={{ width: '50px' }}>S.No</th>
                                    <th className="saas-table-header">Customer</th>
                                    <th className="saas-table-header" style={{ width: '100px' }}>Mode</th>
                                    <th className="saas-table-header" style={{ width: '120px' }}>To be Paid</th>
                                    <th className="saas-table-header" style={{ width: '120px' }}>Received</th>
                                    <th className="saas-table-header" style={{ width: '120px' }}>Pending</th>
                                    <th className="saas-table-header" style={{ width: '150px' }}>Date & Time</th>
                                    <th className="saas-table-header" style={{ width: '100px' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.length === 0 ? (
                                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#999', fontStyle: 'italic' }}>No records found.</td></tr>
                                ) : (
                                    filteredPayments.map((payment, index) => {
                                        const pendingAmount = payment.amount_to_be_paid - payment.amount_received;
                                        return (
                                            <tr key={payment.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                <td style={{ padding: '0.5rem 1rem', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>{index + 1}</td>
                                                <td style={{ padding: '0.5rem 1rem', fontWeight: '600' }}>{payment.customer_name}</td>
                                                <td style={{ padding: '0.5rem 1rem' }}>
                                                    <span style={{ 
                                                        background: payment.payment_mode === 'cash' ? '#dcfce7' : '#dbeafe',
                                                        color: payment.payment_mode === 'cash' ? '#166534' : '#1e40af',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600'
                                                    }}>
                                                        {payment.payment_mode === 'cash' ? 'Cash' : 'Online'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600' }}>₹{payment.amount_to_be_paid.toFixed(2)}</td>
                                                <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '600', color: '#10b981' }}>₹{payment.amount_received.toFixed(2)}</td>
                                                <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '700', color: pendingAmount > 0 ? 'var(--color-accent-orange)' : '#10b981' }}>
                                                    {pendingAmount > 0 ? `₹${pendingAmount.toFixed(2)}` : '✓ Paid'}
                                                </td>
                                                <td style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>
                                                    {new Date(payment.payment_date).toLocaleString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric', 
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </td>
                                                <td style={{ padding: '0.5rem 1rem' }}>
                                                    {payment.status === 'completed' && (
                                                        <span style={{ color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <CheckCircle size={16} /> Completed
                                                        </span>
                                                    )}
                                                    {payment.status === 'partial' && (
                                                        <span style={{ color: '#f59e0b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Clock size={16} /> Partial
                                                        </span>
                                                    )}
                                                    {payment.status === 'pending' && (
                                                        <span style={{ color: 'var(--color-accent-orange)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <AlertCircle size={16} /> Pending
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Statistics Footer */}
                    <div style={{ 
                        padding: '0.75rem 1.5rem', 
                        background: 'linear-gradient(to right, #f8fafc, #ffffff)', 
                        borderTop: '2px solid var(--color-border)', 
                        display: 'flex', 
                        gap: '2rem', 
                        fontSize: '0.8rem', 
                        flexWrap: 'wrap', 
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={16} style={{ color: 'var(--color-accent-blue)' }} />
                            <span style={{ color: '#64748b' }}>Total Entries:</span>
                            <strong style={{ color: '#1e293b' }}>{filteredPayments.length}</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <DollarSign size={16} style={{ color: '#10b981' }} />
                            <span style={{ color: '#64748b' }}>Total Received:</span>
                            <strong style={{ color: '#10b981' }}>
                                ₹{filteredPayments.reduce((sum, p) => sum + p.amount_received, 0).toFixed(2)}
                            </strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle size={16} style={{ color: 'var(--color-accent-orange)' }} />
                            <span style={{ color: '#64748b' }}>Total Pending:</span>
                            <strong style={{ color: 'var(--color-accent-orange)' }}>
                                ₹{filteredPayments.reduce((sum, p) => sum + (p.amount_to_be_paid - p.amount_received), 0).toFixed(2)}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
