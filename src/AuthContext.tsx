import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
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
  isAcademic: boolean;
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
          const data = userDoc.data() as UserProfile;
          // Ensure safa@skill.edu has safa role and mdthaha213@gmail.com has admin role
          const isAdminEmail = firebaseUser.email === 'mdthaha213@gmail.com' || firebaseUser.email === 'admin@skill.edu';
          const isSafaEmail = firebaseUser.email === 'safa@skill.edu' || firebaseUser.email?.endsWith('@safa.edu');
          const isStaffEmail = firebaseUser.email?.endsWith('@staff.edu') || ['sharfuddin@skill.edu', 'sharafuddin@skill.edu', 'sharafuddinhudawi@skill.edu', 'anasp@skill.edu', 'zakirhudawi@skill.edu', 'ali@skill.edu', 'masoom@skill.edu', 'zakir@skill.edu', 'nayaz@skill.edu', 'saifullah@skill.edu', 'saifullahk@skill.edu', 'irfan@skill.edu', 'shuaib@skill.edu', 'latheef@skill.edu', 'salman@skill.edu', 'shefil@skill.edu', 'safwan@skill.edu', 'shibli@skill.edu', 'thaha@skill.edu', 'jawad@skill.edu'].includes(firebaseUser.email || '');
          const isSkillEduEmail = firebaseUser.email?.endsWith('@skill.edu');
          
          let finalProfile = data;
          
          if (isAdminEmail && data.role !== 'admin') {
            finalProfile = { ...data, role: 'admin' as UserRole };
            await setDoc(doc(db, 'users', firebaseUser.uid), finalProfile);
          } else if (isSafaEmail && data.role !== 'safa') {
            finalProfile = { ...data, role: 'safa' as UserRole };
            await setDoc(doc(db, 'users', firebaseUser.uid), finalProfile);
          } else if (isStaffEmail && data.role !== 'staff') {
            finalProfile = { ...data, role: 'staff' as UserRole };
            await setDoc(doc(db, 'users', firebaseUser.uid), finalProfile);
          } else if (isSkillEduEmail && data.role !== 'student' && !isAdminEmail && !isSafaEmail && !isStaffEmail) {
            finalProfile = { ...data, role: 'student' as UserRole };
            await setDoc(doc(db, 'users', firebaseUser.uid), finalProfile);
          }
          
          // Auto-link student profile if email matches and admissionNumber is missing
          if (finalProfile.role === 'student' && !finalProfile.admissionNumber && firebaseUser.email) {
            const studentsRef = collection(db, 'students');
            const q = query(studentsRef, where('email', '==', firebaseUser.email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const studentDoc = querySnapshot.docs[0];
              finalProfile = { ...finalProfile, admissionNumber: studentDoc.id };
              await setDoc(doc(db, 'users', firebaseUser.uid), finalProfile, { merge: true });
            } else if (isSkillEduEmail) {
              // Fallback: extract admission number from email if it's numeric
              const prefix = firebaseUser.email.split('@')[0];
              if (/^\d+$/.test(prefix)) {
                finalProfile = { ...finalProfile, admissionNumber: prefix };
                await setDoc(doc(db, 'users', firebaseUser.uid), finalProfile, { merge: true });
              }
            }
          }
          
          // Access tracking for students
          if (finalProfile.role === 'student') {
            const today = new Date().toISOString().split('T')[0];
            if (finalProfile.lastAccessDate !== today) {
              finalProfile = { ...finalProfile, dailyAccessCount: 1, lastAccessDate: today };
              await updateDoc(doc(db, 'users', firebaseUser.uid), { dailyAccessCount: 1, lastAccessDate: today });
            } else if ((finalProfile.dailyAccessCount || 0) < 7) {
              const newCount = (finalProfile.dailyAccessCount || 0) + 1;
              finalProfile = { ...finalProfile, dailyAccessCount: newCount };
              await updateDoc(doc(db, 'users', firebaseUser.uid), { dailyAccessCount: newCount });
            } else {
              // Block access
              await auth.signOut();
              setProfile(null);
              setLoading(false);
              return;
            }
          }
          
          setProfile(finalProfile);
        } else {
          // Check if registration is enabled
          const settingsDoc = await getDoc(doc(db, 'settings', 'system'));
          const registrationEnabled = settingsDoc.exists() ? settingsDoc.data().registrationEnabled !== false : true;

          const isAdminEmail = firebaseUser.email === 'mdthaha213@gmail.com' || firebaseUser.email === 'admin@skill.edu';
          const isSafaEmail = firebaseUser.email === 'safa@skill.edu' || firebaseUser.email?.endsWith('@safa.edu');
          const isStaffEmail = firebaseUser.email?.endsWith('@staff.edu') || ['sharfuddin@skill.edu', 'sharafuddin@skill.edu', 'sharafuddinhudawi@skill.edu', 'anasp@skill.edu', 'zakirhudawi@skill.edu', 'ali@skill.edu', 'masoom@skill.edu', 'zakir@skill.edu', 'nayaz@skill.edu', 'saifullah@skill.edu', 'saifullahk@skill.edu', 'irfan@skill.edu', 'shuaib@skill.edu', 'latheef@skill.edu', 'salman@skill.edu', 'shefil@skill.edu', 'safwan@skill.edu', 'shibli@skill.edu', 'thaha@skill.edu', 'jawad@skill.edu'].includes(firebaseUser.email || '');
          const isSkillEduEmail = firebaseUser.email?.endsWith('@skill.edu');
          
          let isPreRegisteredStudent = false;
          let linkedAdmissionNumber = '';
          if (firebaseUser.email) {
            const studentsRef = collection(db, 'students');
            const q = query(studentsRef, where('email', '==', firebaseUser.email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              isPreRegisteredStudent = true;
              linkedAdmissionNumber = querySnapshot.docs[0].id;
            } else if (isSkillEduEmail) {
              const prefix = firebaseUser.email.split('@')[0];
              if (/^\d+$/.test(prefix)) {
                linkedAdmissionNumber = prefix;
                isPreRegisteredStudent = true;
              }
            }
          }

          if (registrationEnabled || isAdminEmail || isSafaEmail || isStaffEmail || isPreRegisteredStudent || isSkillEduEmail) {
            // Create a default profile
            const newRole: UserRole = isAdminEmail ? 'admin' : (isSafaEmail ? 'safa' : (isStaffEmail ? 'staff' : 'student'));
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User',
              role: newRole,
              photoURL: firebaseUser.photoURL || '',
              admissionNumber: linkedAdmissionNumber || undefined,
              createdAt: new Date().toISOString()
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);
          } else {
            // No profile found and registration disabled, user is not authorized
            setProfile(null);
            await auth.signOut(); // Sign out unauthorized users
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
    isAcademic: profile?.role === 'academic' || profile?.role === 'admin',
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
