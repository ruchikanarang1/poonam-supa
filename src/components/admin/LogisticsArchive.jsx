import React, { useState, useEffect } from 'react';
import { getLogisticsEntriesInRange, getGoodsCheckInEntries } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { Download, Calendar, Search, Package, FileText, Truck } from 'lucide-react';

export default function LogisticsArchive() {
    const { loginForAdminExport, currentCompanyId, companies } = useAuth();
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    
    // Filters
    const [type, setType] = useState('transport'); // transport, bills, check_in
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');

    // Data
    const [records, setRecords] = useState([]);

    const activeCompany = companies.find(c => c.id === currentCompanyId);

    useEffect(() => {
        if (currentCompanyId) loadData();
    }, [currentCompanyId, type, startDate, endDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            let data = [];
            if (type === 'check_in') {
                const all = await getGoodsCheckInEntries(currentCompanyId);
                data = all.filter(entry => {
                    const d = entry.createdAt?.split('T')[0];
                    return d >= startDate && d <= endDate;
                });
            } else {
                data = await getLogisticsEntriesInRange(currentCompanyId, type, startDate, endDate);
            }
            setRecords(data.reverse());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredRecords = records.filter(r => {
        const q = searchQuery.toLowerCase();
        return (
            (r.lr_number?.toLowerCase().includes(q)) ||
            (r.lrNumber?.toLowerCase().includes(q)) ||
            (r.vendor_name?.toLowerCase().includes(q)) ||
            (r.transport_company?.toLowerCase().includes(q)) ||
            (r.items?.some(it => 
                it.brandName?.toLowerCase().includes(q) || 
                it.productName?.toLowerCase().includes(q)
            ))
        );
    });

    const handleGoogleExport = async () => {
        if (filteredRecords.length === 0) return alert("No data to export.");
        
        let newTab = window.open('about:blank', '_blank');
        if (newTab) {
            newTab.document.write(`<h3 style='font-family:sans-serif; text-align:center; margin-top:50px;'>Exporting ${filteredRecords.length} records to Google Sheets...</h3>`);
        }

        try {
            setExporting(true);
            const token = await loginForAdminExport();
            if (!token) throw new Error("Could not retrieve Google access token");

            const sheetTitle = `Logistics Archive (${type.toUpperCase()}) - ${startDate} to ${endDate}`;
            
            const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ properties: { title: `${activeCompany?.name || 'ERP'} - ${sheetTitle}` } })
            });

            const createData = await createRes.json();
            if (!createRes.ok) throw new Error("Failed to create spreadsheet");

            // Build Values
            let headers = [];
            let rows = [];

            if (type === 'check_in') {
                headers = ["Date", "LR Number", "Items Received", "Matched POs", "Created At"];
                rows = filteredRecords.map(r => [
                    r.createdAt?.split('T')[0] || '-',
                    r.lrNumber || '-',
                    r.items?.map(it => `${it.quantity} ${it.unit} - ${it.brandName} ${it.productName}`).join('; ') || '-',
                    r.matchedPOs?.join(', ') || '-',
                    r.createdAt || '-'
                ]);
            } else {
                headers = ["Date", "LR Number", "Vendor", "Transport", "Location", "Linked PO"];
                rows = filteredRecords.map(r => [
                    r.date || '-',
                    r.lr_number || '-',
                    r.vendor_name || '-',
                    r.transport_company || '-',
                    r.location || '-',
                    r.linkedPoNumber || '-'
                ]);
            }

            const values = [headers, ...rows];

            await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${createData.spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ range: 'A1', majorDimension: "ROWS", values: values })
            });

            if (newTab && !newTab.closed) {
                newTab.location.href = createData.spreadsheetUrl;
            }
        } catch (err) {
            console.error(err);
            if (newTab && !newTab.closed) newTab.close();
            alert("Export failed: " + err.message);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--color-accent-blue)', color: 'white', padding: '0.5rem', borderRadius: '8px' }}>
                        <Calendar size={20} />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--color-accent-blue)' }}>Master Logistics Archive</h2>
                </div>
                <button 
                    onClick={handleGoogleExport}
                    disabled={exporting || loading}
                    className="btn btn-secondary" 
                    style={{ background: '#0f9d58', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Google Sheets'}
                </button>
            </div>

            {/* Filter Bar */}
            <div style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' 
            }}>
                <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '4px' }}>LOGISTICS CATEGORY</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                            { id: 'transport', label: 'Transports', icon: Truck },
                            { id: 'bills', label: 'Bills', icon: FileText },
                            { id: 'check_in', label: 'Check-In', icon: Package }
                        ].map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => setType(cat.id)}
                                style={{ 
                                    flex: 1, padding: '6px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '4px', border: '1px solid #cbd5e1',
                                    background: type === cat.id ? 'var(--color-accent-blue)' : 'white',
                                    color: type === cat.id ? 'white' : '#475569',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer'
                                }}
                            >
                                <cat.icon size={14} /> {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '4px' }}>FROM DATE</label>
                    <input type="date" className="saas-input-box" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '4px' }}>TO DATE</label>
                    <input type="date" className="saas-input-box" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '4px' }}>SEARCH RECORDS</label>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input 
                            className="saas-input-box" 
                            style={{ paddingLeft: '30px' }} 
                            placeholder="LR, Vendor, Brand..." 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                        />
                    </div>
                </div>
            </div>

            {/* Results Table */}
            <div className="saas-excel-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>LR / Reference</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>
                                {type === 'check_in' ? 'Items Received' : 'Vendor / Details'}
                            </th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>
                                {type === 'check_in' ? 'Matched POs' : 'Linked Data'}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Searching database...</td></tr>
                        ) : filteredRecords.length === 0 ? (
                            <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No records found for this period.</td></tr>
                        ) : (
                            filteredRecords.map(record => (
                                <tr key={record.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                                        <div style={{ fontWeight: 700 }}>{record.date || record.createdAt?.split('T')[0]}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{record.time || (record.createdAt ? new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}</div>
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        <div style={{ fontWeight: 800, color: 'var(--color-accent-blue)' }}>{record.lr_number || record.lrNumber}</div>
                                        {record.transport_company && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{record.transport_company}</div>}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        {type === 'check_in' ? (
                                            record.items?.map((it, i) => (
                                                <div key={i} style={{ fontSize: '0.75rem' }}>{it.quantity} {it.unit} - {it.brandName} {it.productName}</div>
                                            ))
                                        ) : (
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{record.vendor_name}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{record.location}</div>
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        {record.linkedPoNumber && (
                                            <span style={{ display: 'inline-block', background: '#fff9e6', color: '#856404', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid #ffe58f' }}>
                                                🔗 PO: {record.linkedPoNumber}
                                            </span>
                                        )}
                                        {record.matchedPOs?.map(po => (
                                            <span key={po} style={{ display: 'inline-block', background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid #dcfce7', marginRight: '4px' }}>
                                                {po}
                                            </span>
                                        ))}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Summary Stats Bar */}
            {!loading && filteredRecords.length > 0 && (
                <div style={{ 
                    marginTop: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', 
                    border: '1px solid #bae6fd', display: 'flex', gap: '2rem' 
                }}>
                    <div>
                        <span style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: 700, display: 'block' }}>TOTAL RECORDS</span>
                        <strong style={{ fontSize: '1.2rem', color: '#0c4a6e' }}>{filteredRecords.length}</strong>
                    </div>
                </div>
            )}
        </div>
    );
}
