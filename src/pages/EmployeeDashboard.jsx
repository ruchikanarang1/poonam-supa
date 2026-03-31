import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Truck, FileText, TicketCheck, ShoppingBag, ChevronRight } from 'lucide-react';
import OrgUpdates from '../components/OrgUpdates';

const ACTION_CARDS = [
    {
        id: 'transport',
        icon: <Truck size={36} />,
        label: 'Transport Entry',
        description: 'Log incoming goods with LR number and transport details',
        to: '/transport',
        color: '#f59e0b',
        roleRequired: 'transport',
    },
    {
        id: 'bills',
        icon: <FileText size={36} />,
        label: 'Bill Entry',
        description: 'Record a supplier bill when it arrives',
        to: '/bills',
        color: '#0ea5e9',
        roleRequired: 'bills',
    },
    {
        id: 'tickets',
        icon: <TicketCheck size={36} />,
        label: 'Raise a Ticket',
        description: 'Report an issue or request to the Admin',
        to: '/tickets',
        color: '#6f42c1',
        roleRequired: 'tickets',
    },
    {
        id: 'orders',
        icon: <ShoppingBag size={36} />,
        label: 'Place an Order',
        description: 'Send a purchase order to a supplier via WhatsApp',
        to: '/purchase-orders?action=new',
        color: '#e11d48',
        roleRequired: 'orders',
    },
];

export default function EmployeeDashboard() {
    const { currentUser, userData, isAdmin } = useAuth();
    const roles = userData?.roles || [];
    const displayName = userData?.displayName || currentUser?.displayName?.split(' ')[0] || 'there';

    const visibleCards = ACTION_CARDS.filter(card => {
        if (card.roleRequired === null) return true;
        return isAdmin || roles.includes(card.roleRequired);
    });

    return (
        <div className="container" style={{ padding: 'var(--spacing-lg) 0' }}>
            {/* Greeting */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--color-accent-blue)' }}>
                    👋 Hello, {displayName}!
                </h2>
                <p style={{ margin: '0.4rem 0 0', color: 'gray', fontSize: '1rem' }}>
                    What would you like to do today?
                </p>
            </div>

            {/* Top Grid - Incoming Goods + 2 Placeholders */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                {/* Incoming Goods Card */}
                <div style={{
                    background: 'white', border: '1px solid var(--color-border)', borderRadius: '14px',
                    padding: '1.5rem', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '1rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-accent-blue)' }}>
                        <div style={{ background: '#e8f0fe', padding: '0.6rem', borderRadius: '10px' }}><Truck size={24} /></div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>Incoming Goods</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <Link to="/transport" style={{ 
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.75rem 1rem', background: '#f8f9fa', borderRadius: '8px', 
                            fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-text-main)', 
                            border: '1px solid transparent', transition: 'all 0.2s'
                        }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-orange)'; e.currentTarget.style.color = 'var(--color-accent-orange)'; }} 
                           onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-main)'; }}>
                            Transport Entry <ChevronRight size={16} />
                        </Link>
                        <Link to="/bills" style={{ 
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.75rem 1rem', background: '#f8f9fa', borderRadius: '8px', 
                            fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-text-main)', 
                            border: '1px solid transparent', transition: 'all 0.2s'
                        }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-blue)'; e.currentTarget.style.color = 'var(--color-accent-blue)'; }} 
                           onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-main)'; }}>
                            Bill Entry <ChevronRight size={16} />
                        </Link>
                        {isAdmin && (
                            <Link to="/admin?tab=reconciliation" style={{ 
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.75rem 1rem', background: '#f8f9fa', borderRadius: '8px', 
                                fontSize: '0.9rem', fontWeight: '600', color: 'var(--color-text-main)', 
                                border: '1px solid transparent', transition: 'all 0.2s'
                            }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent-blue)'; e.currentTarget.style.color = 'var(--color-accent-blue)'; }} 
                               onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-main)'; }}>
                                Logistics Matcher <ChevronRight size={16} />
                            </Link>
                        )}
                    </div>
                </div>

                {/* Empty Placeholder Card 1 */}
                <div style={{
                    background: 'white', border: '2px dashed var(--color-border)', borderRadius: '14px',
                    padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc'
                }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>-</span>
                </div>

                {/* Empty Placeholder Card 2 */}
                <div style={{
                    background: 'white', border: '2px dashed var(--color-border)', borderRadius: '14px',
                    padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc'
                }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>-</span>
                </div>
            </div>

            {visibleCards.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'gray' }}>
                    <p style={{ fontSize: '1.1rem' }}>You don't have any portal access yet.</p>
                    <p>Contact your Admin to get permissions assigned.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
                    {visibleCards.map(card => (
                        <Link
                            key={card.id}
                            to={card.to}
                            style={{ textDecoration: 'none' }}
                        >
                            <div style={{
                                background: 'white',
                                borderRadius: '14px',
                                border: `2px solid ${card.color}22`,
                                padding: '2rem 1.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: '1rem',
                                cursor: 'pointer',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${card.color}33`; e.currentTarget.style.borderColor = card.color; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = `${card.color}22`; }}
                            >
                                <div style={{ background: `${card.color}18`, padding: '0.9rem', borderRadius: '12px', color: card.color }}>
                                    {card.icon}
                                </div>
                                <div>
                                    <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#212529', marginBottom: '0.3rem' }}>{card.label}</div>
                                    <div style={{ fontSize: '0.87rem', color: 'gray', lineHeight: 1.5 }}>{card.description}</div>
                                </div>
                                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '700', color: card.color, fontSize: '0.85rem' }}>
                                    Open →
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <div style={{ marginTop: 'var(--spacing-lg)', maxWidth: '800px' }}>
                <OrgUpdates readOnly={true} />
            </div>
        </div>
    );
}
