import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, BarChart3, Truck, Package, ClipboardList, ShieldCheck, ArrowRight, Zap } from 'lucide-react';

const features = [
    { icon: Package,       title: 'Product Catalogue',    desc: 'Manage your full steel product inventory with pricing and images.' },
    { icon: Truck,         title: 'Logistics Portal',     desc: 'Track transport entries and bill records in real time.' },
    { icon: ClipboardList, title: 'Purchase Orders',      desc: 'End-to-end PO lifecycle from creation to goods receipt.' },
    { icon: BarChart3,     title: 'Analytics & Archive',  desc: 'Quarterly reports, exports to Excel and Google Sheets.' },
    { icon: ShieldCheck,   title: 'Role-Based Access',    desc: 'Superadmin controls who can see what across the org.' },
    { icon: Zap,           title: 'Goods Check-In',       desc: 'Log inbound shipments and reconcile against purchase orders.' },
];

const stats = [
    { value: '15+', label: 'ERP Modules' },
    { value: '∞',   label: 'Entries Supported' },
    { value: '100%', label: 'Cloud Powered' },
];

export default function LandingPage() {
    const { loginWithGoogle } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState('');

    const handleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await loginWithGoogle();
        } catch (err) {
            setError(err.message || 'Sign-in failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#040d1a', color: 'white', fontFamily: "'Inter', sans-serif" }}>

            {/* ── Nav ── */}
            <nav style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
                position: 'sticky', top: 0, zIndex: 100,
                background: 'rgba(4,13,26,0.85)', backdropFilter: 'blur(12px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6A00' }} />
                    <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.04em', color: 'white' }}>
                        POONAM STEEL
                    </span>
                    <span style={{
                        marginLeft: '0.4rem', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em',
                        background: 'rgba(255,106,0,0.15)', color: '#FF6A00',
                        border: '1px solid rgba(255,106,0,0.3)', borderRadius: '4px', padding: '2px 6px'
                    }}>ERP</span>
                </div>
                <button
                    onClick={handleLogin}
                    disabled={loading}
                    style={{
                        background: 'white', color: '#040d1a', border: 'none',
                        borderRadius: '8px', padding: '0.5rem 1.25rem',
                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s'
                    }}
                >
                    {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                    Sign In
                </button>
            </nav>

            {/* ── Hero ── */}
            <section style={{ padding: '6rem 2rem 4rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                {/* Glow blobs */}
                <div style={{
                    position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)',
                    width: '600px', height: '400px',
                    background: 'radial-gradient(ellipse, rgba(255,106,0,0.12) 0%, transparent 70%)',
                    pointerEvents: 'none'
                }} />
                <div style={{
                    position: 'absolute', top: '10%', left: '10%',
                    width: '300px', height: '300px',
                    background: 'radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)',
                    pointerEvents: 'none'
                }} />

                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'rgba(255,106,0,0.1)', border: '1px solid rgba(255,106,0,0.25)',
                    borderRadius: '999px', padding: '0.35rem 1rem', marginBottom: '2rem',
                    fontSize: '0.78rem', fontWeight: 600, color: '#FF6A00'
                }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6A00', animation: 'pulse 2s infinite' }} />
                    Internal Operations Platform
                </div>

                <h1 style={{
                    fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', fontWeight: 900, lineHeight: 1.1,
                    marginBottom: '1.5rem', maxWidth: '800px', margin: '0 auto 1.5rem'
                }}>
                    Steel Operations,{' '}
                    <span style={{ background: 'linear-gradient(135deg,#FF6A00,#ee0979)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Streamlined
                    </span>
                </h1>

                <p style={{
                    fontSize: '1.1rem', color: 'rgba(255,255,255,0.55)', maxWidth: '520px',
                    margin: '0 auto 2.5rem', lineHeight: 1.7
                }}>
                    One platform for logistics, inventory, purchase orders, ticketing, and team management — built for Poonam Steel's day-to-day operations.
                </p>

                {error && (
                    <div style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        color: '#fca5a5', borderRadius: '8px', padding: '0.75rem 1.25rem',
                        fontSize: '0.85rem', marginBottom: '1.5rem', display: 'inline-block'
                    }}>
                        {error}
                    </div>
                )}

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    style={{
                        background: 'linear-gradient(135deg, #FF6A00, #ee0979)',
                        color: 'white', border: 'none', borderRadius: '12px',
                        padding: '1rem 2.5rem', fontWeight: 800, fontSize: '1rem',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                        boxShadow: '0 0 40px rgba(255,106,0,0.3)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        opacity: loading ? 0.7 : 1
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    {loading
                        ? <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</>
                        : <><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="" /> Continue with Google <ArrowRight size={18} /></>
                    }
                </button>

                <p style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
                    Access is invite-only. Contact your administrator if you need access.
                </p>
            </section>

            {/* ── Stats ── */}
            <section style={{ padding: '2rem 2rem 4rem', display: 'flex', justifyContent: 'center', gap: '4rem', flexWrap: 'wrap' }}>
                {stats.map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, background: 'linear-gradient(135deg,#FF6A00,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {s.value}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem', fontWeight: 600 }}>
                            {s.label}
                        </div>
                    </div>
                ))}
            </section>

            {/* ── Feature grid ── */}
            <section style={{ padding: '2rem 2rem 6rem', maxWidth: '1100px', margin: '0 auto' }}>
                <h2 style={{ textAlign: 'center', fontSize: '1.6rem', fontWeight: 800, marginBottom: '3rem', color: 'rgba(255,255,255,0.85)' }}>
                    Everything your team needs
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                    {features.map(f => {
                        const Icon = f.icon;
                        return (
                            <div key={f.title} style={{
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '16px', padding: '1.75rem',
                                transition: 'border-color 0.2s, background 0.2s',
                                cursor: 'default'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,106,0,0.35)'; e.currentTarget.style.background = 'rgba(255,106,0,0.05)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                            >
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '10px',
                                    background: 'rgba(255,106,0,0.12)', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', marginBottom: '1rem', color: '#FF6A00'
                                }}>
                                    <Icon size={20} />
                                </div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem', color: 'white' }}>{f.title}</h3>
                                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── Footer ── */}
            <footer style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                padding: '1.5rem 2rem', textAlign: 'center',
                fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)'
            }}>
                © {new Date().getFullYear()} Poonam Stainless Steel — Internal ERP System. All rights reserved.
            </footer>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
            `}</style>
        </div>
    );
}
