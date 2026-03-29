import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileSetup() {
    const { currentUser } = useAuth();
    const [bName, setBName] = useState('');
    const [loc, setLoc] = useState('');
    const [fullName, setFullName] = useState(currentUser?.displayName || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
                businessName: bName,
                location: loc,
                displayName: fullName
            });
            window.location.reload(); // Remount app with new data
        } catch (err) {
            console.error(err);
            alert("Failed to save profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--color-secondary)' }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
                <h2 style={{ color: 'var(--color-accent-blue)', marginBottom: 'var(--spacing-md)' }}>Complete Your Profile</h2>
                <p style={{ color: 'var(--color-text-light)', marginBottom: 'var(--spacing-lg)' }}>Please provide your business details to access the catalogue and place orders.</p>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Full Name</label>
                        <input className="input-field" required value={fullName} onChange={e => setFullName(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Business Name</label>
                        <input className="input-field" required value={bName} onChange={e => setBName(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Location (City/Region)</label>
                        <input className="input-field" required value={loc} onChange={e => setLoc(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--spacing-md)' }} disabled={loading}>
                        {loading ? 'Saving...' : 'Save & Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
}
