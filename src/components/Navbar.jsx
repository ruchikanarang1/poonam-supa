import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { ShoppingCart, LogOut, Menu, X, User } from 'lucide-react';

export default function Navbar({ toggleSidebar }) {
    const { currentUser, userData, isAdmin, loginWithGoogle, logout } = useAuth();
    const { cartCount } = useCart();
    const roles = userData?.roles || [];

    return (
        <nav style={{ background: 'var(--color-primary)', boxShadow: 'var(--shadow-sm)', padding: 'var(--spacing-md) 0', position: 'sticky', top: 0, zIndex: 1001 }}>
            <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                {/* Left Side: Toggle + Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button 
                        onClick={toggleSidebar} 
                        className="btn btn-outline show-on-mobile" 
                        style={{ padding: '0.5rem', border: 'none' }}
                    >
                        <Menu size={24} />
                    </button>

                    <Link to="/" style={{ fontWeight: '800', color: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <div style={{ width: '20px', height: '20px', backgroundColor: 'var(--color-accent-orange)', borderRadius: '4px', flexShrink: 0 }}></div>
                        <span style={{ fontSize: window.innerWidth <= 768 ? '0.85rem' : '1.25rem', whiteSpace: 'nowrap' }}>POONAM STAINLESS STEEL</span>
                    </Link>
                </div>

                {/* Right Side: Navigation Links & Auth */}
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                    <Link to="/" className="hide-on-mobile" style={{ fontWeight: '500' }}>Catalogue</Link>

                    <Link to="/cart" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', position: 'relative', padding: '0.5rem' }}>
                        <ShoppingCart size={20} />
                        {cartCount > 0 && (
                            <span style={{ position: 'absolute', top: '0px', right: '0px', background: 'var(--color-accent-orange)', color: 'white', borderRadius: '50%', padding: '1px 5px', fontSize: '0.65rem', fontWeight: 'bold' }}>
                                {cartCount}
                            </span>
                        )}
                    </Link>

                    {/* Auth Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        {currentUser ? (
                            <>
                                <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
                                    <User size={18} /> {currentUser.displayName?.split(' ')[0]}
                                </div>
                                <button onClick={logout} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                                    <LogOut size={16} />
                                </button>
                            </>
                        ) : (
                            <button onClick={loginWithGoogle} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
