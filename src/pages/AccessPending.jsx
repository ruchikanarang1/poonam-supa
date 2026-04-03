import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Mail, LogOut, AlertOctagon } from 'lucide-react';

export default function AccessPending() {
    const { currentUser, userData, logout, globalAuthError } = useAuth();

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#040d1a', padding: '2rem'
        }}>
            <div style={{
                maxWidth: '480px', width: '100%', textAlign: 'center',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px', padding: '3rem 2.5rem'
            }}>
                <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: globalAuthError ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)', 
                    border: globalAuthError ? '2px solid rgba(239,68,68,0.3)' : '2px solid rgba(245,158,11,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.5rem', 
                    color: globalAuthError ? '#ef4444' : '#f59e0b'
                }}>
                    {globalAuthError ? <AlertOctagon size={34} /> : <Clock size={34} />}
                </div>

                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem' }}>
                    {globalAuthError ? "Database Sync Error" : "Access Pending"}
                </h1>
                
                {globalAuthError ? (
                    <div style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '2rem', textAlign: 'left', background: 'rgba(239,68,68,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', wordBreak: 'break-word' }}>
                        <strong>Diagnostic Code:</strong>
                        <pre style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {globalAuthError}
                        </pre>
                        <p style={{ marginTop: '1rem', marginBottom: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                            Your profile could not be verified in the secure database. Please take a screenshot of this error and show it to the developer.
                        </p>
                    </div>
                ) : (
                    <>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '2rem' }}>
                            You're signed in as <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{currentUser?.email}</strong>.
                            <br /><br />
                            <strong>System Diagnostic (What the app sees):</strong><br/>
                            ID: <span style={{ fontFamily: 'monospace' }}>{userData?.id || 'BLANK'}</span><br/>
                            Role: <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{userData?.role || 'BLANK'}</span><br/>
                            Status: <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{userData?.status || 'BLANK'}</span>
                            <br/><br/>
                            <strong>RAW DATA:</strong> <pre style={{textAlign: 'left', fontSize: '0.7rem', color: '#ccc'}}>{JSON.stringify(userData, null, 2)}</pre>
                            <br />
                            Please contact your administrator to get access to the Poonam Steel ERP system.
                        </p>

                        <div style={{
                            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                            borderRadius: '12px', padding: '1rem',
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            marginBottom: '2rem', textAlign: 'left'
                        }}>
                            <Mail size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>
                                Your request has been logged. The superadmin will approve your access from the Admin → Team Management panel.
                            </p>
                        </div>
                    </>
                )}

                <button
                    onClick={logout}
                    style={{
                        background: 'none', border: '1px solid rgba(255,255,255,0.15)',
                        color: 'rgba(255,255,255,0.5)', borderRadius: '10px',
                        padding: '0.65rem 1.5rem', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        fontSize: '0.85rem', fontWeight: 600,
                        transition: 'border-color 0.2s, color 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                >
                    <LogOut size={16} />
                    Sign out and use a different account
                </button>
            </div>
        </div>
    );
}
