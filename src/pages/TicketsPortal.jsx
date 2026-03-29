import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTicketCategories, addTicket, getTickets } from '../lib/db';
import { Plus, Clock, CheckCircle2, XCircle, CheckSquare2, Ticket } from 'lucide-react';

const statusStyles = {
    pending: { bg: '#fff3cd', color: '#856404', label: 'Pending Review' },
    approved: { bg: '#d1e7dd', color: '#0a3622', label: 'Approved' },
    rejected: { bg: '#f8d7da', color: '#842029', label: 'Rejected' },
};

export default function TicketsPortal() {
    const { currentUser, userData, isAdmin } = useAuth();
    const [categories, setCategories] = useState([]);
    const [myTickets, setMyTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Modal state
    const [selectedCat, setSelectedCat] = useState(null);
    const [formData, setFormData] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const roles = userData?.roles || [];
    const hasAccess = isAdmin || roles.includes('tickets');

    useEffect(() => {
        if (hasAccess) loadData();
    }, [hasAccess]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [cats, allTickets] = await Promise.all([
                getTicketCategories(),
                getTickets()
            ]);
            setCategories(cats);
            // Employees only see their own tickets; admins see all
            const mine = isAdmin ? allTickets : allTickets.filter(t => t.submittedBy === currentUser?.uid);
            mine.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setMyTickets(mine);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = () => {
        setSelectedCat(null);
        setFormData({});
        setShowModal(true);
    };

    const handleCategorySelect = (cat) => {
        setSelectedCat(cat);
        const initial = {};
        (cat.fields || []).forEach(f => { initial[f.id] = ''; });
        setFormData(initial);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCat) return;
        setSubmitting(true);
        try {
            await addTicket({
                categoryId: selectedCat.id,
                categoryName: selectedCat.name,
                formData,
                submittedBy: currentUser.uid,
                submittedByName: userData?.displayName || currentUser.displayName || 'Employee',
                status: 'pending',
                reconciled: false,
            });
            setShowModal(false);
            await loadData();
        } catch (err) {
            alert('Failed to submit ticket: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!currentUser) return (
        <div className="container" style={{ padding: 'var(--spacing-xl) 0', textAlign: 'center' }}>
            <p>Please log in to access the tickets portal.</p>
        </div>
    );

    if (!hasAccess) return (
        <div className="container" style={{ padding: 'var(--spacing-xl) 0', textAlign: 'center' }}>
            <h2 style={{ color: 'red' }}>Access Denied</h2>
            <p>You do not have employee access. Contact an Administrator.</p>
        </div>
    );

    if (loading) return <div className="container" style={{ padding: 'var(--spacing-xl) 0' }}><p>Loading...</p></div>;

    return (
        <div className="container" style={{ padding: 'var(--spacing-xl) 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
                <div>
                    <h2 style={{ color: 'var(--color-accent-blue)', margin: 0 }}>My Tickets</h2>
                    <p style={{ margin: '0.25rem 0 0', color: 'gray', fontSize: '0.9rem' }}>
                        {isAdmin ? 'Viewing all submitted tickets.' : 'Raise and track your internal support tickets here.'}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openModal} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Plus size={18} /> Raise New Ticket
                </button>
            </div>

            {/* Ticket list */}
            {myTickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'gray' }}>
                    <Ticket size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                    <p>No tickets yet. Click "Raise New Ticket" to submit your first one.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {myTickets.map(t => {
                        const s = statusStyles[t.status] || statusStyles.pending;
                        return (
                            <div key={t.id} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                                <div style={{ padding: '0.875rem 1rem', background: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <strong style={{ fontSize: '1rem' }}>{t.categoryName}</strong>
                                        <div style={{ fontSize: '0.8rem', color: 'gray', marginTop: '0.15rem' }}>
                                            {new Date(t.createdAt).toLocaleString()}
                                            {isAdmin && <strong> · {t.submittedByName}</strong>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {t.reconciled && (
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#0a3622', background: '#c3e6cb', padding: '2px 8px', borderRadius: '10px' }}>
                                                ✓ Reconciled
                                            </span>
                                        )}
                                        <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            {s.label}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ padding: '0.75rem 1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                                    {Object.entries(t.formData || {}).map(([key, val]) => (
                                        <div key={key} style={{ background: '#f8f9fa', borderRadius: '4px', padding: '0.4rem 0.75rem' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'gray', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</div>
                                            <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{val || '—'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Overlay */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--color-accent-blue)' }}>Raise a New Ticket</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'gray' }}>×</button>
                        </div>

                        {/* Step 1: Select Category */}
                        {!selectedCat ? (
                            <div>
                                <p style={{ marginBottom: '1rem', color: 'gray' }}>Select the category that best describes your issue:</p>
                                {categories.length === 0 ? (
                                    <p style={{ color: 'orange' }}>No ticket categories have been configured yet. Ask an Admin to set them up first.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => handleCategorySelect(cat)}
                                                className="btn btn-outline"
                                                style={{ textAlign: 'left', padding: '0.875rem 1rem', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
                                            >
                                                <span><strong>{cat.name}</strong><span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: 'gray' }}>{cat.fields?.length || 0} fields</span></span>
                                                <span style={{ color: 'gray' }}>→</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Step 2: Fill form */
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#e9f0fb', borderRadius: '6px', marginBottom: '0.5rem' }}>
                                    <button type="button" onClick={() => setSelectedCat(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 'bold', padding: 0 }}>← Back</button>
                                    <strong>{selectedCat.name}</strong>
                                </div>

                                {(selectedCat.fields || []).length === 0 && (
                                    <p style={{ color: 'orange', fontStyle: 'italic' }}>This category has no custom fields. You can still submit a blank ticket.</p>
                                )}

                                {(selectedCat.fields || []).map(field => (
                                    <div key={field.id}>
                                        <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                            {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
                                        </label>
                                        {field.type === 'textarea' ? (
                                            <textarea className="input-field" required={field.required} value={formData[field.id] || ''} onChange={e => setFormData({ ...formData, [field.id]: e.target.value })} rows={3} />
                                        ) : (
                                            <input type={field.type} className="input-field" required={field.required} value={formData[field.id] || ''} onChange={e => setFormData({ ...formData, [field.id]: e.target.value })} step={field.type === 'number' ? 'any' : undefined} />
                                        )}
                                    </div>
                                ))}

                                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: '0.5rem', padding: '0.75rem' }}>
                                    {submitting ? 'Submitting...' : 'Submit Ticket'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
