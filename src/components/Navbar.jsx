import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { ShoppingCart, User, LogOut, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
    const { currentUser, isAdmin, loginWithGoogle, logout } = useAuth();
    const { cartCount } = useCart();

    return (
        <nav style={{ background: 'var(--color-primary)', boxShadow: 'var(--shadow-sm)', padding: 'var(--spacing-md) 0' }}>
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                {/* Logo */}
                <Link to="/" style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '24px', height: '24px', backgroundColor: 'var(--color-accent-orange)', borderRadius: '4px' }}></div>
                    POONAM STEEL
                </Link>

                {/* Navigation Links */}
                <div style={{ display: 'flex', gap: 'var(--spacing-lg)', alignItems: 'center' }}>
                    <Link to="/" style={{ fontWeight: '500' }}>Home</Link>
                    <Link to="/catalogue" style={{ fontWeight: '500' }}>Catalogue</Link>

                    <Link to="/cart" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', position: 'relative' }}>
                        <ShoppingCart size={20} />
                        {cartCount > 0 && (
                            <span style={{ position: 'absolute', top: '-8px', right: '-12px', background: 'var(--color-accent-orange)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                {cartCount}
                            </span>
                        )}
                    </Link>

                    {/* Auth Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginLeft: 'var(--spacing-lg)' }}>
                        {currentUser ? (
                            <>
                                {isAdmin && (
                                    <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-accent-blue)' }}>
                                        <LayoutDashboard size={18} /> Admin
                                    </Link>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
                                    <User size={18} /> {currentUser.displayName?.split(' ')[0]}
                                </div>
                                <button onClick={logout} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                                    <LogOut size={16} />
                                </button>
                            </>
                        ) : (
                            <button onClick={loginWithGoogle} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                                Login
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </nav>
    );
}
