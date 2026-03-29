import React, { useState, useEffect } from 'react';
import { getProducts } from '../lib/db';
import { useCart } from '../contexts/CartContext';
import { Search } from 'lucide-react';

export default function Catalogue() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const { addToCart, cartItems, updateQuantity, removeFromCart } = useCart();
    // Local string state for the editable qty input — only commits to cart on blur
    const [inputValues, setInputValues] = useState({});

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const data = await getProducts();
                if (data.length === 0) {
                    setProducts([
                        { id: '1', name: 'TMT Bar 12mm', category: 'TMT Bars', description: 'High-strength deformed steel bars.', price: null, dimensions: '12mm x 12m' },
                        { id: '2', name: 'MS Angle 40x40x5', category: 'Structural Steel', description: 'Mild steel equal angle.', price: null, dimensions: '40mm x 40mm x 5mm' },
                        { id: '3', name: 'HR Coil 2mm', category: 'Coils & Sheets', description: 'Hot rolled steel coil.', price: 120, dimensions: '2mm Thickness' }
                    ]);
                } else {
                    setProducts(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadProducts();
    }, []);

    const categories = ['All', ...new Set(products.map(p => p.category))];
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = category === 'All' || p.category === category;
        return matchesSearch && matchesCategory;
    });

    // How many of this product are currently in the cart
    const cartQtyFor = (id) => cartItems.find(i => i.id === id)?.quantity || 0;

    const stepperBtnBase = {
        width: '32px', height: '32px', borderRadius: '50%',
        border: '2px solid #333',
        fontWeight: 'bold', fontSize: '1.1rem',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1, flexShrink: 0
    };

    const handleAdd = (product) => addToCart(product, 1);
    const handleIncrease = (product) => updateQuantity(product.id, cartQtyFor(product.id) + 1);
    const handleDecrease = (product) => {
        const current = cartQtyFor(product.id);
        current <= 1 ? removeFromCart(product.id) : updateQuantity(product.id, current - 1);
    };

    return (
        <div className="container" style={{ padding: 'var(--spacing-xl) 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <h1 style={{ color: 'var(--color-accent-blue)' }}>Product Catalogue</h1>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <div className="input-group" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: '0 0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                        <Search size={18} color="var(--color-text-light)" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field"
                            style={{ border: 'none', padding: '0.5rem', width: '200px' }}
                        />
                    </div>
                    <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '150px' }}>
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
            </div>

            {loading ? <p>Loading catalogue...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-lg)' }}>
                    {filteredProducts.map(product => {
                        const inCart = cartQtyFor(product.id);
                        return (
                            <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                                {/* Image */}
                                <div style={{ height: '200px', backgroundColor: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {product.imageUrl
                                        ? <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <span style={{ color: 'var(--color-text-light)' }}>No Image Available</span>}
                                </div>

                                {/* Details */}
                                <div style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <div style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--color-secondary)', borderRadius: '4px', marginBottom: 'var(--spacing-sm)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-light)', alignSelf: 'flex-start' }}>
                                        {product.category}
                                    </div>
                                    <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-accent-blue)' }}>{product.name}</h3>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>{product.description}</p>
                                    <div style={{ marginBottom: 'var(--spacing-md)', fontSize: '0.85rem' }}>
                                        <strong>Dimensions:</strong> {product.dimensions || 'N/A'}
                                    </div>

                                    {/* Price + Cart CTA */}
                                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--color-accent-orange)' }}>
                                            {product.price ? `₹${product.price}/kg` : 'Price on Request'}
                                        </span>

                                        {inCart > 0 ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <button style={{ ...stepperBtnBase, background: 'white', color: '#333' }} onClick={() => handleDecrease(product)}>−</button>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={inputValues[product.id] !== undefined ? inputValues[product.id] : inCart}
                                                    onFocus={() => setInputValues(v => ({ ...v, [product.id]: String(inCart) }))}
                                                    onChange={e => setInputValues(v => ({ ...v, [product.id]: e.target.value }))}
                                                    onBlur={e => {
                                                        const v = parseInt(e.target.value);
                                                        if (!isNaN(v) && v >= 1) updateQuantity(product.id, v);
                                                        else updateQuantity(product.id, 1);
                                                        setInputValues(v => { const n = { ...v }; delete n[product.id]; return n; });
                                                    }}
                                                    style={{ width: '44px', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px', padding: '2px 4px' }}
                                                />
                                                <button style={{ ...stepperBtnBase, background: '#333', color: 'white' }} onClick={() => handleIncrease(product)}>+</button>
                                            </div>
                                        ) : (
                                            <button className="btn btn-primary" onClick={() => handleAdd(product)}>
                                                {product.price ? 'Add to Cart' : 'Request Quote'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredProducts.length === 0 && <p>No products found.</p>}
                </div>
            )}
        </div>
    );
}
