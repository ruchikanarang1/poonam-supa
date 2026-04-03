import React, { useState } from 'react';
import { X, ShoppingCart, Check, Info } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

export default function ProductModal({ product, onClose }) {
    const { addToCart, cartItems } = useCart();
    const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || null);
    const [quantity, setQuantity] = useState(1);
    const [added, setAdded] = useState(false);

    if (!product) return null;

    const handleAddToCart = () => {
        addToCart(product, quantity, selectedSize);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem'
        }} onClick={onClose}>
            <div 
                style={{
                    backgroundColor: 'white', borderRadius: '16px',
                    width: '100%', maxWidth: '900px', maxHeight: '900px',
                    display: 'flex', flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    overflow: 'hidden', position: 'relative',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                }} 
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '1rem', right: '1rem',
                        border: 'none', background: 'white', borderRadius: '50%',
                        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', zIndex: 10
                    }}
                >
                    <X size={20} />
                </button>

                {/* Left: Image */}
                <div style={{ 
                    flex: 1, backgroundColor: '#f8fafc', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: window.innerWidth <= 768 ? '250px' : 'auto'
                }}>
                    {product.imageUrl ? (
                        <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '1rem' }} 
                        />
                    ) : (
                        <div style={{ color: '#94a3b8', textAlign: 'center' }}>
                            <Info size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                            <p>No Image Available</p>
                        </div>
                    )}
                </div>

                {/* Right: Info */}
                <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
                    <div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-primary)', background: '#e0f2fe', padding: '2px 8px', borderRadius: '99px' }}>
                                {product.category}
                            </span>
                            {product.brand && (
                                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '99px' }}>
                                    {product.brand}
                                </span>
                            )}
                        </div>
                        <h2 style={{ fontSize: '1.75rem', color: '#1e293b', marginBottom: '0.5rem' }}>{product.name}</h2>
                        <p style={{ color: '#64748b', lineHeight: 1.6 }}>{product.description || 'No description provided.'}</p>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-accent-orange)', marginBottom: '1rem' }}>
                            {product.price ? `₹${product.price}/kg` : 'Price on Request'}
                        </div>

                        {/* Size Selection */}
                        {product.sizes && product.sizes.length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem' }}>Select Size</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {product.sizes.map(size => (
                                        <button
                                            key={size}
                                            onClick={() => setSelectedSize(size)}
                                            style={{
                                                padding: '8px 16px', borderRadius: '8px', border: selectedSize === size ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
                                                background: selectedSize === size ? '#f0f9ff' : 'white',
                                                color: selectedSize === size ? 'var(--color-primary)' : '#475569',
                                                fontWeight: selectedSize === size ? 'bold' : 'normal',
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quantity & Add to Cart */}
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                            <div style={{ width: '80px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem' }}>Qty (kg)</label>
                                <input 
                                    type="number" min="1" 
                                    value={quantity} onChange={e => setQuantity(Number(e.target.value))}
                                    className="input-field" 
                                />
                            </div>
                            <button 
                                className="btn btn-primary" 
                                style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                onClick={handleAddToCart}
                            >
                                {added ? <Check size={20} /> : <ShoppingCart size={20} />}
                                {added ? 'Added to Cart!' : (product.price ? 'Add to Cart' : 'Request Quote')}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginTop: 'auto', background: '#f8fafc', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                        <strong>Technical Specs:</strong> {product.dimensions || 'Standard industry specs apply.'}
                    </div>
                </div>
            </div>
        </div>
    );
}
