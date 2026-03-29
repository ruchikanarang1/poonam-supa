import React, { useState, useEffect } from 'react';
import { getTickets, updateTicketStatus } from '../../lib/db';
import { CheckCircle2, XCircle, Clock, CheckSquare, Square } from 'lucide-react';

const statusColors = {
    pending: { bg: '#fff3cd', text: '#856404', icon: <Clock size={14} /> },
    approved: { bg: '#d1e7dd', text: '#0a3622', icon: <CheckCircle2 size={14} /> },
    rejected: { bg: '#f8d7da', text: '#842029', icon: <XCircle size={14} /> },
};

export default function TicketReviews() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');

    useEffect(() => { loadTickets(); }, []);

    const loadTickets = async () => {
        setLoading(true);
        try {
            const data = await getTickets();
            // Sort newest first
            data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setTickets(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await updateTicketStatus(id, { status: 'approved', reviewedAt: new Date().toISOString() });
            setTickets(tickets.map(t => t.id === id ? { ...t, status: 'approved' } : t));
        } catch (err) { alert('Failed to update'); }
    };

    const handleReject = async (id) => {
        try {
            await updateTicketStatus(id, { status: 'rejected', reviewedAt: new Date().toISOString() });
            setTickets(tickets.map(t => t.id === id ? { ...t, status: 'rejected' } : t));
        } catch (err) { alert('Failed to update'); }
    };

    const handleReconcile = async (id, current) => {
        try {
            await updateTicketStatus(id, { reconciled: !current });
            setTickets(tickets.map(t => t.id === id ? { ...t, reconciled: !current } : t));
        } catch (err) { alert('Failed to update'); }
    };

    const filtered = tickets.filter(t => {
        if (filter === 'all') return true;
        if (filter === 'reconciled') return t.reconciled === true;
        return t.status === filter;
    });

    if (loading) return <p>Loading tickets...</p>;

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                <h3 style={{ color: 'var(--color-accent-blue)', margin: 0 }}>Ticket Reviews</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['pending', 'approved', 'rejected', 'all', 'reconciled'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'}`}
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', textTransform: 'capitalize' }}
                        >
                            {f}
                            {f === 'pending' && <span style={{ marginLeft: '0.4rem', background: '#ff4444', color: 'white', borderRadius: '10px', padding: '1px 5px', fontSize: '0.7rem' }}>{tickets.filter(t => t.status === 'pending').length}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 && <p style={{ color: 'gray', fontStyle: 'italic' }}>No {filter} tickets found.</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filtered.map(ticket => {
                    const s = statusColors[ticket.status] || statusColors.pending;
                    const formEntries = Object.entries(ticket.formData || {});

                    return (
                        <div key={ticket.id} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                            {/* Ticket header */}
                            <div style={{ padding: '0.875rem 1rem', background: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <span style={{ background: s.bg, color: s.text, padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            {s.icon} {ticket.status?.toUpperCase()}
                                        </span>
                                        <strong style={{ fontSize: '1rem' }}>{ticket.categoryName}</strong>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'gray' }}>
                                        Submitted by <strong>{ticket.submittedByName}</strong> · {new Date(ticket.createdAt).toLocaleString()}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                    {ticket.status === 'pending' && (
                                        <>
                                            <button className="btn btn-primary" onClick={() => handleApprove(ticket.id)} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: '#198754', border: 'none', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                                <CheckCircle2 size={14} /> Approve
                                            </button>
                                            <button className="btn btn-outline" onClick={() => handleReject(ticket.id)} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', color: '#dc3545', borderColor: '#dc3545', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                                <XCircle size={14} /> Reject
                                            </button>
                                        </>
                                    )}
                                    {ticket.status === 'approved' && (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', color: ticket.reconciled ? '#0a3622' : 'gray' }}>
                                            {ticket.reconciled
                                                ? <CheckSquare size={20} color="#198754" />
                                                : <Square size={20} />}
                                            <input type="checkbox" hidden checked={!!ticket.reconciled} onChange={() => handleReconcile(ticket.id, ticket.reconciled)} />
                                            Reconciled
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Field values */}
                            <div style={{ padding: '0.75rem 1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                                {formEntries.map(([key, val]) => (
                                    <div key={key} style={{ background: '#f8f9fa', borderRadius: '4px', padding: '0.5rem 0.75rem' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'gray', textTransform: 'capitalize', marginBottom: '0.15rem' }}>{key.replace(/_/g, ' ')}</div>
                                        <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{val || '—'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
