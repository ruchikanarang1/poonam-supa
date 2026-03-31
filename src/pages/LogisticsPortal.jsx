import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
    getFormConfig, addLogisticsEntry, getPurchaseOrders, 
    linkEntryToPurchaseOrder, getLogisticsEntries, updateLogisticsEntry,
    getSuppliers, getTransports 
} from '../lib/db';
import { Truck, FileText, Plus, Calendar, Trash2, CheckCircle, AlertCircle, Send, MapPin, UserPlus, Save, LayoutGrid, Clock } from 'lucide-react';
import GenericAutocomplete from '../components/GenericAutocomplete';

export default function LogisticsPortal({ type, title }) {
    const { currentUser, userData, isAdmin, currentCompanyId } = useAuth();
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' or 'pending'
    
    // Form State
    const [formData, setFormData] = useState({
        lr_number: '', date: '', time: '', vendor_name: '', transport_company: '', location: '', linkedPoId: '',
        opened: false
    });
    const [dynamicData, setDynamicData] = useState({});
    const [lots, setLots] = useState([{ id: Date.now(), lot_size: '', isShort: false, backlogQty: '', lotVendor: '', showVendor: false }]);
    
    // Data State
    const [allEntries, setAllEntries] = useState([]);
    const [openPOs, setOpenPOs] = useState([]);
    const [todayDateStr, setTodayDateStr] = useState('');
    const [todayDayStr, setTodayDayStr] = useState('');

    const roles = userData?.roles || [];
    const hasAccess = isAdmin || roles.includes(type);

    useEffect(() => {
        if (hasAccess && currentCompanyId) {
            loadInitialData();
            const now = new Date();
            setTodayDateStr(now.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }));
            setTodayDayStr(now.toLocaleDateString('en-US', { weekday: 'long' }));
        }
    }, [type, hasAccess, currentCompanyId]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [config, entriesData, pos] = await Promise.all([
                getFormConfig(currentCompanyId, type),
                getLogisticsEntries(currentCompanyId, type),
                getPurchaseOrders(currentCompanyId)
            ]);

            setFields(config);
            setAllEntries(entriesData);
            setOpenPOs(pos.filter(p => p.status !== 'received'));

            // Initial Fixed Data
            const now = new Date();
            setFormData({
                lr_number: '',
                date: now.toISOString().split('T')[0],
                time: now.toTimeString().split(' ')[0].substring(0, 5),
                vendor_name: '',
                transport_company: '',
                location: '',
                linkedPoId: '',
                opened: false
            });

            const initialDynamic = {};
            config.forEach(f => {
                const fixedIds = ['lr_number', 'date', 'time', 'vendor_name', 'transport_company', 'location'];
                if (!fixedIds.includes(f.id)) initialDynamic[f.id] = '';
            });
            setDynamicData(initialDynamic);

        } catch (err) {
            console.error('Failed to load initial data', err);
        } finally {
            setLoading(false);
        }
    };

    const addLot = () => setLots([...lots, { id: Date.now() + Math.random(), lot_size: '', isShort: false, backlogQty: '', lotVendor: '', showVendor: false }]);
    const removeLot = (id) => lots.length > 1 && setLots(lots.filter(l => l.id !== id));
    const updateLot = (id, updates) => setLots(lots.map(l => l.id === id ? { ...l, ...updates } : l));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {
            const isPending = type === 'transport' && lots.some(l => l.isShort);
            const selectedPo = openPOs.find(p => p.id === formData.linkedPoId);
            
            const entryData = {
                ...formData, 
                ...dynamicData, 
                type, 
                status: isPending ? 'pending' : 'resolved',
                linkedPoNumber: selectedPo ? selectedPo.poNumber : '',
                submittedBy: currentUser?.uid || 'guest', 
                submittedByName: userData?.displayName || 'Guest',
                createdAt: new Date().toISOString()
            };
            if (type === 'transport') entryData.lots = lots.map(({ id, showVendor, ...rest }) => rest);
            const docRef = await addLogisticsEntry(currentCompanyId, type, entryData);
            if (formData.linkedPoId && docRef?.id) await linkEntryToPurchaseOrder(currentCompanyId, formData.linkedPoId, type, docRef.id);
            alert(`${title} Recorded!`);
            loadInitialData();
            setLots([{ id: Date.now(), lot_size: '', isShort: false, backlogQty: '', lotVendor: '', showVendor: false }]);
        } catch (err) { console.error(err); alert("Error: " + err.message); }
        finally { setSubmitting(false); }
    };

    const handleReconcile = async (entry) => {
        if (!isAdmin || !window.confirm("Resolve backlog?")) return;
        try {
            await updateLogisticsEntry(currentCompanyId, type, entry.id, { status: 'resolved', reconciledAt: new Date().toISOString() });
            loadInitialData();
        } catch (err) { console.error(err); }
    };

    if (!currentUser) return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}><p>Please log in.</p></div>;
    if (!hasAccess) return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'red' }}>Access Denied</h2></div>;
    if (loading) return <div className="container" style={{ padding: '2rem' }}><p>Loading...</p></div>;

    const todayStr = new Date().toISOString().split('T')[0];
    const filteredEntries = activeTab === 'ledger' 
        ? allEntries.filter(e => e.createdAt && e.createdAt.startsWith(todayStr))
        : allEntries.filter(e => e.status === 'pending');

    return (
        <div className="container" style={{ padding: '0.25rem 0' }}>
            {/* Theme Style Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ background: 'var(--color-accent-blue)', color: 'white', padding: '0.4rem', borderRadius: '4px' }}>
                        {type === 'transport' ? <Truck size={18} /> : <FileText size={18} />}
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--color-accent-blue)' }}>{title}</h2>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2px' }}>
                            <button onClick={() => setActiveTab('ledger')} className={`portal-tab ${activeTab === 'ledger' ? 'active' : ''}`} style={{ fontSize: '0.7rem', padding: '1px 6px' }}>Ledger</button>
                            <button onClick={() => setActiveTab('pending')} className={`portal-tab ${activeTab === 'pending' ? 'active' : ''}`} style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                                Pending {allEntries.filter(e => e.status === 'pending').length > 0 && <span style={{ background: 'var(--color-accent-orange)', color: 'white', padding: '0px 4px', borderRadius: '4px', marginLeft: '2px' }}>{allEntries.filter(e => e.status === 'pending').length}</span>}
                            </button>
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                    <strong>{todayDayStr}</strong>, {todayDateStr}
                </div>
            </div>

            {/* Rearranged & Themed Excel Form */}
            {activeTab === 'ledger' && (
                <div className="saas-excel-container">
                    <form onSubmit={handleSubmit}>
                        <div className="saas-form-row-scroll">
                            {/* Header Row - Arranged: LR# | Transport | Vendor | Location | Date/Time | Action */}
                            <div className="saas-excel-header">
                                <div className="saas-excel-label excel-column-lr">LR Number</div>
                                <div className="saas-excel-label excel-column-flexible">Transport Co</div>
                                <div className="saas-excel-label excel-column-flexible">Vendor / Supplier</div>
                                <div className="saas-excel-label excel-column-location">Location</div>
                                <div className="saas-excel-label excel-column-datetime">Date & Time</div>
                                <div className="saas-excel-label excel-column-action" style={{ borderRight: 'none', textAlign: 'center' }}>Save</div>
                            </div>

                            {/* Main Entry Row */}
                            <div className="saas-excel-data-row">
                                <div className="saas-excel-cell excel-column-lr">
                                    <input required className="saas-input-box" placeholder="LR#" value={formData.lr_number} onChange={e => setFormData({...formData, lr_number: e.target.value})} />
                                </div>
                                <div className="saas-excel-cell excel-column-flexible">
                                    <GenericAutocomplete 
                                        placeholder="Transport Search..." 
                                        fetchData={() => getTransports(currentCompanyId)} 
                                        iconType="truck"
                                        value={formData.transport_company} onChange={v => setFormData({...formData, transport_company: v})}
                                        onSelect={t => setFormData({...formData, transport_company: t.name})}
                                    />
                                </div>
                                <div className="saas-excel-cell excel-column-flexible">
                                    <GenericAutocomplete 
                                        placeholder="Vendor Search..." 
                                        fetchData={() => getSuppliers(currentCompanyId)} 
                                        iconType="vendor"
                                        value={formData.vendor_name} onChange={v => setFormData({...formData, vendor_name: v})}
                                        onSelect={s => setFormData({...formData, vendor_name: s.name, location: s.address || formData.location})}
                                    />
                                </div>
                                <div className="saas-excel-cell excel-column-location">
                                    <input className="saas-input-box" placeholder="Auto-filled..." value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                                </div>
                                <div className="saas-excel-cell excel-column-datetime">
                                    <div style={{ display: 'flex', gap: '2px', width: '100%' }}>
                                        <input type="date" required className="saas-input-box" style={{ flex: 1.5, fontSize: '0.7rem' }} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                        <input type="time" required className="saas-input-box" style={{ flex: 1, fontSize: '0.7rem' }} value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                                    </div>
                                </div>
                                <div className="saas-excel-cell excel-column-action" style={{ borderRight: 'none', justifyContent: 'center', gap: '8px' }}>
                                    <button type="submit" className="btn btn-primary" style={{ height: '32px', width: '32px', padding: 0, background: 'var(--color-accent-blue)', border: 'none' }} disabled={submitting}>
                                        <Save size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Status & Linking Row (Always Visible) */}
                            <div style={{ 
                                display: 'flex', background: '#f8fafc', padding: '8px 12px', 
                                borderBottom: '1px solid var(--color-border)', minWidth: '900px', 
                                flexWrap: 'wrap', gap: '2rem', alignItems: 'center' 
                            }}>
                                {/* Opened Status */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '2px solid #e2e8f0', paddingRight: '1.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: formData.opened ? 'var(--color-accent-blue)' : '#64748b' }}>
                                        OPENED?
                                    </span>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.opened} 
                                        onChange={e => setFormData({ ...formData, opened: e.target.checked })} 
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                                    />
                                </div>

                                {/* Purchase Order Linking */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff9e6', padding: '4px 12px', borderRadius: '6px', border: '1px solid #ffe58f' }}>
                                    <span className="saas-lot-label-tiny" style={{ color: '#856404', fontWeight: '800' }}>LINK TO PURCHASE ORDER:</span>
                                    {openPOs.length > 0 ? (
                                        <select 
                                            className="saas-input-box" 
                                            style={{ width: '150px', height: '28px', border: '1px solid #ffe58f', borderRadius: '4px', background: 'white', fontWeight: 600, fontSize: '0.75rem' }} 
                                            value={formData.linkedPoId} 
                                            onChange={e => {
                                                const poId = e.target.value;
                                                const selectedPo = openPOs.find(p => p.id === poId);
                                                if (selectedPo) {
                                                    setFormData({
                                                        ...formData,
                                                        linkedPoId: poId,
                                                        vendor_name: selectedPo.vendor || formData.vendor_name,
                                                        location: selectedPo.location || formData.location
                                                    });
                                                } else {
                                                    setFormData({...formData, linkedPoId: poId});
                                                }
                                            }}
                                        >
                                            <option value="">— Select PO —</option>
                                            {openPOs.map(po => <option key={po.id} value={po.id}>{po.poNumber} ({po.vendor || 'No Vendor'})</option>)}
                                        </select>
                                    ) : (
                                        <span style={{ fontSize: '0.7rem', color: '#b8a03a', fontStyle: 'italic' }}>No Open POs Available</span>
                                    )}
                                </div>

                                {/* Dynamic Fields */}
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    {fields.map(f => {
                                        const fixedIds = ['lr_number', 'date', 'time', 'vendor_name', 'transport_company', 'location'];
                                        if (fixedIds.includes(f.id)) return null;
                                        return (
                                            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span className="saas-lot-label-tiny" style={{ fontWeight: '700' }}>{f.label.toUpperCase()}:</span>
                                                <input required={f.required} type={f.type} className="saas-input-box" style={{ width: '110px', height: '28px' }} value={dynamicData[f.id]} onChange={e => setDynamicData({...dynamicData, [f.id]: e.target.value})} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Lot Spreadsheet - Arranged Rows */}
                            {type === 'transport' && (
                                <div style={{ background: '#fff' }}>
                                    <div style={{ padding: '4px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f4f5f7', borderBottom: '1px solid var(--color-border)' }}>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--color-accent-blue)', letterSpacing: '0.05em' }}>LOT DETAILS</span>
                                        <button type="button" onClick={addLot} className="btn btn-outline" style={{ padding: '0 8px', fontSize: '0.65rem', height: '20px' }}>+ New Row</button>
                                    </div>
                                    {lots.map(lot => (
                                        <div key={lot.id} className="saas-lot-row">
                                            <div style={{ width: '120px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span className="saas-lot-label-tiny">SIZE:</span>
                                                <input required className="saas-input-box" style={{ height: '26px' }} value={lot.lot_size} onChange={e => updateLot(lot.id, { lot_size: e.target.value })} />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input type="checkbox" checked={lot.isShort} onChange={e => updateLot(lot.id, { isShort: e.target.checked })} />
                                                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: lot.isShort ? 'var(--color-accent-orange)' : 'inherit' }}>SHORT?</span>
                                            </div>
                                            <div style={{ width: '120px' }}>
                                                {lot.isShort && <input required placeholder="Short Qty" className="saas-input-box" style={{ height: '26px', borderColor: 'var(--color-accent-orange)' }} value={lot.backlogQty} onChange={e => updateLot(lot.id, { backlogQty: e.target.value })} />}
                                            </div>
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <input type="checkbox" style={{ width: '14px', height: '14px' }} checked={lot.showVendor} onChange={e => updateLot(lot.id, { showVendor: e.target.checked })} />
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>OTHER VENDOR?</span>
                                                </div>
                                                {lot.showVendor && (
                                                    <div style={{ flex: 1 }}>
                                                        <GenericAutocomplete 
                                                            placeholder="Override supplier..." 
                                                            fetchData={() => getSuppliers(currentCompanyId)}
                                                            value={lot.lotVendor} onChange={v => updateLot(lot.id, { lotVendor: v })}
                                                            onSelect={s => updateLot(lot.id, { lotVendor: s.name })}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <button type="button" onClick={() => removeLot(lot.id)} style={{ border: 'none', background: 'none', color: '#888', cursor: 'pointer' }} disabled={lots.length === 1}><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* Ledger Table (Below) */}
            <div className="saas-ledger-card">
                <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--color-border)', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'var(--color-accent-blue)' }}>
                        {activeTab === 'ledger' ? "Today's Entries" : "Backlog Tracking"}
                    </h3>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)' }}>{filteredEntries.length} items</div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table className="daily-entries-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                <th className="saas-table-header" style={{ width: '100px' }}>LR</th>
                                <th className="saas-table-header">Vendor</th>
                                <th className="saas-table-header">Transport</th>
                                <th className="saas-table-header">Lots</th>
                                <th className="saas-table-header" style={{ width: '120px' }}>Remaining</th>
                                <th className="saas-table-header" style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEntries.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#999', fontStyle: 'italic' }}>No records found.</td></tr>
                            ) : (
                                filteredEntries.map(entry => (
                                    <tr key={entry.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                        <td style={{ padding: '0.5rem 1rem' }}>
                                            <div style={{ fontWeight: '700' }}>{entry.lr_number}</div>
                                            {entry.linkedPoNumber && (
                                                <div style={{ fontSize: '0.65rem', color: '#856404', background: '#fff9e6', padding: '1px 4px', borderRadius: '3px', display: 'inline-block', marginTop: '2px', border: '1px solid #ffe58f' }}>
                                                    🔗 {entry.linkedPoNumber}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.5rem 1rem', fontWeight: '600' }}>{entry.vendor_name}</td>
                                        <td style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#888' }}>{entry.transport_company}</td>
                                        <td style={{ padding: '0.5rem 1rem' }}>
                                            {(entry.lots || []).map((l, i) => (
                                                <div key={i} style={{ fontSize: '0.75rem', display: 'flex', gap: '4px' }}>
                                                    <span>{l.lot_size}</span>
                                                    {l.lotVendor && <span style={{ color: '#aaa', fontStyle: 'italic' }}>({l.lotVendor})</span>}
                                                </div>
                                            ))}
                                            {!entry.lots?.length && '-'}
                                        </td>
                                        <td style={{ padding: '0.5rem 1rem' }}>
                                            {(() => {
                                                const totalShort = (entry.lots || []).reduce((acc, l) => acc + (parseFloat(l.backlogQty) || 0), 0);
                                                return totalShort > 0 
                                                    ? <span style={{ color: 'var(--color-accent-orange)', fontWeight: 700 }}>{totalShort} items</span>
                                                    : <span style={{ color: '#2ecc71', fontWeight: 600 }}>-</span>;
                                            })()}
                                        </td>
                                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>
                                            {isAdmin && entry.status === 'pending' && (
                                                <button className="btn btn-primary" style={{ padding: '2px 8px', fontSize: '0.65rem', background: 'var(--color-accent-blue)', border: 'none' }} onClick={() => handleReconcile(entry)}>Resolve</button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Statistics Footer */}
                <div style={{ 
                    padding: '0.75rem 1.5rem', background: '#fdfdfd', borderTop: '1px solid var(--color-border)', 
                    display: 'flex', gap: '2rem', fontSize: '0.85rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--color-text-light)', fontWeight: 500 }}>Total Lots Received:</span>
                        <strong style={{ color: 'var(--color-accent-blue)', fontSize: '1rem' }}>
                            {filteredEntries.reduce((acc, entry) => acc + (entry.lots || []).reduce((lAcc, l) => lAcc + (parseFloat(l.lot_size) || 0), 0), 0).toLocaleString()}
                        </strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--color-text-light)', fontWeight: 500 }}>Total Lots Pending:</span>
                        <strong style={{ color: 'var(--color-accent-orange)', fontSize: '1rem' }}>
                            {filteredEntries.reduce((acc, entry) => acc + (entry.lots || []).reduce((lAcc, l) => lAcc + (parseFloat(l.backlogQty) || 0), 0), 0).toLocaleString()}
                        </strong>
                    </div>
                </div>
            </div>
        </div>
    );
}
