import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTickets, getPurchaseOrders, getOrders } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, PackageSearch, ShoppingCart, TicketCheck, Truck, FileText, Bell, RefreshCw } from 'lucide-react';
import OrgUpdates from '../OrgUpdates';

// ── a simple org-updates/notes state persisted to localStorage ──


function StatCard({ icon, title, count, color, to, description }) {
    return (
        <Link to={to} style={{ textDecoration: 'none' }}>
            <div style={{
                background: 'white', borderRadius: '12px', border: `2px solid ${count > 0 ? color : '#e8eaed'}`,
                padding: '1.25rem', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: count > 0 ? `0 2px 12px ${color}33` : 'none'
            }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${color}44`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = count > 0 ? `0 2px 12px ${color}33` : 'none'; }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ background: `${color}18`, padding: '0.6rem', borderRadius: '8px' }}>
                        {React.cloneElement(icon, { size: 22, color })}
                    </div>
                    <span style={{
                        fontSize: '2rem', fontWeight: '800', color: count > 0 ? color : '#adb5bd', lineHeight: 1
                    }}>{count}</span>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#212529' }}>{title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'gray', marginTop: '0.15rem' }}>{description}</div>
                </div>
                {count > 0 && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', fontWeight: '600', color, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        View all →
                    </div>
                )}
            </div>
        </Link>
    );
}

export default function AdminHome() {
    const { currentCompanyId } = useAuth();
    const [stats, setStats] = useState({ pendingTickets: 0, pendingOrders: 0, partialOrders: 0, pendingCustomerOrders: 0 });
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => { 
        if (currentCompanyId) load(); 
    }, [currentCompanyId]);

    const load = async () => {
        setLoading(true);
        try {
            const [tickets, pos, customerOrders] = await Promise.all([
                getTickets(currentCompanyId), 
                getPurchaseOrders(currentCompanyId), 
                getOrders(currentCompanyId)
            ]);
            setStats({
                pendingTickets: tickets.filter(t => t.status === 'pending').length,
                pendingOrders: pos.filter(p => p.status === 'pending').length,
                partialOrders: pos.filter(p => p.status === 'partial').length,
                pendingCustomerOrders: customerOrders.filter(o => o.status === 'pending').length,
            });
            setLastUpdated(new Date());
        } catch (err) { 
            console.error(err); 
            alert(`Error loading dashboard: ${err.message}. Please check your connection and try again.`);
        }
        finally { setLoading(false); }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                <div>
                    <h2 style={{ margin: 0, color: 'var(--color-accent-blue)', fontSize: '1.5rem' }}>Admin Overview</h2>
                    <p style={{ margin: '0.25rem 0 0', color: 'gray', fontSize: '0.9rem' }}>All pending actions at a glance.</p>
                </div>
                <button onClick={load} title="Refresh" style={{ background: 'none', border: '1px solid #dee2e6', borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.85rem', color: 'gray' }}>
                    <RefreshCw size={15} /> Refresh
                    {lastUpdated && <span style={{ fontSize: '0.75rem', color: '#adb5bd' }}>· {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
                </button>
            </div>

            {loading ? <p>Loading dashboard…</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <StatCard
                        icon={<TicketCheck />} title="Pending Tickets" count={stats.pendingTickets} color="#6f42c1"
                        to="/admin?tab=ticket_reviews" description="Tickets awaiting your review"
                    />
                    <StatCard
                        icon={<Clock />} title="Pending Purchase Orders" count={stats.pendingOrders} color="#f59e0b"
                        to="/purchase-orders" description="Orders placed, waiting for transport"
                    />
                    <StatCard
                        icon={<PackageSearch />} title="Partially Received" count={stats.partialOrders} color="#0ea5e9"
                        to="/purchase-orders" description="Transport or bill still missing"
                    />
                    <StatCard
                        icon={<ShoppingCart />} title="Customer Orders" count={stats.pendingCustomerOrders} color="#e11d48"
                        to="/admin?tab=orders" description="Catalogue orders awaiting action"
                    />

                    <OrgUpdates />
                </div>
            )}

            {/* Quick Links */}
            <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', color: '#adb5bd', marginBottom: '0.75rem' }}>Quick Access</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {[
                        { label: '🧑‍🤝‍🧑 Team & Roles', to: '/admin?tab=team' },
                        { label: '⚙️ Dynamic Forms', to: '/admin?tab=forms' },
                        { label: '🔀 Logistics Matcher', to: '/admin?tab=reconciliation' },
                        { label: '🏷️ Ticket Categories', to: '/admin?tab=ticket_builder' },
                        { label: '🏢 Supplier Database', to: '/admin?tab=suppliers' },
                    ].map(q => (
                        <Link key={q.to} to={q.to} style={{ padding: '0.4rem 0.9rem', borderRadius: '20px', border: '1px solid #dee2e6', background: 'white', textDecoration: 'none', color: 'var(--color-text)', fontSize: '0.85rem', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f1f3f5'}
                            onMouseLeave={e => e.currentTarget.style.background = 'white'}
                        >{q.label}</Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
