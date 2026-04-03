import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { Download, Archive, CheckCircle2, Loader2, Database } from 'lucide-react';

const TABLES = [
    { key: 'products',              label: 'Products' },
    { key: 'orders',                label: 'Orders' },
    { key: 'logistics_transport',   label: 'Logistics Transport' },
    { key: 'logistics_bills',       label: 'Logistics Bills' },
    { key: 'ticket_categories',     label: 'Ticket Categories' },
    { key: 'tickets',               label: 'Tickets' },
    { key: 'suppliers',             label: 'Suppliers' },
    { key: 'goods_check_in',        label: 'Goods Check-In' },
    { key: 'vendor_brand_registry', label: 'Vendor Brand Registry' },
    { key: 'transports',            label: 'Transports' },
    { key: 'purchase_orders',       label: 'Purchase Orders' },
    { key: 'form_configs',          label: 'Form Configs' },
    { key: 'configs',               label: 'Global Configs' },
];

export default function ExportAll() {
    const { currentCompanyId } = useAuth();
    const [status, setStatus] = useState('idle'); // idle | running | done | error
    const [log, setLog]     = useState([]);
    const [progress, setProgress] = useState(0);

    const appendLog = (msg, type = 'info') =>
        setLog(prev => [...prev, { msg, type, ts: Date.now() }]);

    const flattenValue = (val) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return val;
    };

    const tableToSheet = (rows) => {
        if (!rows || rows.length === 0) return XLSX.utils.aoa_to_sheet([['No data']]);
        const headers = Object.keys(rows[0]);
        const data = rows.map(row => headers.map(h => flattenValue(row[h])));
        return XLSX.utils.aoa_to_sheet([headers, ...data]);
    };

    const handleExport = async () => {
        if (!currentCompanyId) {
            alert('Please select a company first.');
            return;
        }
        if (!window.confirm('This will export ALL data for the current company as a ZIP of Excel files. Continue?')) return;

        setStatus('running');
        setLog([]);
        setProgress(0);

        const zip = new JSZip();
        const folder = zip.folder('ERP_Export');
        let done = 0;

        for (const table of TABLES) {
            appendLog(`Fetching ${table.label}...`);
            try {
                const { data, error } = await supabase
                    .from(table.key)
                    .select('*')
                    .eq('company_id', currentCompanyId);

                if (error) {
                    appendLog(`  ⚠ Skipped (${error.message})`, 'warn');
                } else {
                    const wb = XLSX.utils.book_new();
                    const ws = tableToSheet(data || []);
                    XLSX.utils.book_append_sheet(wb, ws, table.label.substring(0, 31));
                    const xlsxBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
                    folder.file(`${table.key}.xlsx`, xlsxBuffer);
                    appendLog(`  ✓ ${data?.length || 0} rows`, 'success');
                }
            } catch (err) {
                appendLog(`  ✗ Error: ${err.message}`, 'error');
            }

            done++;
            setProgress(Math.round((done / TABLES.length) * 100));
        }

        try {
            appendLog('Compressing into ZIP...');
            const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            a.href     = url;
            a.download = `ERP_Export_${date}.zip`;
            a.click();
            URL.revokeObjectURL(url);
            appendLog('ZIP downloaded successfully!', 'success');
            setStatus('done');
        } catch (err) {
            appendLog(`ZIP generation failed: ${err.message}`, 'error');
            setStatus('error');
        }
    };

    const logColor = { info: '#94a3b8', success: '#22c55e', warn: '#f59e0b', error: '#ef4444' };

    return (
        <div className="card" style={{ maxWidth: '620px', margin: '2rem 0' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#1e293b' }}>
                <Archive size={24} style={{ color: '#3b82f6' }} />
                <div>
                    <h3 style={{ margin: 0 }}>Export All ERP Data</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                        Downloads every table for this company as individual Excel files packed into a ZIP archive.
                    </p>
                </div>
            </div>

            {/* Table list */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
                {TABLES.map(t => (
                    <span key={t.key} style={{
                        background: '#f1f5f9', border: '1px solid #e2e8f0',
                        borderRadius: '6px', padding: '2px 10px', fontSize: '0.75rem', color: '#475569'
                    }}>
                        {t.label}
                    </span>
                ))}
            </div>

            {/* Progress bar */}
            {status === 'running' && (
                <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '6px', marginBottom: '1rem' }}>
                    <div style={{
                        background: '#3b82f6', height: '6px', borderRadius: '999px',
                        width: `${progress}%`, transition: 'width 0.3s ease'
                    }} />
                </div>
            )}

            {/* Log console */}
            {log.length > 0 && (
                <div style={{
                    background: '#0f172a', borderRadius: '0.5rem', padding: '1rem',
                    marginBottom: '1.25rem', maxHeight: '200px', overflowY: 'auto'
                }}>
                    {log.map((entry, i) => (
                        <div key={i} style={{ color: logColor[entry.type] || '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace', lineHeight: 1.6 }}>
                            {entry.msg}
                        </div>
                    ))}
                </div>
            )}

            {/* Action button */}
            {status === 'done' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontWeight: 600 }}>
                    <CheckCircle2 size={20} />
                    Export complete! Check your Downloads folder.
                </div>
            ) : (
                <button
                    onClick={handleExport}
                    disabled={status === 'running' || !currentCompanyId}
                    className="btn btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                    {status === 'running' ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Exporting... {progress}%
                        </>
                    ) : (
                        <>
                            <Download size={18} />
                            Export All Data as ZIP
                        </>
                    )}
                </button>
            )}

            {!currentCompanyId && (
                <p style={{ fontSize: '0.75rem', color: '#ef4444', textAlign: 'center', marginTop: '0.75rem' }}>
                    No company selected. Please select a company to export.
                </p>
            )}
        </div>
    );
}
