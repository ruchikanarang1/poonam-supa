import React, { useState, useEffect } from 'react';
import { getTicketCategories, saveTicketCategory, deleteTicketCategory } from '../../lib/db';
import { Plus, Trash2, Save, GripVertical, Edit2, ChevronDown, ChevronRight } from 'lucide-react';

export default function TicketBuilder() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState(null); // id of the category being edited
    const [editingFields, setEditingFields] = useState([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newField, setNewField] = useState({ label: '', type: 'text', required: false });
    const [draggedIdx, setDraggedIdx] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const data = await getTicketCategories();
            setCategories(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCategory = (cat) => {
        if (activeCategory === cat.id) {
            setActiveCategory(null);
            setEditingFields([]);
        } else {
            setActiveCategory(cat.id);
            setEditingFields(cat.fields || []);
        }
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try {
            await saveTicketCategory(null, { name: newCategoryName.trim(), fields: [] });
            setNewCategoryName('');
            await loadCategories();
        } catch (err) {
            alert('Failed to create category');
        }
    };

    const handleSaveFields = async () => {
        if (!activeCategory) return;
        setSaving(true);
        try {
            await saveTicketCategory(activeCategory, { fields: editingFields });
            // Update local state
            setCategories(categories.map(c => c.id === activeCategory ? { ...c, fields: editingFields } : c));
            alert('Fields saved!');
        } catch (err) {
            alert('Failed to save fields');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm('Delete this category? All tickets with this category will lose their category label.')) return;
        try {
            await deleteTicketCategory(id);
            if (activeCategory === id) { setActiveCategory(null); setEditingFields([]); }
            setCategories(categories.filter(c => c.id !== id));
        } catch (err) {
            alert('Failed to delete');
        }
    };

    const addField = (e) => {
        e.preventDefault();
        if (!newField.label.trim()) return;
        const id = newField.label.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
        setEditingFields([...editingFields, { ...newField, id }]);
        setNewField({ label: '', type: 'text', required: false });
    };

    const removeField = (id) => setEditingFields(editingFields.filter(f => f.id !== id));

    const onDragStart = (e, idx) => { setDraggedIdx(idx); e.dataTransfer.effectAllowed = 'move'; };
    const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
    const onDrop = (e, idx) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === idx) return;
        const arr = [...editingFields];
        const item = arr.splice(draggedIdx, 1)[0];
        arr.splice(idx, 0, item);
        setEditingFields(arr);
        setDraggedIdx(null);
    };

    if (loading) return <p>Loading ticket categories...</p>;

    return (
        <div className="card">
            <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-accent-blue)' }}>Ticket Category Builder</h3>
            <p style={{ marginBottom: 'var(--spacing-lg)', fontSize: '0.9rem', color: 'gray' }}>
                Create categories for employee tickets. Each category can have its own unique set of form fields.
            </p>

            {/* Create new category */}
            <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '1rem', marginBottom: 'var(--spacing-xl)' }}>
                <input
                    className="input-field"
                    placeholder="New Category Name (e.g. Goods Shortage)"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    required
                    style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                    <Plus size={18} /> Add Category
                </button>
            </form>

            {/* Category list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {categories.length === 0 && <p style={{ color: 'gray', fontStyle: 'italic' }}>No categories yet. Create one above.</p>}
                {categories.map(cat => (
                    <div key={cat.id} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                        {/* Category header */}
                        <div
                            style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1rem', background: activeCategory === cat.id ? '#e9f0fb' : '#f8f9fa', cursor: 'pointer', justifyContent: 'space-between' }}
                            onClick={() => handleSelectCategory(cat)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {activeCategory === cat.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                <strong>{cat.name}</strong>
                                <span style={{ fontSize: '0.8rem', color: 'gray' }}>({cat.fields?.length || 0} fields)</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444' }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {/* Expanded field editor */}
                        {activeCategory === cat.id && (
                            <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                                {/* Add Field */}
                                <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '6px' }}>
                                    <h5 style={{ marginBottom: '0.75rem' }}>Add Field</h5>
                                    <form onSubmit={addField} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Question / Label</label>
                                            <input
                                                className="input-field"
                                                placeholder="e.g. Product Name"
                                                value={newField.label}
                                                onChange={e => setNewField({ ...newField, label: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Type</label>
                                            <select className="input-field" value={newField.type} onChange={e => setNewField({ ...newField, type: e.target.value })}>
                                                <option value="text">Short Text</option>
                                                <option value="textarea">Long Paragraph</option>
                                                <option value="number">Number</option>
                                                <option value="date">Date</option>
                                            </select>
                                        </div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                            <input type="checkbox" checked={newField.required} onChange={e => setNewField({ ...newField, required: e.target.checked })} />
                                            Required
                                        </label>
                                        <button type="submit" className="btn btn-secondary">+ Add</button>
                                    </form>
                                </div>

                                {/* Field List */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <h5 style={{ margin: 0 }}>Form Preview (drag to reorder)</h5>
                                        <button onClick={handleSaveFields} className="btn btn-primary" disabled={saving} style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem', display: 'flex', gap: '0.5rem' }}>
                                            <Save size={16} /> {saving ? 'Saving…' : 'Save Fields'}
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {editingFields.length === 0 && <p style={{ color: 'gray', fontStyle: 'italic', fontSize: '0.9rem' }}>No fields yet.</p>}
                                        {editingFields.map((f, idx) => (
                                            <div
                                                key={f.id}
                                                draggable
                                                onDragStart={e => onDragStart(e, idx)}
                                                onDragOver={onDragOver}
                                                onDrop={e => onDrop(e, idx)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                    padding: '0.6rem 0.75rem',
                                                    background: draggedIdx === idx ? '#e9ecef' : 'white',
                                                    border: draggedIdx === idx ? '2px dashed var(--color-primary)' : '1px solid #dee2e6',
                                                    borderRadius: '4px', cursor: 'grab', opacity: draggedIdx === idx ? 0.5 : 1
                                                }}
                                            >
                                                <GripVertical size={18} style={{ color: '#adb5bd', flexShrink: 0 }} />
                                                <div style={{ flex: 1 }}>
                                                    <strong style={{ fontSize: '0.9rem' }}>{f.label}</strong>
                                                    {f.required && <span style={{ color: 'red' }}> *</span>}
                                                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'gray' }}>[{f.type}]</span>
                                                </div>
                                                <button onClick={() => removeField(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444' }}>
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
