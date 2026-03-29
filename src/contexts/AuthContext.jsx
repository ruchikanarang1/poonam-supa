import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import ProfileSetup from '../components/ProfileSetup';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    // Sign in with Google
    const loginWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Check if user exists in Firestore
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                // Create basic user profile
                await setDoc(userRef, {
                    email: user.email,
                    displayName: user.displayName,
                    role: 'user', // Default role
                    createdAt: new Date().toISOString()
                });
            }
            return user;
        } catch (error) {
            console.error("Google Sign In Error", error);
            throw error;
        }
    };

    const logout = () => {
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
                // Fetch full User Document
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserData(data);
                        setIsAdmin(data.role === 'admin');
                    } else {
                        setUserData(null);
                        setIsAdmin(false);
                    }
                } catch (e) {
                    console.error(e);
                    setIsAdmin(false);
                }
            } else {
                setUserData(null);
                setIsAdmin(false);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userData,
        isAdmin,
        loginWithGoogle,
        logout,
        loginForAdminExport
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && (currentUser && userData && !userData.businessName ? <ProfileSetup /> : children)}
        </AuthContext.Provider>
    );
}
