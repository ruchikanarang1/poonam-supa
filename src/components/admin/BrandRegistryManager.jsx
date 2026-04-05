import React, { useState, useEffect } from 'react';
import { 
    getVendorBrandRegistry, saveVendorBrandEntry, deleteVendorBrandEntry, 
    getSuppliers, getFormConfig 
} from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Trash2, Edit2, Check, X, Save, Database, History, Search, RefreshCw } from 'lucide-react';
import GenericAutocomplete from '../GenericAutocomplete';

export default function BrandRegistryManager() {
    const { currentCompanyId } = useAuth();
    const [registry, setRegistry] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form and Registry UI State
    const [formData, setFormData] = useState({ vendorName: '', brandName: '' });
    const [products, setProducts] = useState([{ id: Date.now(), name: '', size: '' }]);
    const [dynamicData, setDynamicData] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { 
        if (currentCompanyId) load(); 
    }, [currentCompanyId]);

    const load = async () => {
        setLoading(true);
        try {
            const [regData, sups, config] = await Promise.all([
                getVendorBrandRegistry(currentCompanyId),
                getSuppliers(currentCompanyId),
                getFormConfig(currentCompanyId, 'vendor_brand_registry')
            ]);
            setRegistry(regData);
            setSuppliers(sups);
            setFields(config);
            
            // Initialize dynamic fields
            const initialDynamic = {};
            config.forEach(f => initialDynamic[f.id] = '');
            setDynamicData(initialDynamic);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.vendorName || !formData.brandName) return;
        setSaving(true);
        try {
            // Filter out empty products
            const cleanedProducts = products.filter(p => p.name.trim()).map(({ id, ...rest }) => rest);
            const dataToSave = { 
                ...formData, 
                ...dynamicData,
                products: cleanedProducts,
                // Keep old productName for backward compatibility (use first product)
                productName: cleanedProducts.length > 0 ? cleanedProducts[0].name : ''
            };
            await saveVendorBrandEntry(currentCompanyId, editingId, dataToSave);
            alert("Registry Entry Saved!");
            
            setEditingId(null);
            setFormData({ vendorName: '', brandName: '' });
            setProducts([{ id: Date.now(), name: '', size: '' }]);
            const initialDynamic = {};
            fields.forEach(f => initialDynamic[f.id] = '');
            setDynamicData(initialDynamic);
            await load();
        } catch (err) { alert('Failed to save'); }
        finally { setSaving(false); }
    };

    const handleSync = async () => {
        if (!window.confirm("Sync all existing Supplier Brands into the Registry?")) return;
        setSaving(true);
        try {
            let count = 0;
            for (const s of suppliers) {
                if (s.brands && Array.isArray(s.brands)) {
                    for (const brand of s.brands) {
                        const exists = registry.find(r => r.vendorName === s.name && r.brandName === brand);
                        if (!exists) {
                            await saveVendorBrandEntry(currentCompanyId, null, { vendorName: s.name, brandName: brand });
                            count++;
                        }
                    }
                }
            }
            alert(`Sync Complete! Imported ${count} brand associations.`);
            await load();
        } catch (err) { alert("Sync failed"); }
        finally { setSaving(false); }
    };

    const startEdit = (entry) => {
        setEditingId(entry.id);
        setFormData({ vendorName: entry.vendorName, brandName: entry.brandName });
        
        // Load products if they exist, otherwise migrate from old productName
        if (entry.products && entry.products.length > 0) {
            setProducts(entry.products.map((p, idx) => ({ ...p, id: Date.now() + idx })));
        } else if (entry.productName) {
            // Migrate old format
            setProducts([{ id: Date.now(), name: entry.productName, size: '' }]);
        } else {
            setProducts([{ id: Date.now(), name: '', size: '' }]);
        }
        
        const dyn = {};
        fields.forEach(f => dyn[f.id] = entry[f.id] || '');
        setDynamicData(dyn);
    };

    const addProduct = () => {
        setProducts([...products, { id: Date.now(), name: '', size: '' }]);
    };

    const removeProduct = (id) => {
        if (products.length > 1) {
            setProducts(products.filter(p => p.id !== id));
        }
    };

    const updateProduct = (id, field, value) => {
        setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this brand association?')) return;
        await deleteVendorBrandEntry(currentCompanyId, id);
        setRegistry(registry.filter(r => r.id !== id));
    };

    const filteredRegistry = registry.filter(r => 
        r.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.productName && r.productName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <p>Loading Brand Registry...</p>;

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #eee', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ color: 'var(--color-accent-blue)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Database size={20} /> Vendor-Brand Registry
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Define which vendors sell which brands and add custom metadata.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={handleSync} disabled={saving} className="btn btn-outline" style={{ fontSize: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <RefreshCw size={14} className={saving ? 'spin' : ''} /> Sync From Suppliers
                    </button>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input className="saas-input-box" style={{ width: '250px', paddingLeft: '32px' }} placeholder="Search vendor or brand..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Excel Entry Row */}
            <div style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
                <form onSubmit={handleSave} className="saas-excel-data-row" style={{ minWidth: '100%', padding: '10px 1.5rem', background: '#fcfcfc' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ width: '220px' }}>
                                <span className="saas-lot-label-tiny">VENDOR / SUPPLIER</span>
                                <GenericAutocomplete 
                                    placeholder="Search supplier..." 
                                    fetchData={() => getSuppliers(currentCompanyId)} 
                                    iconType="vendor"
                                    value={formData.vendorName} onChange={v => setFormData({ ...formData, vendorName: v })}
                                    onSelect={s => setFormData({ ...formData, vendorName: s.name })}
                                />
                            </div>
                            <div style={{ width: '180px' }}>
                                <span className="saas-lot-label-tiny">BRAND</span>
                                <input className="saas-input-box" required placeholder="e.g. TATA" value={formData.brandName} onChange={e => setFormData({ ...formData, brandName: e.target.value })} />
                            </div>
                            {fields.map(f => (
                                <div key={f.id} style={{ width: '140px' }}>
                                    <span className="saas-lot-label-tiny">{f.label.toUpperCase()}</span>
                                    <input className="saas-input-box" required={f.required} type={f.type} placeholder="..." value={dynamicData[f.id] || ''} onChange={e => setDynamicData({ ...dynamicData, [f.id]: e.target.value })} />
                                </div>
                            ))}
                        </div>
                        
                        {/* Products Section */}
                        <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span className="saas-lot-label-tiny">PRODUCTS / ITEMS</span>
                                <button type="button" onClick={addProduct} className="btn btn-outline" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}>
                                    + Add Product
                                </button>
                            </div>
                            {products.map((product, idx) => (
                                <div key={product.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 30px', gap: '0.5rem', marginBottom: idx < products.length - 1 ? '0.5rem' : '0', alignItems: 'center' }}>
                                    <input 
                                        className="saas-input-box" 
                                        placeholder="e.g. TMT Bar" 
                                        value={product.name} 
                                        onChange={e => updateProduct(product.id, 'name', e.target.value)}
                                    />
                                    <input 
                                        className="saas-input-box" 
                                        placeholder="Size (e.g. 10mm)" 
                                        value={product.size} 
                                        onChange={e => updateProduct(product.id, 'size', e.target.value)}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => removeProduct(product.id)}
                                        disabled={products.length === 1}
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            cursor: products.length === 1 ? 'not-allowed' : 'pointer', 
                                            color: products.length === 1 ? '#ccc' : '#ff4444',
                                            padding: '0.2rem'
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.3rem', display: 'grid', gridTemplateColumns: '2fr 1fr 30px', gap: '0.5rem' }}>
                                <span>Product Name</span>
                                <span>Size (Optional)</span>
                                <span></span>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn btn-primary" disabled={saving} style={{ background: 'var(--color-accent-blue)', display: 'flex', gap: '0.4rem' }}>
                                {editingId ? 'Update' : 'Add Entry'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Registry Table */}
            <div style={{ overflowX: 'auto', maxHeight: '50vh' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                        <tr style={{ background: '#1e293b', color: 'white' }}>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Vendor</th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Brand</th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Product / Item</th>
                            {fields.map(f => (
                                <th key={f.id} style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>{f.label}</th>
                            ))}
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRegistry.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '0.75rem 1.5rem', fontWeight: 'bold' }}>{item.vendorName}</td>
                                <td style={{ padding: '0.75rem 1.5rem' }}>{item.brandName}</td>
                                <td style={{ padding: '0.75rem 1.5rem' }}>
                                    {item.products && item.products.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            {item.products.map((p, idx) => (
                                                <span key={idx} style={{ fontSize: '0.8rem', color: '#475569' }}>
                                                    • {p.name}{p.size ? ` (${p.size})` : ''}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span style={{ color: '#94a3b8' }}>{item.productName || '—'}</span>
                                    )}
                                </td>
                                {fields.map(f => (
                                    <td key={f.id} style={{ padding: '0.75rem 1.5rem', color: '#64748b' }}>{item[f.id] || '—'}</td>
                                ))}
                                <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <button onClick={() => startEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent-blue)' }}><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                        {filteredRegistry.length === 0 && (
                            <tr><td colSpan={fields.length + 4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No registry records found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
