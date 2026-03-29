import React, { useState, useEffect } from 'react';
import { getLogisticsEntries } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { Download, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Reconciliation() {
    const { loginForAdminExport } = useAuth();
    const [transports, setTransports] = useState([]);
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending_transport');
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [tData, bData] = await Promise.all([
                getLogisticsEntries('transport'),
                getLogisticsEntries('bills')
            ]);
            setTransports(tData);
            setBills(bData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Reconciliation Logic (Based on lr_number)
    const billLrs = new Set(bills.map(b => (b.lr_number || '').toString().trim().toLowerCase()));
    const transportLrs = new Set(transports.map(t => (t.lr_number || '').toString().trim().toLowerCase()));

    const pendingTransports = transports.filter(t => !billLrs.has((t.lr_number || '').toString().trim().toLowerCase()));
    const pendingBills = bills.filter(b => !transportLrs.has((b.lr_number || '').toString().trim().toLowerCase()));
    const matchedTransports = transports.filter(t => billLrs.has((t.lr_number || '').toString().trim().toLowerCase()));

    const handleOpenGoogleSheets = async () => {
        // Build export payload based on active tab
        let dataToExport = [];
        let sheetTitle = "";

        if (activeTab === 'pending_transport') {
            dataToExport = pendingTransports;
            sheetTitle = "Pending Transports";
        } else if (activeTab === 'pending_bills') {
            dataToExport = pendingBills;
            sheetTitle = "Pending Bills";
        } else {
            dataToExport = matchedTransports;
            sheetTitle = "Matched Logistics";
        }

        if (dataToExport.length === 0) return alert("No data to export for this view.");

        let newTab = window.open('about:blank', '_blank');
        if (newTab) {
            newTab.document.write(`<h3 style='font-family:sans-serif; text-align:center; margin-top:50px;'>Exporting ${dataToExport.length} ${sheetTitle} to Google Sheets...</h3>`);
        }

        try {
            setExporting(true);
            const token = await loginForAdminExport();
            if (!token) throw new Error("Could not retrieve Google access token");

            const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ properties: { title: `Poonam Steel - ${sheetTitle} (${new Date().toLocaleDateString()})` } })
            });

            const createData = await createRes.json();
            if (!createRes.ok) {
                if (newTab && !newTab.closed) newTab.close();
                throw new Error("Failed to create spreadsheet");
            }

            // Extract all unique headers from dynamic objects
            const allKeys = new Set();
            dataToExport.forEach(row => Object.keys(row).forEach(k => {
                if (k !== 'id') allKeys.add(k);
            }));
            const headers = Array.from(allKeys);

            const values = [
                headers.map(h => h.replace(/_/g, ' ').toUpperCase()), // Format headers nicely
                ...dataToExport.map(row => headers.map(h => (row[h] !== undefined && row[h] !== null) ? String(row[h]) : ''))
            ];

            const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${createData.spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ range: 'A1', majorDimension: "ROWS", values: values })
            });

            if (!updateRes.ok) throw new Error("Failed to populate data");

            if (newTab && !newTab.closed) {
                newTab.location.href = createData.spreadsheetUrl;
            } else {
                prompt("Spreadsheet created! Browser blocked redirect, copy this link:", createData.spreadsheetUrl);
            }

        } catch (err) {
            console.error(err);
            if (newTab && !newTab.closed) newTab.close();
            alert("Error exporting: " + err.message);
        } finally {
            setExporting(false);
        }
    };

    if (loading) return <p>Loading logistics data...</p>;

    const renderTable = (dataLabel, items) => {
        if (items.length === 0) return <p style={{ color: 'var(--color-primary)' }}><CheckCircle2 size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> No {dataLabel} found! Excellent.</p>;

        const allKeys = new Set();
        items.forEach(row => Object.keys(row).forEach(k => {
            if (k !== 'id' && k !== 'createdAt') allKeys.add(k);
        }));
        const headers = Array.from(allKeys);

        return (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                            <th style={{ padding: '0.5rem' }}>Date Entered</th>
                            {headers.map(h => <th key={h} style={{ padding: '0.5rem', textTransform: 'capitalize' }}>{h.replace(/_/g, ' ')}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--color-secondary)' }}>
                                <td style={{ padding: '0.75rem 0.5rem', whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'gray' }}>
                                    {new Date(item.createdAt).toLocaleString()}
                                </td>
                                {headers.map(h => (
                                    <td key={h} style={{ padding: '0.75rem 0.5rem' }}>
                                        {item[h]?.toString() || '-'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                <h3 style={{ color: 'var(--color-accent-blue)' }}>Logistics Reconciliation</h3>
                <button
                    onClick={handleOpenGoogleSheets}
                    disabled={exporting}
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#0f9d58', color: 'white', border: 'none' }}
                >
                    <Download size={16} /> Open {activeTab.replace('_', ' ')} in Sheets
                </button>
            </div>

            <p style={{ marginBottom: 'var(--spacing-lg)', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
                The system automatically matches Transports to Bills using their <strong>LR Number</strong>. Items below are missing their matching pair.
            </p>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                <button
                    className={`btn ${activeTab === 'pending_transport' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('pending_transport')}
                    style={{ position: 'relative' }}
                >
                    Pending Transports (No Bill)
                    {pendingTransports.length > 0 && <span style={{ background: '#ff4444', color: 'white', borderRadius: '12px', padding: '2px 6px', fontSize: '0.7rem', marginLeft: '0.5rem' }}>{pendingTransports.length}</span>}
                </button>
                <button
                    className={`btn ${activeTab === 'pending_bills' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('pending_bills')}
                    style={{ position: 'relative' }}
                >
                    Pending Bills (No Transport)
                    {pendingBills.length > 0 && <span style={{ background: '#ff4444', color: 'white', borderRadius: '12px', padding: '2px 6px', fontSize: '0.7rem', marginLeft: '0.5rem' }}>{pendingBills.length}</span>}
                </button>
                <button
                    className={`btn ${activeTab === 'cleared' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('cleared')}
                >
                    Cleared / Matched Pairs
                </button>
            </div>

            {activeTab === 'pending_transport' && renderTable('Pending Transports', pendingTransports)}
            {activeTab === 'pending_bills' && renderTable('Pending Bills', pendingBills)}
            {activeTab === 'cleared' && renderTable('Cleared Matches', matchedTransports)}

        </div>
    );
}
