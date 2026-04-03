import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { getProducts } from '../lib/db';
import { Search, Package, Plus, Database, Filter, ArrowUpDown, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductModal from '../components/ProductModal';

export default function Catalogue() {
    const { currentCompanyId, isAdmin } = useAuth();
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [brand, setBrand] = useState('All Brands');
    const [sortBy, setSortBy] = useState('newest');
    const [loading, setLoading] = useState(true);
    const { addToCart, cartItems, updateQuantity, removeFromCart } = useCart();
    
    // UI state for selections on cards
    const [selectedSizes, setSelectedSizes] = useState({});
    const [viewProduct, setViewProduct] = useState(null);

    useEffect(() => {
        if (!currentCompanyId) return;
        const loadProducts = async () => {
            setLoading(true);
            const timeout = setTimeout(() => setLoading(false), 6000);
            try {
                const data = await getProducts(currentCompanyId);
                setProducts(data);
            } catch (err) {
                console.error(err);
            } finally {
                clearTimeout(timeout);
                setLoading(false);
            }
        };
        loadProducts();
    }, [currentCompanyId]);

    const categories = ['All', ...new Set(products.map(p => p.category))];
    const brands = ['All Brands', ...new Set(products.filter(p => p.brand).map(p => p.brand))];
    
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                             (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()));
        const matchesCategory = category === 'All' || p.category === category;
        const matchesBrand = brand === 'All Brands' || p.brand === brand;
        return matchesSearch && matchesCategory && matchesBrand;
    });

    // Sorting Logic
    const sortedProducts = [...filteredProducts].sort((a, b) => {
        if (sortBy === 'price-low') return (a.price || 0) - (b.price || 0);
        if (sortBy === 'price-high') return (b.price || 0) - (a.price || 0);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return new Date(b.created_at) - new Date(a.created_at); // newest
    });

    // How many of this specific item (id + size) are in cart
    const getCartQty = (id, size) => cartItems.find(i => i.id === id && i.selectedSize === size)?.quantity || 0;

    const handleAdd = (product) => {
        const size = selectedSizes[product.id] || (product.sizes?.[0] || null);
        addToCart(product, 1, size);
    };

    return (
        <div className="container" style={{ padding: 'var(--spacing-xl) 0' }}>
            
            {/* Header Area */}
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h1 style={{ color: 'var(--color-accent-blue)', marginBottom: '0.5rem' }}>Inventory Catalogue</h1>
                <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Browse products, check sizes, and add to your requirements.</p>
            </div>

            {/* Filter & Sort Bar */}
            <div style={{ 
                background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)', 
                display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: 'var(--spacing-xl)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                    <input 
                        type="text" placeholder="Search by name or brand..." 
                        className="input-field" value={search} onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
                    />
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <Filter size={16} color="#64748b" />
                        <select className="input-field" value={category} onChange={e => setCategory(e.target.value)} style={{ border: 'none', background: 'transparent', marginBottom: 0, paddingRight: '2rem', fontSize: '0.85rem' }}>
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <Package size={16} color="#64748b" />
                        <select className="input-field" value={brand} onChange={e => setBrand(e.target.value)} style={{ border: 'none', background: 'transparent', marginBottom: 0, paddingRight: '2rem', fontSize: '0.85rem' }}>
                            {brands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <ArrowUpDown size={16} color="#64748b" />
                        <select className="input-field" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ border: 'none', background: 'transparent', marginBottom: 0, paddingRight: '2rem', fontSize: '0.85rem' }}>
                            <option value="newest">Newest First</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="name">Alphabetical (A-Z)</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem' }}>Syncing with inventory...</p>
                    <button className="btn btn-outline" onClick={() => setLoading(false)}>Skip Loading</button>
                </div>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: window.innerWidth <= 768 ? '1fr 1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', 
                    gap: window.innerWidth <= 768 ? '0.75rem' : '1.5rem' 
                }}>
                    {sortedProducts.map(product => {
                        const currentSize = selectedSizes[product.id] || (product.sizes?.[0] || null);
                        const inCart = getCartQty(product.id, currentSize);

                        return (
                            <div key={product.id} className="card product-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', position: 'relative' }}>
                                {/* Image Overlay for Quick View */}
                                <div 
                                    className="image-container"
                                    onClick={() => setViewProduct(product)}
                                    style={{ 
                                        height: window.innerWidth <= 768 ? '140px' : '200px', backgroundColor: '#f8fafc', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                        cursor: 'pointer', position: 'relative', overflow: 'hidden'
                                    }}
                                >
                                    {product.imageUrl
                                        ? <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '0.5rem' }} />
                                        : <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>No Image</span>}
                                    
                                    <div className="quick-view-overlay" style={{ 
                                        position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.5rem', 
                                        background: 'rgba(255,255,255,0.9)', textAlign: 'center', fontSize: '0.7rem', 
                                        fontWeight: '700', transform: 'translateY(100%)', transition: 'transform 0.2s'
                                    }}>
                                        <Eye size={12} style={{ marginRight: '4px' }} /> QUICK VIEW
                                    </div>
                                </div>

                                {/* Details */}
                                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--color-primary)', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px' }}>
                                            {product.category}
                                        </span>
                                        {product.brand && <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#b45309' }}>{product.brand}</span>}
                                    </div>
                                    
                                    <h3 
                                        onClick={() => setViewProduct(product)}
                                        style={{ marginBottom: '0.5rem', color: '#1e293b', fontSize: '1rem', cursor: 'pointer' }}
                                    >
                                        {product.name}
                                    </h3>

                                    {/* Size Dropdown on Card */}
                                    {product.sizes && product.sizes.length > 0 && (
                                        <div style={{ marginBottom: '1rem' }}>
                                            <select 
                                                className="input-field" 
                                                value={currentSize}
                                                onChange={e => setSelectedSizes({ ...selectedSizes, [product.id]: e.target.value })}
                                                style={{ fontSize: '0.75rem', padding: '4px', marginBottom: 0, background: '#f8fafc' }}
                                            >
                                                {product.sizes.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {/* Price + CTA */}
                                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--color-accent-orange)' }}>
                                            {product.price ? `₹${product.price}` : 'Quote'}
                                        </span>

                                        <button 
                                            className="btn btn-primary" 
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} 
                                            onClick={() => handleAdd(product)}
                                        >
                                            {inCart > 0 ? `In Cart (${inCart})` : 'Add To Cart'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Product Quick View Modal */}
            {viewProduct && (
                <ProductModal 
                    product={viewProduct} 
                    onClose={() => setViewProduct(null)} 
                />
            )}

            {/* Custom Styles for Hover Effects */}
            <style>{`
                .product-card:hover .quick-view-overlay {
                    transform: translateY(0) !important;
                }
                .product-card {
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .product-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                }
            `}</style>
        </div>
    );
}
