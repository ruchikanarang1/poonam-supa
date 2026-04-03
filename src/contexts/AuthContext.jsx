import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ProfileSetup from '../components/ProfileSetup';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [isApproved, setIsApproved] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [currentCompanyId, setCurrentCompanyId] = useState(null);
    const [loading, setLoading] = useState(true);

    const [globalAuthError, setGlobalAuthError] = useState(null);

    // Normalize Supabase user to have a `uid` field like Firebase
    const normalizeUser = (user) => user ? { ...user, uid: user.id } : null;

    // Ensure user profile row exists in `profiles` table
    // New users default to status='pending' — admin must approve them
    const ensureUserProfile = async (user) => {
        if (!user) return null;

        const { data: existing, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (error) {
            console.error("ensureUserProfile error:", error);
            setGlobalAuthError(JSON.stringify(error));
            return null;
        }

        if (!existing) {
            const profileData = {
                id: user.id,
                email: user.email || '',
                phone_number: user.phone || '',
                display_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Steel User',
                role: 'user',
                status: 'pending',   // must be approved by admin
                created_at: new Date().toISOString()
            };
            await supabase.from('profiles').insert(profileData);
            return { ...profileData, roles: [] };
        }
        return { ...existing, roles: existing.roles || [] };
    };

    // Sign in with Google (OAuth redirect)
    const loginWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) throw error;
    };

    // Sign in with Phone — Step 1: Send OTP
    const loginWithPhone = async (phoneNumber) => {
        const { error } = await supabase.auth.signInWithOtp({ phone: phoneNumber });
        if (error) throw error;
        // Return a pseudo confirmationResult to match old API surface in AuthModal
        return {
            confirm: async (token) => {
                const { data, error: verifyError } = await supabase.auth.verifyOtp({
                    phone: phoneNumber,
                    token,
                    type: 'sms'
                });
                if (verifyError) throw verifyError;
                return data;
            }
        };
    };

    const logout = async () => {
        setCurrentCompanyId(null);
        setCompanies([]);
        await supabase.auth.signOut();
    };

    // For Google Sheets export — re-sign in with sheets scope and return provider token
    const loginForAdminExport = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.provider_token) return session.provider_token;

        // Re-auth with sheets scope
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'https://www.googleapis.com/auth/spreadsheets',
                redirectTo: window.location.origin,
                queryParams: { prompt: 'consent', access_type: 'offline' }
            }
        });
        if (error) throw error;
        return null;
    };

    // Load user data after auth state changes
    const loadUserData = async (user) => {
        try {
            const profile = await ensureUserProfile(user);
            if (!profile) { setLoading(false); return; }

            const cleanRole = (profile.role || '').toLowerCase().replace(/\s+/g, '');
            const cleanStatus = (profile.status || '').toLowerCase().trim();

            const isSA = cleanRole === 'superadmin';
            setIsSuperAdmin(isSA);

            // Superadmin is always approved; others need status='approved'
            const approved = isSA || cleanStatus === 'approved';
            setIsApproved(approved);

            if (!approved) {
                setUserData({ ...profile, uid: user.id });
                setLoading(false);
                return; // stop here — AccessPending screen will be shown
            }

            // Fetch companies the user belongs to
            let companiesQuery;
            if (isSA) {
                companiesQuery = supabase.from('companies').select('*').limit(20);
            } else {
                companiesQuery = supabase.from('companies')
                    .select('*')
                    .contains('admin_ids', [user.id]);
            }

            const { data: compList } = await companiesQuery;
            const comps = compList || [];
            setCompanies(comps);

            // Select default company
            const activeId = profile.active_company_id || (comps.length > 0 ? comps[0].id : null);
            setCurrentCompanyId(activeId);

            // Determine roles in current company
            const currentComp = comps.find(c => c.id === activeId);
            const companyRoles = currentComp?.roles?.[user.id] || [];
            const adminCheck = isSA || (currentComp?.admin_ids || []).includes(user.id) || companyRoles.includes('admin');

            setIsAdmin(adminCheck);
            setUserData({ ...profile, roles: companyRoles, uid: user.id });
        } catch (e) {
            console.error('Auth Load Error:', e);
            setGlobalAuthError(`Crash during profile load: ${e.message || JSON.stringify(e)}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let subscription;
        let isMounted = true;
        
        // Safety timeout to prevent infinite hanging
        const timeout = setTimeout(() => {
            if (isMounted) {
                console.log("[AUTH] Safe timeout reached. Forcing load to finish.");
                setLoading(false);
            }
        }, 8000);

        const setupAuth = async () => {
            try {
                // 1. Fetch initial session explicitly (crucial for page refreshes)
                const { data, error } = await supabase.auth.getSession();
                
                if (error) throw error;
                
                const session = data?.session;
                if (session?.user) {
                    setCurrentUser(normalizeUser(session.user));
                    await loadUserData(session.user);
                } else {
                    setLoading(false);
                }

                // 2. Listen for future auth events
                const res = supabase.auth.onAuthStateChange(async (event, currentSession) => {
                    if (!isMounted) return;
                    
                    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                        if (currentSession?.user) {
                            setCurrentUser(normalizeUser(currentSession.user));
                            await loadUserData(currentSession.user);
                        }
                    } else if (event === 'SIGNED_OUT') {
                        setCurrentUser(null);
                        setUserData(null);
                        setCompanies([]);
                        setCurrentCompanyId(null);
                        setIsAdmin(false);
                        setIsSuperAdmin(false);
                        setLoading(false);
                    }
                });
                
                subscription = res?.data?.subscription || res?.subscription;
            } catch (e) {
                console.error("[AUTH] Init error", e);
                if (isMounted) setLoading(false);
            }
        };

        setupAuth();

        return () => {
            isMounted = false;
            clearTimeout(timeout);
            if (subscription && subscription.unsubscribe) {
                subscription.unsubscribe();
            }
        };
    }, []);

    const switchCompany = async (companyId) => {
        if (!currentUser) return;
        setCurrentCompanyId(companyId);
        await supabase.from('profiles').update({ active_company_id: companyId }).eq('id', currentUser.id);
        window.location.reload();
    };

    const value = {
        currentUser,
        userData,
        isAdmin,
        isSuperAdmin,
        isApproved,
        globalAuthError,
        companies,
        currentCompanyId,
        switchCompany,
        loginWithGoogle,
        loginWithPhone,
        ensureUserProfile,
        logout,
        loginForAdminExport
    };

    if (loading) {
        return (
            <div style={{
                height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '1rem', background: '#fafafa'
            }}>
                <div style={{
                    width: '40px', height: '40px', border: '3px solid #f3f3f3',
                    borderTop: '3px solid var(--color-accent-orange, #FF6A00)',
                    borderRadius: '50%', animation: 'spin 1s linear infinite'
                }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                <div style={{ color: '#666', fontWeight: 500, fontSize: '0.9rem' }}>Initializing Steel ERP...</div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {currentUser && userData && companies.length === 0 && !isSuperAdmin ? <ProfileSetup /> : children}
        </AuthContext.Provider>
    );
}
