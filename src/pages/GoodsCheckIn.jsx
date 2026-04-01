import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
    getSuppliers, getPurchaseOrders, updatePurchaseOrder, 
    getLogisticsEntries, addGoodsCheckInEntry, getGlobalUnits,
    getVendorBrandRegistry
} from '../lib/db';
import { PackageSearch, Search, Plus, Trash2, CheckCircle, AlertCircle, Save, ArrowRight, Package } from 'lucide-react';
import GenericAutocomplete from '../components/GenericAutocomplete';

export default function GoodsCheckIn() {
    const { currentUser, userData, isAdmin, currentCompanyId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Data State
    const [suppliers, setSuppliers] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [transportEntries, setTransportEntries] = useState([]);
    const [globalUnits, setGlobalUnits] = useState([]);
    const [registry, setRegistry] = useState([]);
    const [history, setHistory] = useState([]);

    // Form State
    const [lrNumber, setLrNumber] = useState('');
    const [products, setProducts] = useState([{ id: Date.now(), brandName: '', vendorName: '', productName: '', quantity: '', unit: '' }]);
    const [matchedPOs, setMatchedPOs] = useState([]);

    const roles = userData?.roles || [];
    const hasAccess = isAdmin || roles.includes('checkin') || roles.includes('transport');

    useEffect(() => {
        if (hasAccess && currentCompanyId) loadInitialData();
    }, [hasAccess, currentCompanyId]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [sups, pos, transports, units, reg, checkins] = await Promise.all([
                getSuppliers(currentCompanyId),
                getPurchaseOrders(currentCompanyId),
                getLogisticsEntries(currentCompanyId, 'transport'),
                getGlobalUnits(currentCompanyId),
                getVendorBrandRegistry(currentCompanyId),
                (await import('../lib/db')).getGoodsCheckInEntries(currentCompanyId)
            ]);
            setSuppliers(sups);
            setPurchaseOrders(pos.filter(p => p.status !== 'received'));
            setTransportEntries(transports.filter(t => t.opened));
            setGlobalUnits(units);
            setRegistry(reg);
            
            // Filter for today's check-ins
            const today = new Date().toISOString().split('T')[0];
            setHistory(checkins.filter(c => c.createdAt && c.createdAt.startsWith(today)).reverse());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleLrLookup = () => {
        const entry = transportEntries.find(t => t.lr_number === lrNumber);
        if (entry) {
            const vendor = suppliers.find(s => s.name === entry.vendor_name);
            if (vendor) {
                // Populate all empty vendor rows with this vendor
                setProducts(products.map(p => ({ ...p, vendorName: p.vendorName || vendor.name })));
                alert(`Found Transport Entry for LR# ${lrNumber}. Vendor: ${vendor.name}`);
            }
        } else {
            alert("No 'Opened' transport entry found for this LR number.");
        }
    };

    const addProduct = () => setProducts([...products, { id: Date.now(), brandName: '', vendorName: products[products.length-1]?.vendorName || '', productName: '', quantity: '', unit: '' }]);
    const removeProduct = (id) => products.length > 1 && setProducts(products.filter(p => p.id !== id));
    const updateProduct = (id, updates) => {
        const next = products.map(p => p.id === id ? { ...p, ...updates } : p);
        setProducts(next);
        matchPOs(next);
    };

    const matchPOs = (currentProducts) => {
        const matches = purchaseOrders.filter(po => {
            // A PO matches if it contains any of the brands being checked in OR if vendor matches
            const brandMatch = po.items?.some(item => 
                currentProducts.some(p => p.brandName && item.productName.toLowerCase().includes(p.brandName.toLowerCase()))
            );
            const vendorMatch = currentProducts.some(p => p.vendorName === po.supplierName);
            return brandMatch || vendorMatch;
        });
        setMatchedPOs(matches);
    };

    const handleFinalize = async () => {
        if (!window.confirm("Complete Goods Check-In and update inventory?")) return;
        setSubmitting(true);
        try {
            const checkInData = {
                lrNumber,
                items: products,
                matchedPOs: matchedPOs.map(p => p.poNumber),
                submittedBy: currentUser.uid,
                createdAt: new Date().toISOString()
            };
            await addGoodsCheckInEntry(currentCompanyId, checkInData);
            
            // Update matched POs
            for (const po of matchedPOs) {
                await updatePurchaseOrder(currentCompanyId, po.id, { status: 'received' });
            }

            alert("Check-In Completed Successfully!");
            window.location.reload();
        } catch (err) { console.error(err); alert("Error finalizing: " + err.message); }
        finally { setSubmitting(false); }
    };

    if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading Check-In Portal...</div>;
    if (!hasAccess) return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'red' }}>Access Denied</h2></div>;

    return (
        <div className="container" style={{ padding: '1rem 0' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--color-accent-orange)', color: 'white', padding: '0.6rem', borderRadius: '12px' }}>
                        <PackageSearch size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--color-accent-blue)' }}>Goods Check-In</h2>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Verify physical stock against LR and PO</p>
                    </div>
                </div>
            </div>

            {/* LR Lookup Section */}
            <div className="card" style={{ marginBottom: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1.5rem', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>LR NUMBER (OPTIONAL LOOKUP)</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input className="saas-input-box" placeholder="e.g. 12345" value={lrNumber} onChange={e => setLrNumber(e.target.value)} />
                            <button onClick={handleLrLookup} className="btn btn-secondary" style={{ padding: '0 10px', background: 'var(--color-accent-blue)', color: 'white', border: 'none' }}>
                                <Search size={16} /> Look up LR
                            </button>
                        </div>
                    </div>
                    <div>
                        <button className="btn btn-outline" style={{ background: 'white' }} onClick={() => { setLrNumber(''); setProducts([{ id: Date.now(), brandName: '', vendorName: '', quantity: '', unit: '' }]); setMatchedPOs([]); }}>
                            Reset Form
                        </button>
                    </div>
                </div>
            </div>

            <div className="portal-container">
            {/* Core Check-In Form */}
            <div className="saas-excel-container" style={{ marginBottom: '1rem' }}>
                <div className="saas-excel-header">
                    <div className="saas-excel-label" style={{ width: '200px' }}>Brand</div>
                    <div className="saas-excel-label" style={{ width: '200px' }}>Product / Item</div>
                    <div className="saas-excel-label" style={{ width: '200px' }}>Linked Vendor</div>
                    <div className="saas-excel-label" style={{ width: '100px' }}>Quantity</div>
                    <div className="saas-excel-label" style={{ width: '120px' }}>Unit</div>
                    <div className="saas-excel-label" style={{ flex: 1, borderRight: 'none' }}>Matched Purchase Orders</div>
                    <div className="saas-excel-label" style={{ width: '50px', borderRight: 'none' }}>Action</div>
                </div>

                {products.map((prod) => (
                    <div key={prod.id} className="saas-excel-data-row" style={{ minHeight: '50px' }}>
                        <div className="saas-excel-cell" style={{ width: '200px' }} data-label="Brand">
                            {(() => {
                                // 1. PRE-FILTER BRANDS FOR THIS ROW (From Registry)
                                const currentVendor = (prod.vendorName || '').trim().toLowerCase();
                                const currentProduct = (prod.productName || '').trim().toLowerCase();
                                let brandsForThisRow = [];
                                
                                if (currentVendor || currentProduct) {
                                    brandsForThisRow = registry
                                        .filter(r => 
                                            (!currentVendor || r.vendorName.trim().toLowerCase().includes(currentVendor)) &&
                                            (!currentProduct || (r.productName || '').trim().toLowerCase().includes(currentProduct))
                                        )
                                        .map(r => r.brandName);
                                }
                                
                                if (brandsForThisRow.length === 0) {
                                    brandsForThisRow = Array.from(new Set(registry.map(r => r.brandName)));
                                }
                                
                                const brandItems = Array.from(new Set(brandsForThisRow)).map(b => ({ id: b, name: b }));

                                return (
                                    <GenericAutocomplete 
                                        placeholder="Brand..." 
                                        items={brandItems}
                                        value={prod.brandName} 
                                        onChange={v => updateProduct(prod.id, { brandName: v })}
                                        onSelect={b => {
                                            // SMART AUTO-FILL: Check if selecting this brand narrows down vendor/product
                                            const matches = registry.filter(r => r.brandName.trim().toLowerCase() === b.name.trim().toLowerCase());
                                            if (matches.length === 1) {
                                                updateProduct(prod.id, { brandName: b.name, vendorName: matches[0].vendorName, productName: matches[0].productName || '' });
                                            } else {
                                                updateProduct(prod.id, { brandName: b.name });
                                            }
                                        }}
                                    />
                                );
                            })()}
                        </div>
                        <div className="saas-excel-cell" style={{ width: '200px' }} data-label="Product / Item">
                            {(() => {
                                // 2. PRE-FILTER PRODUCTS FOR THIS ROW (From Registry)
                                const currentVendor = (prod.vendorName || '').trim().toLowerCase();
                                const currentBrand = (prod.brandName || '').trim().toLowerCase();
                                let productsForThisRow = [];

                                if (currentVendor || currentBrand) {
                                    productsForThisRow = registry
                                        .filter(r => 
                                            (!currentVendor || r.vendorName.trim().toLowerCase().includes(currentVendor)) &&
                                            (!currentBrand || r.brandName.trim().toLowerCase().includes(currentBrand))
                                        )
                                        .map(r => r.productName || '');
                                }

                                if (productsForThisRow.length === 0 || (productsForThisRow.length === 1 && !productsForThisRow[0])) {
                                    productsForThisRow = Array.from(new Set(registry.map(r => r.productName || '')));
                                }

                                const productItems = Array.from(new Set(productsForThisRow.filter(p => !!p))).map(p => ({ id: p, name: p }));

                                return (
                                    <GenericAutocomplete 
                                        placeholder="Product..." 
                                        items={productItems}
                                        value={prod.productName} 
                                        onChange={v => updateProduct(prod.id, { productName: v })}
                                        onSelect={p => {
                                            // SMART AUTO-FILL: Check if selecting this product narrows down vendor/brand
                                            const matches = registry.filter(r => (r.productName || '').trim().toLowerCase() === p.name.trim().toLowerCase());
                                            if (matches.length === 1) {
                                                updateProduct(prod.id, { productName: p.name, vendorName: matches[0].vendorName, brandName: matches[0].brandName });
                                            } else {
                                                updateProduct(prod.id, { productName: p.name });
                                            }
                                        }}
                                    />
                                );
                            })()}
                        </div>
                        <div className="saas-excel-cell" style={{ width: '200px' }} data-label="Linked Vendor">
                            {(() => {
                                // 3. PRE-FILTER VENDORS FOR THIS ROW (From Registry)
                                const currentBrand = (prod.brandName || '').trim().toLowerCase();
                                const currentProduct = (prod.productName || '').trim().toLowerCase();
                                let vendorsForThisRow = [];

                                if (currentBrand || currentProduct) {
                                    vendorsForThisRow = registry
                                        .filter(r => 
                                            (!currentBrand || r.brandName.trim().toLowerCase().includes(currentBrand)) &&
                                            (!currentProduct || (r.productName || '').trim().toLowerCase().includes(currentProduct))
                                        )
                                        .map(r => r.vendorName);
                                }

                                if (vendorsForThisRow.length === 0) {
                                    vendorsForThisRow = Array.from(new Set(registry.map(r => r.vendorName)));
                                }

                                const vendorItems = Array.from(new Set(vendorsForThisRow)).map(v => ({ id: v, name: v }));

                                return (
                                    <GenericAutocomplete 
                                        placeholder="Vendor..." 
                                        items={vendorItems}
                                        value={prod.vendorName} 
                                        onChange={v => updateProduct(prod.id, { vendorName: v })}
                                        onSelect={s => {
                                            // SMART AUTO-FILL: Check if selecting this vendor narrows down brand/product
                                            const matches = registry.filter(r => r.vendorName.trim().toLowerCase() === s.name.trim().toLowerCase());
                                            if (matches.length === 1) {
                                                updateProduct(prod.id, { vendorName: s.name, brandName: matches[0].brandName, productName: matches[0].productName || '' });
                                            } else {
                                                updateProduct(prod.id, { vendorName: s.name });
                                            }
                                        }}
                                    />
                                );
                            })()}
                        </div>
                        <div className="saas-excel-cell" style={{ width: '100px' }} data-label="Quantity">
                            <input className="saas-input-box" type="number" placeholder="0.00" value={prod.quantity} onChange={e => updateProduct(prod.id, { quantity: e.target.value })} />
                        </div>
                        <div className="saas-excel-cell" style={{ width: '120px' }} data-label="Unit">
                            <div style={{ position: 'relative', width: '100%' }}>
                                <select className="saas-input-box" style={{ appearance: 'auto' }} value={globalUnits.includes(prod.unit) ? prod.unit : 'custom'} onChange={e => updateProduct(prod.id, { unit: e.target.value === 'custom' ? '' : e.target.value })}>
                                    <option value="">Select Unit</option>
                                    {globalUnits.map(u => <option key={u} value={u}>{u}</option>)}
                                    <option value="custom">+ Type Manual</option>
                                </select>
                                {!globalUnits.includes(prod.unit) && prod.unit !== '' && (
                                    <input className="saas-input-box" style={{ marginTop: '4px' }} placeholder="Custom Unit..." value={prod.unit} onChange={e => updateProduct(prod.id, { unit: e.target.value })} />
                                )}
                            </div>
                        </div>
                        <div className="saas-excel-cell" style={{ flex: 1, borderRight: 'none', background: '#f8fafc', fontSize: '0.75rem', paddingLeft: '1rem' }} data-label="Matched POs">
                            {matchedPOs.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {matchedPOs.map(po => (
                                        <span key={po.id} style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', border: '1px solid #bae6fd', fontWeight: 'bold' }}>
                                            {po.poNumber}
                                        </span>
                                    ))}
                                </div>
                            ) : <span style={{ color: '#94a3b8' }}>No matches found</span>}
                        </div>
                        <div className="saas-excel-cell" style={{ width: '50px', borderRight: 'none', justifyContent: 'center' }} data-label="Remove">
                            <button onClick={() => removeProduct(prod.id)} style={{ border: 'none', background: 'none', color: '#fca5a5', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}

                <div style={{ padding: '10px 15px', background: '#f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                    <button onClick={addProduct} className="btn btn-outline" style={{ background: 'white', fontSize: '0.8rem' }}>
                        + Add Another Product
                    </button>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                        {products.length} Products being checked in
                    </div>
                </div>
            </div>

            {/* Finalize Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button 
                    disabled={submitting || products.some(p => !p.brandName || !p.quantity)}
                    onClick={handleFinalize}
                    className="btn btn-primary" 
                    style={{ background: 'var(--color-accent-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem' }}
                >
                    <CheckCircle size={18} /> {submitting ? "Finalizing..." : "Finalize & Record Check-In"}
                </button>
            </div>

            {/* Daily Check-In History Ledger */}
            <div className="saas-ledger-card" style={{ marginTop: '2rem' }}>
                <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Package size={18} style={{ color: 'var(--color-accent-blue)' }} />
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--color-accent-blue)' }}>Today's Check-In Ledger</h3>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{history.length} RECORDS FOUND</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 800 }}>LR #</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 800 }}>Items Received</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 800 }}>Matched POs</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800 }}>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                        No check-ins recorded today.
                                    </td>
                                </tr>
                            ) : (
                                [...history].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(entry => (
                                    <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--color-accent-blue)' }} data-label="LR Number">{entry.lrNumber || 'N/A'}</td>
                                        <td style={{ padding: '0.75rem 1rem' }} data-label="Items Received">
                                            {entry.items?.map((it, idx) => (
                                                <div key={idx} style={{ fontSize: '0.75rem', marginBottom: '2px' }}>
                                                    <strong>{it.quantity} {it.unit}</strong> — {it.brandName} {it.productName}
                                                </div>
                                            ))}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }} data-label="Matched POs">
                                            {entry.matchedPOs?.map(po => (
                                                <span key={po} style={{ display: 'inline-block', background: '#f0fdf4', color: '#166534', padding: '1px 6px', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid #dcfce7', marginRight: '4px' }}>
                                                    {po}
                                                </span>
                                            ))}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#64748b', fontSize: '0.75rem' }} data-label="Time">
                                            {entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
        </div>
    );
}
