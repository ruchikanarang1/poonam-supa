import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Package, ShoppingCart, X, Send, CheckCircle2, Loader2, Plus, Minus } from 'lucide-react';

// ── Cart persistence for the public store ──────────────────────────────────
const useStoreCart = () => {
    const [cart, setCart] = useState([]);

    const addItem = (product) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
            return [...prev, { ...product, qty: 1 }];
        });
    };
    const changeQty = (id, delta) => {
        setCart(prev => prev
            .map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
            .filter(i => i.qty > 0)
        );
    };
    const clear = () => setCart([]);
    const total = cart.reduce((s, i) => s + (i.price || 0) * i.qty, 0);
    return { cart, addItem, changeQty, clear, total };
};

export default function CustomerStore() {
    // The company_id is passed via query param ?company=xxx  (set by the admin)
    const params    = new URLSearchParams(window.location.search);
    const companyId = params.get('company');

    const [products,  setProducts]  = useState([]);
    const [company,   setCompany]   = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [search,    setSearch]    = useState('');
    const [category,  setCategory]  = useState('All');
    const [cartOpen,  setCartOpen]  = useState(false);
    const [orderStep, setOrderStep] = useState('cart');  // cart | form | success
    const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);
    const { cart, addItem, changeQty, clear, total } = useStoreCart();

    useEffect(() => {
        if (!companyId) { setLoading(false); return; }
        const load = async () => {
            const [{ data: prods }, { data: comp }] = await Promise.all([
                supabase.from('products').select('*').eq('company_id', companyId),
                supabase.from('companies').select('name').eq('id', companyId).single()
            ]);
            setProducts(prods || []);
            setCompany(comp);
            setLoading(false);
        };
        load();
    }, [companyId]);

    const categories   = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
    const filtered     = products.filter(p => {
        const q = search.toLowerCase();
        return (p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q))
            && (category === 'All' || p.category === category);
    });

    const handleOrder = async (e) => {
        e.preventDefault();
        if (!form.name || !form.phone) return;
        setSubmitting(true);
        try {
            await supabase.from('orders').insert({
                company_id:  companyId,
                items:       cart,
                total,
                status:      'pending',
                customer_name:  form.name,
                customer_phone: form.phone,
                customer_email: form.email,
                notes:       form.notes,
                created_at:  new Date().toISOString()
            });
            clear();
            setOrderStep('success');
        } catch (err) {
            alert('Failed to place order. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!companyId) return (
        <NoCompany />
    );

    const orange  = '#FF6A00';
    const navy    = '#0f172a';

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>

            {/* ── Store Header ── */}
            <header style={{
                background: navy, color: 'white',
                padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 20px rgba(0,0,0,0.3)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: orange }} />
                    <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.04em' }}>
                        {company?.name || 'Steel Store'}
                    </span>
                </div>
                <button
                    onClick={() => { setCartOpen(true); setOrderStep('cart'); }}
                    style={{
                        background: orange, border: 'none', borderRadius: '10px',
                        padding: '0.5rem 1.1rem', color: 'white', fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
                    }}
                >
                    <ShoppingCart size={18} />
                    Cart {cart.length > 0 && <span style={{ background: 'white', color: orange, borderRadius: '999px', padding: '0 6px', fontSize: '0.75rem' }}>{cart.length}</span>}
                </button>
            </header>

            {/* ── Filters ── */}
            <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', borderRadius: '8px', padding: '0.5rem 0.75rem', flex: 1, minWidth: '200px' }}>
                    <Search size={16} color="#94a3b8" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search products…"
                        style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.9rem', width: '100%' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {categories.map(c => (
                        <button key={c} onClick={() => setCategory(c)} style={{
                            padding: '0.4rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                            cursor: 'pointer', border: `1.5px solid ${category === c ? orange : '#e2e8f0'}`,
                            background: category === c ? orange : 'white',
                            color: category === c ? 'white' : '#64748b',
                            transition: 'all 0.15s'
                        }}>{c}</button>
                    ))}
                </div>
            </div>

            {/* ── Product Grid ── */}
            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
                        <p>Loading products…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '6rem 2rem', color: '#94a3b8' }}>
                        <Package size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                        <h3 style={{ color: '#64748b' }}>No products found</h3>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
                        {filtered.map(p => (
                            <div key={p.id} style={{
                                background: 'white', borderRadius: '16px', overflow: 'hidden',
                                border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                display: 'flex', flexDirection: 'column',
                                transition: 'transform 0.2s, box-shadow 0.2s'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
                            >
                                <div style={{ height: '180px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {p.image_url
                                        ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <Package size={40} color="#cbd5e1" />
                                    }
                                </div>
                                <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    {p.category && (
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: orange, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                                            {p.category}
                                        </span>
                                    )}
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: navy, margin: '0 0 0.5rem' }}>{p.name}</h3>
                                    {p.description && <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.75rem', lineHeight: 1.5 }}>{p.description}</p>}
                                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 800, fontSize: '1rem', color: orange }}>
                                            {p.price ? `₹${p.price}/${p.unit || 'unit'}` : 'Price on Request'}
                                        </span>
                                        <button onClick={() => addItem(p)} style={{
                                            background: navy, color: 'white', border: 'none',
                                            borderRadius: '8px', padding: '0.45rem 1rem', fontWeight: 700,
                                            fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
                                        }}>
                                            <Plus size={14} /> Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* ── Cart Drawer ── */}
            {cartOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
                    <div onClick={() => setCartOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
                    <div style={{
                        position: 'absolute', right: 0, top: 0, bottom: 0, width: '420px', maxWidth: '100vw',
                        background: 'white', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
                        display: 'flex', flexDirection: 'column', padding: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: navy }}>
                                {orderStep === 'success' ? '✓ Order Placed' : orderStep === 'form' ? 'Your Details' : 'Your Cart'}
                            </h2>
                            <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={22} />
                            </button>
                        </div>

                        {orderStep === 'success' ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '1rem' }}>
                                <CheckCircle2 size={56} color="#22c55e" />
                                <h3 style={{ color: navy, margin: 0 }}>Thank you!</h3>
                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Your enquiry has been submitted. Our team will contact you shortly.</p>
                                <button onClick={() => { setCartOpen(false); setOrderStep('cart'); }} style={{
                                    background: orange, color: 'white', border: 'none', borderRadius: '10px',
                                    padding: '0.75rem 2rem', fontWeight: 700, cursor: 'pointer', marginTop: '1rem'
                                }}>
                                    Continue Shopping
                                </button>
                            </div>
                        ) : orderStep === 'form' ? (
                            <form onSubmit={handleOrder} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {[
                                    { label: 'Full Name *', key: 'name', type: 'text', required: true },
                                    { label: 'Phone Number *', key: 'phone', type: 'tel', required: true },
                                    { label: 'Email', key: 'email', type: 'email', required: false },
                                    { label: 'Notes / Special Requirements', key: 'notes', type: 'textarea', required: false },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>{f.label}</label>
                                        {f.type === 'textarea'
                                            ? <textarea rows={3} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                                style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                                            : <input type={f.type} required={f.required} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                                style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem', fontSize: '0.9rem', boxSizing: 'border-box' }} />
                                        }
                                    </div>
                                ))}
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                                    <button type="button" onClick={() => setOrderStep('cart')} style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '0.75rem', fontWeight: 700, cursor: 'pointer', color: '#64748b' }}>Back</button>
                                    <button type="submit" disabled={submitting} style={{ flex: 2, background: orange, color: 'white', border: 'none', borderRadius: '10px', padding: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><Send size={16} /> Submit Enquiry</>}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    {cart.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                                            <ShoppingCart size={40} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                                            <p>Your cart is empty</p>
                                        </div>
                                    ) : cart.map(item => (
                                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: navy }}>{item.name}</div>
                                                <div style={{ fontSize: '0.78rem', color: orange, fontWeight: 600 }}>
                                                    {item.price ? `₹${item.price} × ${item.qty}` : 'Quote'}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <button onClick={() => changeQty(item.id, -1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} /></button>
                                                <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                                                <button onClick={() => changeQty(item.id, 1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #e2e8f0', background: navy, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {cart.length > 0 && (
                                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: navy, marginBottom: '1rem' }}>
                                            <span>Estimated Total</span>
                                            <span style={{ color: orange }}>{total > 0 ? `₹${total.toLocaleString('en-IN')}` : 'Quote Based'}</span>
                                        </div>
                                        <button onClick={() => setOrderStep('form')} style={{
                                            width: '100%', background: orange, color: 'white', border: 'none',
                                            borderRadius: '12px', padding: '0.9rem', fontWeight: 800, fontSize: '1rem',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                        }}>
                                            Place Enquiry <ArrowRight size={18} />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                * { box-sizing: border-box; }
            `}</style>
        </div>
    );
}

function ArrowRight({ size }) {
    return <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function NoCompany() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: '2rem' }}>
            <div>
                <Package size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                <h2 style={{ color: '#334155' }}>Invalid store link</h2>
                <p style={{ color: '#94a3b8' }}>This store link is missing a company ID. Please use the link provided by your supplier.</p>
            </div>
        </div>
    );
}
