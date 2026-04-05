import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

export default function QuickAddModal({ 
    isOpen, 
    onClose, 
    onSave, 
    title, 
    fields, // Array of field configs: [{ name, label, type, required, placeholder }]
    initialValues = {}
}) {
    const [formData, setFormData] = useState(initialValues);
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(formData);
            setFormData({});
            onClose();
        } catch (err) {
            console.error(err);
            alert('Error saving: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '12px',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-accent-blue)' }}>
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            color: '#64748b'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
                    {fields.map(field => (
                        <div key={field.name} style={{ marginBottom: '1rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                color: '#334155',
                                marginBottom: '0.5rem'
                            }}>
                                {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
                            </label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    required={field.required}
                                    className="input-field"
                                    placeholder={field.placeholder}
                                    value={formData[field.name] || ''}
                                    onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                                    rows={3}
                                    style={{ width: '100%', resize: 'vertical' }}
                                />
                            ) : (
                                <input
                                    required={field.required}
                                    type={field.type || 'text'}
                                    className="input-field"
                                    placeholder={field.placeholder}
                                    value={formData[field.name] || ''}
                                    onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                                    style={{ width: '100%' }}
                                />
                            )}
                        </div>
                    ))}

                    {/* Actions */}
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        justifyContent: 'flex-end',
                        marginTop: '1.5rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--color-border)'
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-outline"
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
