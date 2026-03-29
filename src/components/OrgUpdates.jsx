import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

const UPDATES_KEY = 'poonam_org_updates';

export default function OrgUpdates({ readOnly = false }) {
    const [updates, setUpdates] = useState(() => {
        try { return JSON.parse(localStorage.getItem(UPDATES_KEY)) || []; } catch { return []; }
    });
    const [text, setText] = useState('');

    useEffect(() => {
        // Sync with other tabs/components
        const handler = () => {
            try { setUpdates(JSON.parse(localStorage.getItem(UPDATES_KEY)) || []); } catch { }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const add = () => {
        if (!text.trim()) return;
        const next = [{ id: Date.now(), text: text.trim(), date: new Date().toLocaleDateString('en-IN') }, ...updates];
        setUpdates(next);
        localStorage.setItem(UPDATES_KEY, JSON.stringify(next));
        setText('');
    };

    const remove = (id) => {
        const next = updates.filter(u => u.id !== id);
        setUpdates(next);
        localStorage.setItem(UPDATES_KEY, JSON.stringify(next));
    };

    return (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e8eaed', padding: '1.25rem', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Bell size={18} color="#f59e0b" />
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Organisation Updates</h3>
            </div>

            {!readOnly && (
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <input
                        style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '0.9rem' }}
                        placeholder="Post an update for the team…"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && add()}
                    />
                    <button onClick={add} style={{ padding: '0.5rem 1rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>Post</button>
                </div>
            )}

            {updates.length === 0 && <p style={{ color: 'gray', fontSize: '0.9rem', fontStyle: 'italic' }}>No updates posted yet.</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                {updates.map(u => (
                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.6rem 0.75rem', background: '#fffbf0', borderRadius: '6px', border: '1px solid #fde68a' }}>
                        <div>
                            <span style={{ fontSize: '0.9rem' }}>{u.text}</span>
                            <span style={{ fontSize: '0.75rem', color: 'gray', marginLeft: '0.75rem' }}>{u.date}</span>
                        </div>
                        {!readOnly && (
                            <button onClick={() => remove(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#adb5bd', fontSize: '1.1rem', lineHeight: 1, padding: 0 }}>×</button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
