import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, db, signInWithPhoneNumber, RecaptchaVerifier } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { 
    doc, getDoc, setDoc, updateDoc, 
    collection, getDocs, query, where 
} from 'firebase/firestore';
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
    const [companies, setCompanies] = useState([]);
    const [currentCompanyId, setCurrentCompanyId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Helper to ensure user profile exists in Firestore
    const ensureUserProfile = async (user) => {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            await setDoc(userRef, {
                email: user.email || '',
                phoneNumber: user.phoneNumber || '',
                displayName: user.displayName || 'Steel User',
                role: 'user',
                createdAt: new Date().toISOString()
            });
            return { email: user.email || '', phoneNumber: user.phoneNumber || '', displayName: user.displayName || 'Steel User', role: 'user' };
        }
        return userDoc.data();
    };

    // Sign in with Google
    const loginWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await ensureUserProfile(result.user);
            return result.user;
        } catch (error) {
            console.error("Google Sign In Error", error);
            throw error;
        }
    };

    // Sign in with Phone
    const loginWithPhone = async (phoneNumber, verifier) => {
        try {
            const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
            return confirmationResult;
        } catch (error) {
            console.error("Phone Sign In error", error);
            throw error;
        }
    };

    const logout = () => {
        setCurrentCompanyId(null);
        setCompanies([]);
        return signOut(auth);
    };

    const loginForAdminExport = async () => {
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/spreadsheets');
        provider.setCustomParameters({ prompt: 'consent' });
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        return credential.accessToken;
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                try {
                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);
                    
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        data.roles = data.roles || [];
                        setUserData(data);
                        
                        const isSA = data.role === 'superadmin';
                        setIsSuperAdmin(isSA);
                        
                        // Fetch Companies the user belongs to (or all if Super Admin)
                        let compsSnap;
                        if (isSA) {
                            compsSnap = await getDocs(collection(db, 'companies'));
                        } else {
                            const q = query(collection(db, 'companies'), where('adminIds', 'array-contains', user.uid));
                            compsSnap = await getDocs(q);
                        }
                        
                        const compList = compsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                        setCompanies(compList);
                        
                        // Select default company
                        const activeId = data.activeCompanyId || (compList.length > 0 ? compList[0].id : null);
                        setCurrentCompanyId(activeId);
                        
                        // Check if admin and get roles in CURRENT company
                        const currentComp = compList.find(c => c.id === activeId);
                        const companyRoles = currentComp?.roles?.[user.uid] || [];
                        
                        setIsAdmin(isSA || (currentComp?.adminIds || []).includes(user.uid) || companyRoles.includes('admin'));
                        
                        // Update userData with current company roles
                        setUserData(prev => ({ ...prev, roles: companyRoles }));
                    }
                } catch (e) {
                    console.error("Auth Load Error:", e);
                } finally {
                    setLoading(false);
                }
            } else {
                setUserData(null);
                setCompanies([]);
                setCurrentCompanyId(null);
                setIsAdmin(false);
                setIsSuperAdmin(false);
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    const switchCompany = async (companyId) => {
        if (!currentUser) return;
        setCurrentCompanyId(companyId);
        // Persist selection
        await updateDoc(doc(db, 'users', currentUser.uid), { activeCompanyId: companyId });
        window.location.reload(); // Refresh to clear states
    };

    const value = {
        currentUser,
        userData,
        isAdmin,
        isSuperAdmin,
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
