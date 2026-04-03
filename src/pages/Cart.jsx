import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { createOrder } from '../lib/db';
import { Trash2 } from 'lucide-react';

export default function Cart() {
    const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();
    const { currentUser, userData, currentCompanyId } = useAuth();

    const [employeeRef, setEmployeeRef] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    // Local string state: lets user freely type a qty, only commits to cart on blur
    const [inputValues, setInputValues] = useState({});

    const handleCheckout = async (e) => {
        e.preventDefault();
        if (cartItems.length === 0) return alert("Cart is empty");
        if (!currentUser) return alert("Please login to submit an order");
        if (!employeeRef) return alert("Employee Reference Code is required");

        setIsSubmitting(true);
        try {
            await createOrder(currentCompanyId, {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                userName: userData?.displayName || 'Unknown',
                businessName: userData?.businessName || 'Unknown',
                location: userData?.location || 'Unknown',
                employeeReference: employeeRef,
                items: cartItems,
                status: 'pending'
            });
            clearCart();
            setOrderSuccess(true);
        } catch (error) {
            console.error(error);
            alert("Failed to submit order.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (orderSuccess) {
        return (
            <div className="container" style={{ padding: 'var(--spacing-xl) 0', textAlign: 'center' }}>
                <h2 style={{ color: 'green', marginBottom: 'var(--spacing-md)' }}>Order Submitted Successfully!</h2>
                <p>Your order has been sent to the admin. Our team will contact you shortly.</p>
                <button className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }} onClick={() => setOrderSuccess(false)}>
                    Back to Cart
                </button>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: 'var(--spacing-xl) 0' }}>
            <h1 style={{ color: 'var(--color-accent-blue)', marginBottom: 'var(--spacing-lg)' }}>Your Cart</h1>

            {cartItems.length === 0 ? (
                <p>Your cart is empty.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '2fr 1fr', gap: 'var(--spacing-lg)' }}>
                    {/* Cart Items */}
                    <div>
                        <div className="card" style={{ padding: 0 }}>
                            {cartItems.map((item, index) => {
                                const itemKey = `${item.id}-${item.selectedSize || 'none'}`;
                                return (
                                    <div key={itemKey} className="stack-on-mobile" style={{ display: 'flex', alignItems: 'center', padding: 'var(--spacing-md)', borderBottom: index !== cartItems.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ color: 'var(--color-accent-blue)' }}>{item.name}</h4>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>{item.category}</span>
                                                {item.selectedSize && (
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary)', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px' }}>
                                                        Size: {item.selectedSize}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', width: window.innerWidth <= 768 ? '100%' : 'auto', justifyContent: 'space-between' }}>
                                            {/* +/- Stepper */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => item.quantity <= 1 ? removeFromCart(item.id, item.selectedSize) : updateQuantity(item.id, item.quantity - 1, item.selectedSize)}
                                                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #333', background: 'white', color: '#333', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >−</button>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={inputValues[itemKey] !== undefined ? inputValues[itemKey] : item.quantity}
                                                    onFocus={() => setInputValues(v => ({ ...v, [itemKey]: String(item.quantity) }))}
                                                    onChange={e => setInputValues(v => ({ ...v, [itemKey]: e.target.value }))}
                                                    onBlur={e => {
                                                        const v = parseInt(e.target.value);
                                                        if (!isNaN(v) && v >= 1) updateQuantity(item.id, v, item.selectedSize);
                                                        else updateQuantity(item.id, 1, item.selectedSize);
                                                        setInputValues(v => { const n = { ...v }; delete n[itemKey]; return n; });
                                                    }}
                                                    style={{ width: '48px', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px', padding: '2px 4px' }}
                                                />
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedSize)}
                                                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #333', background: '#333', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >+</button>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id, item.selectedSize)}
                                                style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '0.5rem' }}
                                            >
                                                <Trash2 size={24} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button className="btn btn-outline full-width-on-mobile" style={{ marginTop: 'var(--spacing-md)' }} onClick={clearCart}>
                            Clear Cart
                        </button>
                    </div>

                    {/* Checkout Panel */}
                    <div>
                        <div className="card">
                            <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-accent-blue)' }}>Order Summary</h3>
                            <p style={{ marginBottom: 'var(--spacing-md)', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
                                Total Items: {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                            </p>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--spacing-md) 0' }} />

                            <form onSubmit={handleCheckout}>
                                <div className="input-group">
                                    <label>Reference Code *</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        required
                                        value={employeeRef}
                                        onChange={(e) => setEmployeeRef(e.target.value)}
                                        placeholder="e.g. REF-1234"
                                    />
                                </div>

                                {currentUser && (
                                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--spacing-sm)' }} disabled={isSubmitting}>
                                        {isSubmitting ? 'Submitting...' : 'Confirm Order'}
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
