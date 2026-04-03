import React, { useState } from 'react';
import { createCompany } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { Building2, MapPin, BadgeCheck } from 'lucide-react';

export default function ProfileSetup() {
    const { currentUser } = useAuth();
    const [companyName, setCompanyName] = useState('');
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!companyName.trim()) return;
        
        console.log("[SETUP] Starting company creation for user:", currentUser?.uid);
        setLoading(true);

        const timeout = setTimeout(() => {
            console.error("[SETUP] Creation timed out after 20 seconds.");
            setLoading(false);
            alert("Connection timeout while creating organization. Please check your internet or Supabase logs.");
        }, 20000);

        try {
            console.log("[SETUP] Calling createCompany...");
            const compId = await createCompany(currentUser.uid, companyName, location);
            console.log("[SETUP] Success! Company ID:", compId);
            
            clearTimeout(timeout);
            console.log("[SETUP] Reloading page to apply changes...");
            window.location.reload(); 
        } catch (err) {
            clearTimeout(timeout);
            console.error("[SETUP] ERROR:", err);
            alert("Failed to setup your company: " + (err.message || JSON.stringify(err)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '100vh', 
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            padding: '2rem'
        }}>
            <div style={{ 
                maxWidth: '450px', 
                width: '100%', 
                background: 'white', 
                borderRadius: '1.5rem', 
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
                padding: '2.5rem'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ 
                        width: '64px', 
                        height: '64px', 
                        background: '#eff6ff', 
                        borderRadius: '1rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        color: '#3b82f6'
                    }}>
                        <Building2 size={32} />
                    </div>
                    <h2 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.5rem' }}>
                        Setup Your Company
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>
                        Create your first organization to start managing your catalogue and logistics.
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>
                            Business Name
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Building2 size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                className="input-field" 
                                required 
                                placeholder="e.g. Poonam Steel Logistics"
                                style={{ paddingLeft: '2.75rem', width: '100%' }}
                                value={companyName} 
                                onChange={e => setCompanyName(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>
                            Primary Location
                        </label>
                        <div style={{ position: 'relative' }}>
                            <MapPin size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                className="input-field" 
                                required 
                                placeholder="e.g. Mumbai, Maharashtra"
                                style={{ paddingLeft: '2.75rem', width: '100%' }}
                                value={location} 
                                onChange={e => setLocation(e.target.value)} 
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ 
                            width: '100%', 
                            padding: '1rem', 
                            fontSize: '1rem', 
                            fontWeight: '600',
                            marginTop: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }} 
                        disabled={loading}
                    >
                        {loading ? 'Creating Organization...' : (
                            <>
                                <BadgeCheck size={20} />
                                Start My Organization
                            </>
                        )}
                    </button>
                    
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', marginTop: '1rem' }}>
                        By creating an organization, you agree to our terms of service and privacy policy.
                    </p>
                </form>
            </div>
        </div>
    );
}
