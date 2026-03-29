import React, { useState, useEffect } from 'react';
import { getFormConfig, saveFormConfig } from '../../lib/db';
import { Plus, Trash2, Save, GripVertical } from 'lucide-react';

export default function FormBuilder() {
    const [activeForm, setActiveForm] = useState('transport');
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(false);

    // New Field State
    const [newField, setNewField] = useState({ label: '', type: 'text', required: false });

    // Default templates to initialize if empty
    const defaultTemplates = {
        transport: [
            { id: 'lr_number', label: 'LR Number', type: 'text', required: true },
            { id: 'bundles', label: 'Number of Bundles Received', type: 'number', required: true },
            { id: 'transport_company', label: 'Transport Company', type: 'text', required: true },
            { id: 'freight_paid', label: 'Freight Paid (₹)', type: 'number', required: false },
            { id: 'items_inside', label: 'Items Received Inside', type: 'text', required: true },
            { id: 'quantity', label: 'Quantity', type: 'number', required: true },
            { id: 'date_received', label: 'Date Received', type: 'date', required: true },
            { id: 'time_received', label: 'Time Received', type: 'time', required: true },
            { id: 'weight', label: 'Approximate Weight (kg)', type: 'number', required: false }
        ],
        bills: [
            { id: 'lr_number', label: 'LR Number (Required for Match)', type: 'text', required: true },
            { id: 'bill_amount', label: 'Bill Amount (₹)', type: 'number', required: true },
            { id: 'bill_date', label: 'Bill Date', type: 'date', required: true }
        ]
    };

    useEffect(() => {
        loadConfig();
    }, [activeForm]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const data = await getFormConfig(activeForm);
            if (data && data.length > 0) {
                setFields(data);
            } else {
                // Load default if never saved
                setFields(defaultTemplates[activeForm]);
            }
        } catch (err) {
            console.error('Failed to load form config', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await saveFormConfig(activeForm, fields);
            alert(`${activeForm === 'transport' ? 'Transport' : 'Billing'} Form Configuration Saved Successfully!`);
        } catch (err) {
            console.error('Failed to save config', err);
            alert("Error saving configuration");
        } finally {
            setLoading(false);
        }
    };

    const addField = (e) => {
        e.preventDefault();
        if (!newField.label.trim()) return;

        const fieldId = newField.label.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
        setFields([...fields, { ...newField, id: fieldId }]);
        setNewField({ label: '', type: 'text', required: false });
    };

    const removeField = (id) => {
        // Prevent deleting the LR Number as it's required for reconciliation
        if (id.includes('lr_number')) {
            alert("LR Number field cannot be deleted as it is required to match Transports to Bills.");
            return;
        }
        setFields(fields.filter(f => f.id !== id));
    };

    const [draggedIdx, setDraggedIdx] = useState(null);

    const handleDragStart = (e, index) => {
        setDraggedIdx(index);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/html", e.target);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e, index) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === index) return;

        const newFields = [...fields];
        const draggedItem = newFields[draggedIdx];
        newFields.splice(draggedIdx, 1);
        newFields.splice(index, 0, draggedItem);
        setFields(newFields);
        setDraggedIdx(null);
    };

    return (
        <div className="card">
            <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-accent-blue)' }}>Dynamic Form Builder</h3>
            <p style={{ marginBottom: 'var(--spacing-lg)', fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
                Customize the exact data fields your employees must fill out when entering logistics records.
            </p>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: 'var(--spacing-xl)' }}>
                <button
                    className={`btn ${activeForm === 'transport' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveForm('transport')}
                >
                    Transport Entry Form
                </button>
                <button
                    className={`btn ${activeForm === 'bills' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveForm('bills')}
                >
                    Bill Entry Form
                </button>
            </div>

            {loading ? <p>Loading configuration...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-xl)' }}>

                    {/* Add Field Tool */}
                    <div style={{ border: '1px solid var(--color-border)', padding: '1rem', borderRadius: '8px', height: 'fit-content' }}>
                        <h4 style={{ marginBottom: '1rem' }}>Add New Question</h4>
                        <form onSubmit={addField} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Question / Prompt</label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. Driver Name"
                                    value={newField.label}
                                    onChange={e => setNewField({ ...newField, label: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Answer Type</label>
                                <select
                                    className="input-field"
                                    value={newField.type}
                                    onChange={e => setNewField({ ...newField, type: e.target.value })}
                                >
                                    <option value="text">Short Text</option>
                                    <option value="textarea">Long Paragraph</option>
                                    <option value="number">Number</option>
                                    <option value="date">Date</option>
                                    <option value="time">Time</option>
                                </select>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={newField.required}
                                    onChange={e => setNewField({ ...newField, required: e.target.checked })}
                                />
                                Make this required
                            </label>
                            <button type="submit" className="btn btn-secondary" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                <Plus size={18} /> Add to Form
                            </button>
                        </form>
                    </div>

                    {/* Form Preview & Editor */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ margin: 0 }}>Current {activeForm === 'transport' ? 'Transport' : 'Bill'} Form View</h4>
                            <button onClick={handleSave} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', padding: '0.25rem 1rem' }}>
                                <Save size={18} /> Publish Form
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {fields.map((field, idx) => (
                                <div
                                    key={field.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, idx)}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDrop={(e) => handleDrop(e, idx)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '0.75rem',
                                        background: draggedIdx === idx ? '#e9ecef' : '#f8f9fa',
                                        border: draggedIdx === idx ? '2px dashed var(--color-primary)' : '1px solid #ddd',
                                        borderRadius: '4px',
                                        cursor: 'grab',
                                        opacity: draggedIdx === idx ? 0.5 : 1
                                    }}
                                >
                                    <div style={{ marginRight: '1rem', color: '#adb5bd', cursor: 'grab' }}>
                                        <GripVertical size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <strong style={{ display: 'block' }}>{field.label} {field.required && <span style={{ color: 'red' }}>*</span>}</strong>
                                        <span style={{ fontSize: '0.8rem', color: 'gray', textTransform: 'capitalize' }}>Type: {field.type}</span>
                                    </div>
                                    <button
                                        onClick={() => removeField(field.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444', padding: '0.5rem' }}
                                        title="Remove Field"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {fields.length === 0 && <p style={{ color: 'gray', fontStyle: 'italic' }}>Form is empty. Add fields using the left panel.</p>}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
