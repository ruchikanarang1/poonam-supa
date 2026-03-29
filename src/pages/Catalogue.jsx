import React, { useState, useEffect } from 'react';
import { getProducts } from '../lib/db';
import { useCart } from '../contexts/CartContext';
import { Search } from 'lucide-react';

export default function Catalogue() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();

    useEffect(() => {
        // Fetch products
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

                    <select
                        className="input-field"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        style={{ width: '150px' }}
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <p>Loading catalogue...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-lg)' }}>
                    {filteredProducts.map(product => (
                        <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                            {/* Product Image */}
                            <div style={{ height: '200px', backgroundColor: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ color: 'var(--color-text-light)' }}>No Image Available</span>
                                )}
                            </div>

                            <div style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <div style={{ padding: '0.25rem 0.5rem', backgroundColor: 'var(--color-secondary)', borderRadius: '4px', marginBottom: 'var(--spacing-sm)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-light)', alignSelf: 'flex-start' }}>
                                    {product.category}
                                </div>
                                <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-accent-blue)' }}>{product.name}</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>{product.description}</p>
                                <div style={{ marginBottom: 'var(--spacing-md)', fontSize: '0.85rem' }}>
                                    <strong>Dimensions:</strong> {product.dimensions || 'N/A'}
                                </div>

                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--color-accent-orange)' }}>
                                        {product.price ? `₹${product.price}/kg` : 'Price on Request'}
                                    </span>
                                    <button className="btn btn-primary" onClick={() => addToCart(product, 1)}>
                                        {product.price ? 'Add to Cart' : 'Request Quote'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredProducts.length === 0 && <p>No products found.</p>}
                </div>
            )}
        </div>
    );
}
