import React, { useState, useEffect } from 'react';
import { getTransports, saveTransport, deleteTransport, updateTransportStations } from '../../lib/db';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Trash2, Edit2, Check, X, Truck, MapPin } from 'lucide-react';

export default function TransportManager() {
    const { currentCompanyId } = useAuth();
    const [transports, setTransports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', phone: '', vehicleNumber: '', booking_stations: [] });
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    
    // Booking station form for adding stations within the main form
    const [stationForm, setStationForm] = useState({ station_name: '', fare: '', avg_delivery_days: '' });
    const [editingStationIndex, setEditingStationIndex] = useState(null);

    useEffect(() => { 
        if (currentCompanyId) load(); 
    }, [currentCompanyId]);

    const load = async () => {
        setLoading(true);
        try { setTransports(await getTransports(currentCompanyId)); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            await saveTransport(currentCompanyId, editingId, form);
            setForm({ name: '', phone: '', vehicleNumber: '', booking_stations: [] });
            setEditingId(null);
            setStationForm({ station_name: '', fare: '', avg_delivery_days: '' });
            setEditingStationIndex(null);
            await load();
        } catch (err) { 
            console.error('Save error:', err);
            alert('Failed to save: ' + (err.message || JSON.stringify(err))); 
        }
        finally { setSaving(false); }
    };

    const startEdit = (t) => {
        setEditingId(t.id);
        setForm({ 
            name: t.name, 
            phone: t.contact || '', 
            vehicleNumber: (t.vehicle_nos && t.vehicle_nos.length > 0) ? t.vehicle_nos[0] : '',
            booking_stations: t.booking_stations || []
        });
    };

    const cancelEdit = () => { 
        setEditingId(null); 
        setForm({ name: '', phone: '', vehicleNumber: '', booking_stations: [] });
        setStationForm({ station_name: '', fare: '', avg_delivery_days: '' });
        setEditingStationIndex(null);
    };

    // Add station to form (not saved to DB yet)
    const handleAddStationToForm = () => {
        if (!stationForm.station_name.trim() || !stationForm.fare || !stationForm.avg_delivery_days) {
            alert('Please fill all station fields');
            return;
        }

        const newStation = {
            station_name: stationForm.station_name.trim(),
            fare: parseFloat(stationForm.fare),
            avg_delivery_days: parseFloat(stationForm.avg_delivery_days)
        };

        let updatedStations;
        if (editingStationIndex !== null) {
            updatedStations = [...form.booking_stations];
            updatedStations[editingStationIndex] = newStation;
        } else {
            updatedStations = [...form.booking_stations, newStation];
        }

        setForm({ ...form, booking_stations: updatedStations });
        setStationForm({ station_name: '', fare: '', avg_delivery_days: '' });
        setEditingStationIndex(null);
    };

    const handleRemoveStationFromForm = (index) => {
        const updatedStations = form.booking_stations.filter((_, idx) => idx !== index);
        setForm({ ...form, booking_stations: updatedStations });
    };

    const startEditStationInForm = (index) => {
        const station = form.booking_stations[index];
        setStationForm({
            station_name: station.station_name,
            fare: station.fare.toString(),
            avg_delivery_days: station.avg_delivery_days.toString()
        });
        setEditingStationIndex(index);
    };

    const cancelStationEdit = () => {
        setStationForm({ station_name: '', fare: '', avg_delivery_days: '' });
        setEditingStationIndex(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this Transport Company?')) return;
        await deleteTransport(currentCompanyId, id);
        setTransports(transports.filter(t => t.id !== id));
    };

    if (loading) return <p>Loading Transporters...</p>;

    return (
        <div className="card">
            <h3 style={{ color: 'var(--color-accent-blue)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={24} /> Transport Database
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'gray', marginBottom: '1.5rem' }}>
                Manage your Transporter contacts. These will appear as autocomplete suggestions in the Logistics Portal.
            </p>

            {/* Add / Edit Form */}
            <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
                <h4 style={{ margin: '0 0 1rem' }}>{editingId ? '✏️ Edit Transporter' : '➕ Add New Transporter'}</h4>
                <form onSubmit={handleSave}>
                    {/* Basic Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Company Name *</label>
                            <input className="input-field" placeholder="e.g. VRL Logistics" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Phone Number</label>
                            <input className="input-field" type="tel" placeholder="e.g. 9876543210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Default Vehicle No (Opt)</label>
                            <input className="input-field" placeholder="e.g. MH 12 AB 1234" value={form.vehicleNumber} onChange={e => setForm({ ...form, vehicleNumber: e.target.value })} />
                        </div>
                    </div>

                    {/* Booking Stations Section */}
                    <div style={{ background: 'white', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                        <h5 style={{ margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-accent-blue)', fontSize: '0.9rem' }}>
                            <MapPin size={16} /> Booking Stations
                        </h5>
                        
                        {/* Add Station Form */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end', marginBottom: '0.75rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Station Name</label>
                                <input 
                                    className="input-field" 
                                    placeholder="e.g. Mumbai" 
                                    value={stationForm.station_name} 
                                    onChange={e => setStationForm({ ...stationForm, station_name: e.target.value })} 
                                    style={{ fontSize: '0.85rem' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Fare (₹)</label>
                                <input 
                                    className="input-field" 
                                    type="number" 
                                    placeholder="5000" 
                                    value={stationForm.fare} 
                                    onChange={e => setStationForm({ ...stationForm, fare: e.target.value })} 
                                    style={{ fontSize: '0.85rem' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Avg Days</label>
                                <input 
                                    className="input-field" 
                                    type="number" 
                                    placeholder="3" 
                                    value={stationForm.avg_delivery_days} 
                                    onChange={e => setStationForm({ ...stationForm, avg_delivery_days: e.target.value })} 
                                    style={{ fontSize: '0.85rem' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button 
                                    type="button" 
                                    className="btn btn-primary" 
                                    onClick={handleAddStationToForm}
                                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                                >
                                    {editingStationIndex !== null ? 'Update' : '+ Add'}
                                </button>
                                {editingStationIndex !== null && (
                                    <button 
                                        type="button" 
                                        className="btn btn-outline" 
                                        onClick={cancelStationEdit}
                                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Stations List */}
                        {form.booking_stations && form.booking_stations.length > 0 ? (
                            <div style={{ background: '#f8fafc', borderRadius: '4px', padding: '0.5rem' }}>
                                <table style={{ width: '100%', fontSize: '0.8rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <th style={{ padding: '0.25rem', textAlign: 'left', color: '#64748b', fontWeight: '600' }}>Station</th>
                                            <th style={{ padding: '0.25rem', textAlign: 'left', color: '#64748b', fontWeight: '600' }}>Fare</th>
                                            <th style={{ padding: '0.25rem', textAlign: 'left', color: '#64748b', fontWeight: '600' }}>Days</th>
                                            <th style={{ padding: '0.25rem' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {form.booking_stations.map((station, idx) => (
                                            <tr key={idx} style={{ borderBottom: idx < form.booking_stations.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                                                <td style={{ padding: '0.4rem 0.25rem', fontWeight: '500' }}>{station.station_name}</td>
                                                <td style={{ padding: '0.4rem 0.25rem' }}>₹{station.fare.toLocaleString()}</td>
                                                <td style={{ padding: '0.4rem 0.25rem' }}>{station.avg_delivery_days} days</td>
                                                <td style={{ padding: '0.4rem 0.25rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button type="button" onClick={() => startEditStationInForm(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}><Edit2 size={14} /></button>
                                                    <button type="button" onClick={() => handleRemoveStationFromForm(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444' }}><Trash2 size={14} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', margin: '0.5rem 0', fontStyle: 'italic' }}>
                                No booking stations added yet
                            </p>
                        )}
                    </div>

                    {/* Save Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            {saving ? 'Saving...' : <><Check size={16} /> {editingId ? 'Update Transporter' : 'Add Transporter'}</>}
                        </button>
                        {editingId && (
                            <button type="button" className="btn btn-outline" onClick={cancelEdit} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <X size={16} /> Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* List Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', fontSize: '0.85rem', color: 'gray' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Company Name</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Phone</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Default Vehicle</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Booking Stations</th>
                        <th style={{ padding: '0.5rem' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {transports.length === 0 && (
                        <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'gray' }}>No Transporters yet. Add one above.</td></tr>
                    )}
                    {transports.map(t => {
                        // Check if profile is incomplete
                        const isIncomplete = !t.contact || !t.vehicle_nos || t.vehicle_nos.length === 0 || !t.booking_stations || t.booking_stations.length === 0;
                        
                        return (
                        <tr key={t.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                            <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div>{t.name}</div>
                                    {isIncomplete && (
                                        <span 
                                            style={{ 
                                                fontSize: '0.65rem', 
                                                background: '#fef3c7', 
                                                color: '#92400e', 
                                                padding: '2px 8px', 
                                                borderRadius: '4px', 
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                border: '1px solid #fbbf24'
                                            }}
                                            onClick={() => startEdit(t)}
                                            title="Click to complete missing information"
                                        >
                                            ⚠️ INCOMPLETE
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>{t.contact || <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>Missing</span>}</td>
                            <td style={{ padding: '0.75rem 0.5rem', color: 'gray' }}>
                                {(t.vehicle_nos && t.vehicle_nos.length > 0) ? t.vehicle_nos[0] : <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>Missing</span>}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem' }}>
                                {t.booking_stations && t.booking_stations.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {t.booking_stations.map((station, idx) => (
                                            <span key={idx} style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                                                {station.station_name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>Missing</span>
                                )}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => startEdit(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444' }}><Trash2 size={16} /></button>
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
