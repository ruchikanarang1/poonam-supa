import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSuppliers, getPurchaseOrders, addPurchaseOrder } from '../lib/db';
import { Plus, ShoppingCart, Clock, PackageCheck, PackageSearch, Truck, FileText, Send } from 'lucide-react';

const statusConfig = {
    pending: { label: 'Pending', bg: '#fff3cd', color: '#856404', icon: <Clock size={13} /> },
    partial: { label: 'Partially Received', bg: '#cfe2ff', color: '#084298', icon: <PackageSearch size={13} /> },
    received: { label: 'Received ✓', bg: '#d1e7dd', color: '#0a3622', icon: <PackageCheck size={13} /> },
};

export default function PurchaseOrders() {
    const { currentUser, userData, isAdmin } = useAuth();
    const [orders, setOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState('all');

    // Form state
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('kg');
    const [supplierInput, setSupplierInput] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const autocompleteRef = useRef(null);

    const roles = userData?.roles || [];
    const hasAccess = isAdmin || roles.includes('orders');

    useEffect(() => {
        if (hasAccess) loadData();
    }, [hasAccess]);

    useEffect(() => {
        // Close autocomplete on outside click
        const handler = (e) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
                setSuggestions([]);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pos, sups] = await Promise.all([getPurchaseOrders(), getSuppliers()]);
            setOrders(pos);
            setSuppliers(sups);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSupplierInput = (val) => {
        setSupplierInput(val);
        setSelectedSupplierId(null);
        if (!val.trim()) { setSuggestions([]); setSupplierPhone(''); return; }
        const matches = suppliers.filter(s => s.name.toLowerCase().includes(val.toLowerCase()));
        setSuggestions(matches);
    };

    const selectSupplier = (s) => {
        setSupplierInput(s.name);
        setSupplierPhone(s.phone);
        setSelectedSupplierId(s.id);
        setSuggestions([]);
    };

    const buildWhatsAppMessage = (poNumber) => {
        const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        return encodeURIComponent(
            `Dear ${supplierInput},

We hope this message finds you well.

This is a formal Purchase Order from *Poonam Steel*.

*Purchase Order Details:*
━━━━━━━━━━━━━━━━━━━━━
📋 *PO Number:* ${poNumber}
📦 *Product:* ${productName}
📊 *Quantity:* ${quantity} ${unit}
📅 *Date:* ${date}
${notes ? `📝 *Notes:* ${notes}` : ''}
━━━━━━━━━━━━━━━━━━━━━

Kindly confirm the receipt of this order and provide the expected delivery date and LR number upon dispatch.

Thank you for your continued partnership.

*Warm regards,*
*Poonam Steel Team*`
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!supplierPhone.trim()) { alert('Please enter a supplier phone number.'); return; }
        setSubmitting(true);
        try {
            const docRef = await addPurchaseOrder({
                productName,
                quantity: Number(quantity),
                unit,
                supplierName: supplierInput,
                supplierPhone,
                supplierId: selectedSupplierId,
                notes,
                placedBy: currentUser.uid,
                placedByName: userData?.displayName || currentUser.displayName || 'Employee',
            });

            // We need the PO number — read it back from Firestore
            const allPOs = await getPurchaseOrders();
            const newPO = allPOs.find(p => p.id === docRef.id);
            const poNumber = newPO?.poNumber || 'PO-NEW';

            // Open WhatsApp
            // Sanitize phone: strip spaces and add country code if not present
            let phone = supplierPhone.replace(/\D/g, '');
            if (phone.length === 10) phone = '91' + phone;
            const waUrl = `https://wa.me/${phone}?text=${buildWhatsAppMessage(poNumber)}`;
            window.open(waUrl, '_blank');

            // Reset & reload
            setProductName(''); setQuantity(''); setUnit('kg');
            setSupplierInput(''); setSupplierPhone(''); setNotes('');
            setSelectedSupplierId(null);
            setShowModal(false);
            await loadData();
        } catch (err) {
            alert('Failed to place order: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    if (!currentUser) return <div className="container" style={{ padding: 'var(--spacing-xl) 0', textAlign: 'center' }}><p>Please log in.</p></div>;

    if (!hasAccess) return (
        <div className="container" style={{ padding: 'var(--spacing-xl) 0', textAlign: 'center' }}>
            <h2 style={{ color: 'red' }}>Access Denied</h2>
            <p>You do not have permission to access the Purchase Orders portal. Contact an Administrator.</p>
        </div>
    );

    if (loading) return <div className="container" style={{ padding: 'var(--spacing-xl) 0' }}><p>Loading purchase orders...</p></div>;

    return (
        <div className="container" style={{ padding: 'var(--spacing-xl) 0' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xl)' }}>
                <div>
                    <h2 style={{ color: 'var(--color-accent-blue)', margin: 0 }}>Purchase Orders</h2>
                    <p style={{ margin: '0.25rem 0 0', color: 'gray', fontSize: '0.9rem' }}>
                        Place orders to suppliers and track delivery status.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Plus size={18} /> Place New Order
                </button>
            </div>

            {/* Status filter pills */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
                {['all', 'pending', 'partial', 'received'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            padding: '0.3rem 0.9rem', borderRadius: '20px', border: '2px solid',
                            cursor: 'pointer', fontSize: '0.85rem', fontWeight: filter === f ? 'bold' : 'normal',
                            background: filter === f ? 'var(--color-primary)' : 'white',
                            color: filter === f ? 'white' : 'var(--color-text)',
                            borderColor: filter === f ? 'var(--color-primary)' : '#dee2e6',
                            transition: 'all 0.15s'
                        }}
                    >
                        {f === 'all' ? 'All Orders' : statusConfig[f]?.label}
                        <span style={{ marginLeft: '0.4rem', fontWeight: 'bold' }}>
                            ({f === 'all' ? orders.length : orders.filter(o => o.status === f).length})
                        </span>
                    </button>
                ))}
            </div>

            {/* Order list */}
            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'gray' }}>
                    <ShoppingCart size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                    <p>No orders found. Click "Place New Order" to get started.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filtered.map(order => {
                        const s = statusConfig[order.status] || statusConfig.pending;
                        return (
                            <div key={order.id} style={{ border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ padding: '0.875rem 1.25rem', background: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.2rem' }}>
                                            <code style={{ fontSize: '0.8rem', background: '#e9ecef', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{order.poNumber}</code>
                                            <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                {s.icon} {s.label}
                                            </span>
                                        </div>
                                        <strong style={{ fontSize: '1rem' }}>{order.productName}</strong>
                                        <span style={{ color: 'gray', marginLeft: '0.5rem', fontSize: '0.9rem' }}>{order.quantity} {order.unit}</span>
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'gray' }}>
                                        <div style={{ fontWeight: '500', color: 'var(--color-text)' }}>📞 {order.supplierName}</div>
                                        <div>{order.supplierPhone}</div>
                                        <div>{new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
                                    </div>
                                </div>
                                <div style={{ padding: '0.6rem 1.25rem', display: 'flex', gap: '1.5rem', fontSize: '0.82rem', color: 'gray' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Truck size={14} color={order.transportEntryId ? '#198754' : '#adb5bd'} />
                                        Transport: <strong style={{ color: order.transportEntryId ? '#198754' : '#adb5bd' }}>{order.transportEntryId ? 'Linked' : 'Awaiting'}</strong>
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <FileText size={14} color={order.billEntryId ? '#198754' : '#adb5bd'} />
                                        Bill: <strong style={{ color: order.billEntryId ? '#198754' : '#adb5bd' }}>{order.billEntryId ? 'Linked' : 'Awaiting'}</strong>
                                    </span>
                                    {order.placedByName && <span>Placed by: <strong>{order.placedByName}</strong></span>}
                                    {order.notes && <span>📝 {order.notes}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* New Order Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Send size={20} /> Place Purchase Order
                            </h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'gray' }}>×</button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Product */}
                            <div>
                                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Product Name <span style={{ color: 'red' }}>*</span></label>
                                <input className="input-field" placeholder="e.g. TMT Bar 12mm" value={productName} onChange={e => setProductName(e.target.value)} required />
                            </div>

                            {/* Quantity + Unit */}
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Quantity <span style={{ color: 'red' }}>*</span></label>
                                    <input className="input-field" type="number" min="1" placeholder="e.g. 500" value={quantity} onChange={e => setQuantity(e.target.value)} required />
                                </div>
                                <div>
                                    <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Unit</label>
                                    <select className="input-field" value={unit} onChange={e => setUnit(e.target.value)}>
                                        {['kg', 'MT', 'pieces', 'bundles', 'coils', 'sheets', 'meters'].map(u => <option key={u}>{u}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Supplier Autocomplete */}
                            <div ref={autocompleteRef} style={{ position: 'relative' }}>
                                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Supplier Name <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    className="input-field"
                                    placeholder="Start typing supplier name..."
                                    value={supplierInput}
                                    onChange={e => handleSupplierInput(e.target.value)}
                                    required
                                    autoComplete="off"
                                />
                                {suggestions.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #dee2e6', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                                        {suggestions.map(s => (
                                            <div key={s.id} onClick={() => selectSupplier(s)} style={{ padding: '0.65rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f1f3f5', transition: 'background 0.1s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                            >
                                                <div style={{ fontWeight: '600' }}>{s.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'gray' }}>📞 {s.phone}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Phone */}
                            <div>
                                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Supplier Phone <span style={{ color: 'red' }}>*</span></label>
                                <input className="input-field" type="tel" placeholder="e.g. 9876543210" value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)} required />
                            </div>

                            {/* Notes */}
                            <div>
                                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Additional Notes</label>
                                <textarea className="input-field" placeholder="e.g. Required by Wednesday, payment mode: NEFT" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
                            </div>

                            <div style={{ background: '#e9f0fb', borderRadius: '8px', padding: '0.75rem', fontSize: '0.85rem', color: '#084298', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                <span style={{ flexShrink: 0 }}>💬</span>
                                <span>After saving, WhatsApp will open with a professional order message pre-filled. One tap to send!</span>
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: '0.8rem', fontSize: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                                <Send size={18} /> {submitting ? 'Placing Order...' : 'Place Order & Open WhatsApp'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
