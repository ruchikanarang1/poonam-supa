import React, { useState, useEffect, useRef } from 'react';
import { X, Phone, Mail, Eye, EyeOff, Loader2, ArrowRight, Smartphone, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { RecaptchaVerifier } from '../lib/firebase';
import { auth } from '../lib/firebase';

export default function AuthModal({ isOpen, onClose }) {
    const { loginWithGoogle, loginWithPhone, ensureUserProfile } = useAuth();
    
    // UI State
    const [step, setStep] = useState('options'); // 'options', 'phone', 'otp'
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmationResult, setConfirmationResult] = useState(null);
    
    useEffect(() => {
        if (!isOpen) {
            setStep('options');
            setPhoneNumber('');
            setOtp('');
            setError('');
            setConfirmationResult(null);
            setLoading(false);
        }

        return () => {
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                } catch (e) {}
                window.recaptchaVerifier = null;
            }
        };
    }, [isOpen]);

    const initRecaptcha = () => {
        try {
            if (!window.recaptchaVerifier) {
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    'size': 'invisible',
                    'callback': (response) => {
                        // reCAPTCHA solved
                    },
                    'expired-callback': () => {
                        // Response expired. Ask user to solve reCAPTCHA again.
                        if (window.recaptchaVerifier) {
                            window.recaptchaVerifier.clear();
                            window.recaptchaVerifier = null;
                        }
                    }
                });
            }
        } catch (err) {
            console.error("Recaptcha Init Error", err);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await loginWithGoogle();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        // Clean phone number (remove spaces, etc) and check length
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        if (cleanNumber.length !== 10) return setError('Please enter a valid 10-digit number');
        
        const fullNumber = `+91${cleanNumber}`;
        
        setLoading(true);
        setError('');
        try {
            initRecaptcha();
            const result = await loginWithPhone(fullNumber, window.recaptchaVerifier);
            setConfirmationResult(result);
            setStep('otp');
        } catch (err) {
            setError(err.message);
            // Reset recaptcha if error
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                } catch (e) {}
                window.recaptchaVerifier = null;
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp || otp.length < 6) return setError('Enter 6-digit code');

        setLoading(true);
        setError('');
        try {
            const userCredential = await confirmationResult.confirm(otp);
            await ensureUserProfile(userCredential.user);
            onClose();
        } catch (err) {
            setError('Invalid code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '1rem'
        }}>
            <div className="card" style={{
                width: '100%', maxWidth: '400px', padding: '2rem',
                position: 'relative', boxShadow: 'var(--shadow-lg)',
                border: '1px solid #e2e8f0', borderRadius: '16px',
                background: 'white'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8'
                }}>
                    <X size={24} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ 
                        width: '56px', height: '56px', background: 'var(--color-secondary)',
                        borderRadius: '14px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--color-accent-blue)'
                    }}>
                        {step === 'otp' ? <ShieldCheck size={32} /> : <Smartphone size={32} />}
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-accent-blue)', marginBottom: '0.5rem' }}>
                        {step === 'otp' ? 'Verification' : 'Sign In'}
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                        {step === 'otp' ? `Enter the code sent to ${phoneNumber}` : 'Access your Poonam Logistics dashboard'}
                    </p>
                </div>

                {error && (
                    <div style={{ 
                        backgroundColor: '#fff1f0', border: '1px solid #ffa39e',
                        color: '#cf1322', padding: '0.75rem', borderRadius: '8px',
                        fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                {step === 'options' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button 
                            onClick={handleGoogleLogin} 
                            disabled={loading}
                            className="btn btn-outline" 
                            style={{ 
                                width: '100%', padding: '0.75rem', gap: '0.75rem', 
                                border: '1px solid #e2e8f0', background: 'white' 
                            }}
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" alt="Google" />
                            Continue with Google
                        </button>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
                            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>OR</span>
                            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                        </div>

                        <button 
                            onClick={() => setStep('phone')}
                            className="btn btn-secondary" 
                            style={{ width: '100%', padding: '0.75rem', gap: '0.75rem' }}
                        >
                            <Phone size={18} />
                            Continue with Phone
                        </button>
                    </div>
                )}

                {step === 'phone' && (
                    <form onSubmit={handleSendOtp}>
                        <div className="input-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>PHONE NUMBER</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ 
                                    padding: '0 12px', background: '#f8fafc', border: '1px solid #e2e8f0', 
                                    borderRadius: '8px', display: 'flex', alignItems: 'center', 
                                    fontSize: '0.9rem', fontWeight: 700, color: '#475569' 
                                }}>
                                    +91
                                </div>
                                <input 
                                    className="input-field"
                                    type="tel"
                                    maxLength="10"
                                    placeholder="Enter 10 digits"
                                    style={{ flex: 1 }}
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                    autoFocus
                                    required
                                />
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="btn btn-primary" 
                            style={{ width: '100%', marginTop: '1rem', gap: '0.5rem' }}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send OTP'}
                            {!loading && <ArrowRight size={18} />}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setStep('options')}
                            style={{ 
                                width: '100%', background: 'none', border: 'none', 
                                marginTop: '1rem', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer'
                            }}
                        >
                            Back to options
                        </button>
                    </form>
                )}

                {step === 'otp' && (
                    <form onSubmit={handleVerifyOtp}>
                        <div className="input-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>6-DIGIT CODE</label>
                            <input 
                                className="input-field"
                                type="text"
                                maxLength="6"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                style={{ letterSpacing: '0.5rem', textAlign: 'center', fontSize: '1.25rem', fontWeight: 800 }}
                                autoFocus
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="btn btn-primary" 
                            style={{ width: '100%', marginTop: '1rem' }}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify & Sign In'}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setStep('phone')}
                            style={{ 
                                width: '100%', background: 'none', border: 'none', 
                                marginTop: '1rem', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer'
                            }}
                        >
                            Change number
                        </button>
                    </form>
                )}

                {/* HIDDEN RECAPTCHA CONTAINER */}
                <div id="recaptcha-container"></div>
            </div>
        </div>
    );
}

// Add CSS for spinner
const style = document.createElement('style');
style.textContent = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .animate-spin { animation: spin 1s linear infinite; }
`;
document.head.append(style);
