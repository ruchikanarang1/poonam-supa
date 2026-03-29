import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getFormConfig, addLogisticsEntry, getPurchaseOrders, linkEntryToPurchaseOrder } from '../lib/db';
import { Truck, FileText, Link2 } from 'lucide-react';

export default function LogisticsPortal({ type, title }) {
    const { currentUser, userData, isAdmin } = useAuth();
    const [fields, setFields] = useState([]);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [linkedPoId, setLinkedPoId] = useState('');
    const [openPOs, setOpenPOs] = useState([]);

    // Permission check
    const roles = userData?.roles || [];
    const hasAccess = isAdmin || roles.includes(type);

    useEffect(() => {
        if (hasAccess) {
            loadForm();
            // Load pending/partial POs to allow linking
            getPurchaseOrders().then(pos => setOpenPOs(pos.filter(p => p.status !== 'received')));
        }
    }, [type, hasAccess]);

    const loadForm = async () => {
        setLoading(true);
        try {
            const config = await getFormConfig(type);
            setFields(config);
            // Initialize empty form state
            const initial = {};
            config.forEach(f => initial[f.id] = '');
            setFormData(initial);
        } catch (err) {
            console.error('Failed to load form', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Trim inputs and convert numbers where appropriate
            const cleanedData = {};
            fields.forEach(f => {
                let val = formData[f.id];
                if (typeof val === 'string') val = val.trim();
                if (f.type === 'number' && val !== '') val = Number(val);
                cleanedData[f.id] = val;
            });

            // Auto capture user info
            cleanedData.submittedBy = currentUser.uid;
            cleanedData.submittedByName = userData.displayName || currentUser.displayName || 'Employee';

            // Ensure extremely strict LR matching logic (convert to string & lowercase)
            if (cleanedData.lr_number) {
                cleanedData.lr_number = String(cleanedData.lr_number).trim().toLowerCase();
            }

            await addLogisticsEntry(type, cleanedData).then(async (docRef) => {
                // If a PO was linked, update its status
                if (linkedPoId && docRef?.id) {
                    await linkEntryToPurchaseOrder(linkedPoId, type, docRef.id);
                }
            });

            alert(`${title} Entry Saved Successfully!${linkedPoId ? ' Purchase Order status updated.' : ''}`);

            // Reset
            const initial = {};
            fields.forEach(f => initial[f.id] = '');
            setFormData(initial);
            setLinkedPoId('');

        } catch (err) {
            console.error(err);
            alert("Error saving record: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!currentUser) return <div className="container" style={{ padding: 'var(--spacing-xl) 0', textAlign: 'center' }}><p>Please log in.</p></div>;

    if (!hasAccess) {
        return (
            <div className="container" style={{ padding: 'var(--spacing-xl) 0', textAlign: 'center' }}>
                <h2 style={{ color: 'red' }}>Access Denied</h2>
                <p>You do not have the required permission to access the {title} portal. Contact an Administrator to request access.</p>
            </div>
        );
    }

    if (loading) return <div className="container" style={{ padding: 'var(--spacing-xl) 0' }}><p>Loading secure entry portal...</p></div>;

    if (fields.length === 0) {
        return (
            <div className="container" style={{ padding: 'var(--spacing-xl) 0', textAlign: 'center' }}>
                <h2>Portal Not Configured</h2>
                <p>The Administrator has not yet configured the fields for the {title} portal.</p>
            </div>
        );
    }

    const Icon = type === 'transport' ? Truck : FileText;

    return (
        <div className="container" style={{ padding: 'var(--spacing-xl) 0', maxWidth: '800px' }}>
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: 'var(--spacing-lg)', borderBottom: '2px solid var(--color-border)', paddingBottom: '1rem' }}>
                    <div style={{ background: 'var(--color-primary)', padding: '0.75rem', borderRadius: '50%', color: 'white' }}>
                        <Icon size={28} />
                    </div>
                    <div>
                        <h2 style={{ color: 'var(--color-accent-blue)', margin: 0 }}>{title} Portal</h2>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'gray' }}>Fill out the verified logistics details</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {fields.map(field => (
                        <div key={field.id} className="input-group">
                            <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
                                {field.id.includes('lr_number') && <span style={{ color: 'gray', fontWeight: 'normal', fontStyle: 'italic', marginLeft: '0.5rem' }}>(Used for system matching)</span>}
                            </label>

                            {field.type === 'textarea' ? (
                                <textarea
                                    className="input-field"
                                    required={field.required}
                                    value={formData[field.id]}
                                    onChange={e => setFormData({ ...formData, [field.id]: e.target.value })}
                                    rows="3"
                                />
                            ) : (
                                <input
                                    type={field.type}
                                    className="input-field"
                                    required={field.required}
                                    value={formData[field.id]}
                                    onChange={e => setFormData({ ...formData, [field.id]: e.target.value })}
                                    step={field.type === 'number' ? 'any' : undefined}
                                />
                            )}
                        </div>
                    ))}

                    {/* Optional PO Linker */}
                    {openPOs.length > 0 && (
                        <div className="input-group">
                            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Link2 size={16} color="var(--color-accent-blue)" />
                                Link to a Purchase Order <span style={{ color: 'gray', fontWeight: 'normal', fontSize: '0.8rem' }}>(optional — marks PO as partially/fully received)</span>
                            </label>
                            <select className="input-field" value={linkedPoId} onChange={e => setLinkedPoId(e.target.value)}>
                                <option value="">— Not linked to any PO —</option>
                                {openPOs.map(po => (
                                    <option key={po.id} value={po.id}>
                                        {po.poNumber} · {po.productName} · {po.supplierName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting}
                        style={{ padding: '0.75rem', fontSize: '1.1rem', marginTop: 'var(--spacing-md)' }}
                    >
                        {submitting ? 'Authenticating & Saving...' : `Submit ${title} Record`}
                    </button>
                </form>
            </div>
        </div>
    );
}
