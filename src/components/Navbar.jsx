import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { ShoppingCart, LogOut, Menu, X, User, Plus, LayoutDashboard, Package } from 'lucide-react';
import AuthModal from './AuthModal';

export default function Navbar({ toggleSidebar }) {
    const { 
        currentUser, userData, isAdmin, companies, 
        currentCompanyId, switchCompany, logout 
    } = useAuth();
    const { cartCount } = useCart();
    const location = useLocation();
    
    const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
    
    const currentComp = companies.find(c => c.id === currentCompanyId);

    return (
        <nav style={{ background: 'var(--color-primary)', boxShadow: 'var(--shadow-sm)', padding: 'var(--spacing-md) 0', position: 'sticky', top: 0, zIndex: 1001 }}>
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>

                {/* Left Side: Toggle + Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button 
                        onClick={toggleSidebar} 
                        className="btn btn-outline show-on-mobile" 
                        style={{ padding: '0.5rem', border: 'none' }}
                    >
                        <Menu size={24} />
                    </button>

                    <Link to="/" style={{ fontWeight: '800', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <div style={{ width: '20px', height: '20px', backgroundColor: 'var(--color-accent-orange)', borderRadius: '4px', flexShrink: 0 }}></div>
                        <span style={{ fontSize: window.innerWidth <= 768 ? '1rem' : '1.25rem', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                            {currentComp?.name || "POONAM STEEL"}
                        </span>
                    </Link>
                </div>

                {/* Center: Navigation Buttons (Catalogue / Dashboard) */}
                <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '4px', borderRadius: '8px', 
                    order: window.innerWidth <= 768 ? 3 : 0, width: window.innerWidth <= 768 ? '100%' : 'auto', justifyContent: 'center' }}>
                    <Link 
                        to="/catalogue" 
                        style={{ 
                            padding: '0.5rem 1rem', 
                            borderRadius: '6px', 
                            fontSize: '0.85rem', 
                            fontWeight: '600', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.4rem',
                            color: location.pathname === '/catalogue' || location.pathname === '/' ? 'white' : '#475569',
                            background: location.pathname === '/catalogue' || location.pathname === '/' ? 'var(--color-accent-blue)' : 'transparent',
                            transition: 'all 0.2s',
                            flex: 1, justifyContent: 'center'
                        }}
                    >
                        <Package size={16} /> Catalogue
                    </Link>
                    {isAdmin && (
                        <Link 
                            to="/admin" 
                            style={{ 
                                padding: '0.5rem 1rem', 
                                borderRadius: '6px', 
                                fontSize: '0.85rem', 
                                fontWeight: '600', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.4rem',
                                color: location.pathname === '/admin' ? 'white' : '#475569',
                                background: location.pathname === '/admin' ? 'var(--color-accent-blue)' : 'transparent',
                                transition: 'all 0.2s',
                                flex: 1, justifyContent: 'center'
                            }}
                        >
                            <LayoutDashboard size={16} /> Dashboard
                        </Link>
                    )}
                </div>

                {/* Right Side: Navigation Links & Auth */}
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    {companies.length > 0 && (
                        <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <select 
                                value={currentCompanyId || ''} 
                                onChange={(e) => switchCompany(e.target.value)}
                                style={{ 
                                    padding: '0.25rem 0.5rem', 
                                    borderRadius: '0.5rem', 
                                    border: '1px solid #cbd5e1', 
                                    fontSize: '0.75rem', 
                                    background: '#f8fafc',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    color: '#475569',
                                    maxWidth: '100px'
                                }}
                            >
                                <option value="" disabled>Switch</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <Link to="/setup-company" title="Add Company" style={{ color: 'var(--color-accent-orange)', display: 'flex' }}>
                                <Plus size={18} />
                            </Link>
                        </div>
                    )}

                    <Link to="/cart" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', position: 'relative', padding: '0.25rem' }}>
                        <ShoppingCart size={22} />
                        {cartCount > 0 && (
                            <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--color-accent-orange)', color: 'white', borderRadius: '50%', padding: '2px 5px', fontSize: '0.65rem', fontWeight: 'bold' }}>
                                {cartCount}
                            </span>
                        )}
                    </Link>

                    {/* Auth Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        {currentUser ? (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--color-text-light)', fontWeight: '600' }}>
                                    <User size={18} /> <span className="hide-on-mobile">{currentUser.displayName?.split(' ')[0]}</span>
                                </div>
                                <button onClick={logout} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} title="Log Out">
                                    <LogOut size={16} />
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setIsAuthModalOpen(true)} className="btn btn-primary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}>
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
            />
        </nav>
    );
}
