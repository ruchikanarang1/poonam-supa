import React, { useState, useEffect } from 'react';
import { getSuppliers, saveSupplier, deleteSupplier } from '../../lib/db';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

export default function SupplierManager() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', phone: '', address: '', gst: '' });
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try { setSuppliers(await getSuppliers()); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.phone.trim()) return;
        setSaving(true);
        try {
            await saveSupplier(editingId, form);
            setForm({ name: '', phone: '', address: '', gst: '' });
            setEditingId(null);
            await load();
        } catch (err) { alert('Failed to save'); }
        finally { setSaving(false); }
    };

    const startEdit = (s) => {
        setEditingId(s.id);
        setForm({ name: s.name, phone: s.phone, address: s.address || '', gst: s.gst || '' });
    };

    const cancelEdit = () => { setEditingId(null); setForm({ name: '', phone: '', address: '', gst: '' }); };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this supplier?')) return;
        await deleteSupplier(id);
        setSuppliers(suppliers.filter(s => s.id !== id));
    };

    if (loading) return <p>Loading suppliers...</p>;

    return (
        <div className="card">
            <h3 style={{ color: 'var(--color-accent-blue)', marginBottom: '1rem' }}>Supplier Database</h3>
            <p style={{ fontSize: '0.9rem', color: 'gray', marginBottom: '1.5rem' }}>
                Manage your supplier contacts. These will appear as autocomplete suggestions when placing purchase orders.
            </p>

            {/* Add / Edit Form */}
            <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
                <h4 style={{ margin: '0 0 1rem' }}>{editingId ? '✏️ Edit Supplier' : '➕ Add New Supplier'}</h4>
                <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Supplier Name *</label>
                        <input className="input-field" placeholder="e.g. Sharma Steel Traders" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Phone Number *</label>
                        <input className="input-field" type="tel" placeholder="e.g. 9876543210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Address</label>
                        <input className="input-field" placeholder="City, State" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>GST Number</label>
                        <input className="input-field" placeholder="27XXXXX..." value={form.gst} onChange={e => setForm({ ...form, gst: e.target.value })} />
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            {saving ? 'Saving...' : <><Check size={16} /> {editingId ? 'Update Supplier' : 'Add Supplier'}</>}
                        </button>
                        {editingId && (
                            <button type="button" className="btn btn-outline" onClick={cancelEdit} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <X size={16} /> Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Supplier Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', fontSize: '0.85rem', color: 'gray' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Phone</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Address</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>GST</th>
                        <th style={{ padding: '0.5rem' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {suppliers.length === 0 && (
                        <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'gray' }}>No suppliers yet. Add one above.</td></tr>
                    )}
                    {suppliers.map(s => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                            <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>{s.name}</td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>{s.phone}</td>
                            <td style={{ padding: '0.75rem 0.5rem', color: 'gray', fontSize: '0.9rem' }}>{s.address || '—'}</td>
                            <td style={{ padding: '0.75rem 0.5rem', color: 'gray', fontSize: '0.85rem' }}><code>{s.gst || '—'}</code></td>
                            <td style={{ padding: '0.75rem 0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => startEdit(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444' }}><Trash2 size={16} /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
