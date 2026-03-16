import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole } from './types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isSafa: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Check if a profile already exists for this UID
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          // Check if a profile was manually added by Admin with this email
          const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Found a pre-assigned profile!
            const existingData = querySnapshot.docs[0].data() as UserProfile;
            const existingId = querySnapshot.docs[0].id;
            
            // Update the existing document with the real UID and delete the temporary one if needed
            // Or just create a new one with the real UID and the assigned role
            const newProfile: UserProfile = {
              ...existingData,
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || existingData.displayName || '',
              photoURL: firebaseUser.photoURL || existingData.photoURL || '',
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            
            // If it was a manual entry, delete the old one
            if (existingId.startsWith('manual_')) {
              await deleteDoc(doc(db, 'users', existingId));
            }
            
            setProfile(newProfile);
          } else {
            // Default profile for new users
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: 'student',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isStaff: profile?.role === 'staff' || profile?.role === 'admin',
    isSafa: profile?.role === 'safa' || profile?.role === 'admin',
    isStudent: profile?.role === 'student',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
