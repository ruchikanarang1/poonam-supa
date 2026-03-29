import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { createOrder } from '../lib/db';
import { Trash2 } from 'lucide-react';

export default function Cart() {
    const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();
    const { currentUser, userData } = useAuth();

    const [employeeRef, setEmployeeRef] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);

    const handleCheckout = async (e) => {
        e.preventDefault();
        if (cartItems.length === 0) return alert("Cart is empty");
        if (!currentUser) return alert("Please login to submit an order");
        if (!employeeRef) return alert("Employee Reference Code is required");

        setIsSubmitting(true);
        try {
            await createOrder({
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
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-lg)' }}>
                    {/* Cart Items */}
                    <div>
                        <div className="card" style={{ padding: 0 }}>
                            {cartItems.map((item, index) => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: 'var(--spacing-md)', borderBottom: index !== cartItems.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ color: 'var(--color-accent-blue)' }}>{item.name}</h4>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>{item.category} | {item.dimensions}</p>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                                            className="input-field"
                                            style={{ width: '80px', padding: '0.25rem 0.5rem' }}
                                        />
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-outline" style={{ marginTop: 'var(--spacing-md)' }} onClick={clearCart}>
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
                                    <label>Employee Reference Code *</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        required
                                        value={employeeRef}
                                        onChange={(e) => setEmployeeRef(e.target.value)}
                                        placeholder="e.g. EMP-1234"
                                    />
                                </div>

                                {currentUser ? (
                                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--spacing-sm)' }} disabled={isSubmitting}>
                                        {isSubmitting ? 'Submitting...' : 'Submit Order to Admin'}
                                    </button>
                                ) : (
                                    <p style={{ color: 'var(--color-accent-orange)', fontSize: '0.9rem', textAlign: 'center' }}>Please login to place an order</p>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
