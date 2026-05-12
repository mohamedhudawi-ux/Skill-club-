import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole, Campus } from './types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isSafa: boolean;
  isStudent: boolean;
  isAcademic: boolean;
  isMasterAdmin: boolean;
  campusId?: string;
  currentCampus: Campus | null;
  switchCampus: (cid: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [currentCampus, setCurrentCampus] = useState<Campus | null>(null);
  const [loading, setLoading] = useState(true);

  const activeCampusId = selectedCampusId || profile?.campusId || 'default';

  useEffect(() => {
    const fetchCampus = async (cid: string) => {
      try {
        const campusDoc = await getDoc(doc(db, 'campuses', cid));
        if (campusDoc.exists()) {
          setCurrentCampus({ id: campusDoc.id, ...campusDoc.data() } as Campus);
        }
      } catch (error) {
        console.error('Error fetching current campus:', error);
      }
    };

    if (activeCampusId) {
      fetchCampus(activeCampusId);
    } else {
      setCurrentCampus(null);
    }
  }, [activeCampusId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Check if a profile already exists for this UID
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          // Ensure safa@skill.edu has safa role and mdthaha213@gmail.com has master_admin role
          const userEmail = firebaseUser.email?.toLowerCase() || '';
          const isMasterAdminEmail = userEmail === 'mdthaha213@gmail.com' || userEmail === 'thaha@skill.edu' || userEmail === 'mdthaha@skill.edu' || userEmail === 'thahamd@skill.edu';
          const isAdminEmail = isMasterAdminEmail || userEmail === 'admin@skill.edu' || userEmail === 'admin@safa.edu';
          const isSafaEmail = userEmail === 'safa@skill.edu' || userEmail.endsWith('@safa.edu') || userEmail === 'safa@safa.edu';
          const isStaffEmail = userEmail.endsWith('@staff.edu') || 
            ['sharfuddin@skill.edu', 'sharafuddin@skill.edu', 'sharafuddinhudawi@skill.edu', 'anasp@skill.edu', 
             'zakirhudawi@skill.edu', 'ali@skill.edu', 'masoom@skill.edu', 'zakir@skill.edu', 'nayaz@skill.edu', 
             'saifullah@skill.edu', 'saifullahk@skill.edu', 'irfan@skill.edu', 'shuaib@skill.edu', 'latheef@skill.edu', 
             'salman@skill.edu', 'shefil@skill.edu', 'safwan@skill.edu', 'shibli@skill.edu', 'thaha@skill.edu', 
             'jawad@skill.edu', 'thahamd@skill.edu', 'mdthaha213@gmail.com', 'treasurer@skill.edu'].includes(userEmail);
          const isSkillEduEmail = userEmail.endsWith('@skill.edu');
          
          let finalProfile = data;
          
          try {
            if (isMasterAdminEmail && data.role !== 'master_admin') {
              finalProfile = { ...data, role: 'master_admin' as UserRole };
              await setDoc(doc(db, 'users', firebaseUser.uid), finalProfile);
            } else if (isAdminEmail && data.role !== 'admin' && data.role !== 'master_admin') {
              finalProfile = { ...data, role: 'admin' as UserRole };
              await setDoc(doc(db, 'users', firebaseUser.uid), finalProfile);
            } else if (isSafaEmail && data.role !== 'safa' && data.role !== 'admin' && data.role !== 'master_admin') {
              finalProfile = { ...data, role: 'safa' as UserRole };
              await setDoc(doc(db, 'users', firebaseUser.uid), finalProfile);
            } else if (isStaffEmail && data.role !== 'staff' && data.role !== 'admin' && data.role !== 'master_admin' && data.role !== 'safa') {
              finalProfile = { ...data, role: 'staff' as UserRole };
              await setDoc(doc(db, 'users', firebaseUser.uid), finalProfile);
            } else if (isSkillEduEmail && data.role !== 'student' && !isAdminEmail && !isSafaEmail && !isStaffEmail && data.role !== 'academic') {
              finalProfile = { ...data, role: 'student' as UserRole };
              await setDoc(doc(db, 'users', firebaseUser.uid), finalProfile);
            }
          } catch (writeErr) {
            console.error('Failed to update user role in Firestore:', writeErr);
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
          if (finalProfile.role === 'student' || finalProfile.role === 'safa' || finalProfile.role === 'staff') {
            const today = new Date().toISOString().split('T')[0];
            
            // Notification for admin
            const sessionKey = `notified_login_${firebaseUser.uid}`;
            if (!sessionStorage.getItem(sessionKey)) {
              addDoc(collection(db, 'loginNotifications'), {
                userId: firebaseUser.uid,
                userName: finalProfile.displayName || firebaseUser.displayName || 'User',
                userEmail: firebaseUser.email,
                role: finalProfile.role,
                timestamp: serverTimestamp()
              }).catch(console.error);
              sessionStorage.setItem(sessionKey, 'true');
            }

            if (finalProfile.role === 'student') {
              if (finalProfile.lastAccessDate !== today) {
              finalProfile = { ...finalProfile, dailyAccessCount: 1, lastAccessDate: today };
              await updateDoc(doc(db, 'users', firebaseUser.uid), { dailyAccessCount: 1, lastAccessDate: today });
            } else if ((finalProfile.dailyAccessCount || 0) < 7) {
              const newCount = (finalProfile.dailyAccessCount || 0) + 1;
              finalProfile = { ...finalProfile, dailyAccessCount: newCount };
              await updateDoc(doc(db, 'users', firebaseUser.uid), { dailyAccessCount: newCount });
            } else {
              // Block access - comment out for now to debug
              console.log('Access limit reached, but allowing access for debugging.');
              // await auth.signOut();
              // setProfile(null);
              // setLoading(false);
              // return;
            }
            }
          }
          
          setProfile(finalProfile);
        } else {
          // Check if registration is enabled
          const settingsDoc = await getDoc(doc(db, 'settings', 'system'));
          const registrationEnabled = settingsDoc.exists() ? settingsDoc.data().registrationEnabled !== false : true;

          const userEmail = firebaseUser.email?.toLowerCase() || '';
          const isMasterAdminEmail = userEmail === 'mdthaha213@gmail.com' || userEmail === 'thaha@skill.edu' || userEmail === 'mdthaha@skill.edu' || userEmail === 'thahamd@skill.edu';
          const isAdminEmail = isMasterAdminEmail || userEmail === 'admin@skill.edu' || userEmail === 'admin@safa.edu';
          const isSafaEmail = userEmail === 'safa@skill.edu' || userEmail.endsWith('@safa.edu') || userEmail === 'safa@safa.edu';
          const isStaffEmail = userEmail.endsWith('@staff.edu') || 
            ['sharfuddin@skill.edu', 'sharafuddin@skill.edu', 'sharafuddinhudawi@skill.edu', 'anasp@skill.edu', 
             'zakirhudawi@skill.edu', 'ali@skill.edu', 'masoom@skill.edu', 'zakir@skill.edu', 'nayaz@skill.edu', 
             'saifullah@skill.edu', 'saifullahk@skill.edu', 'irfan@skill.edu', 'shuaib@skill.edu', 'latheef@skill.edu', 
             'salman@skill.edu', 'shefil@skill.edu', 'safwan@skill.edu', 'shibli@skill.edu', 'thaha@skill.edu', 
             'jawad@skill.edu', 'thahamd@skill.edu', 'mdthaha213@gmail.com', 'treasurer@skill.edu'].includes(userEmail);
          const isSkillEduEmail = userEmail.endsWith('@skill.edu');
          
          let isPreRegisteredStudent = false;
          let linkedAdmissionNumber = '';
          if (userEmail) {
            const studentsRef = collection(db, 'students');
            const q = query(studentsRef, where('email', '==', userEmail));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              isPreRegisteredStudent = true;
              linkedAdmissionNumber = querySnapshot.docs[0].id;
            } else if (isSkillEduEmail) {
              const prefix = userEmail.split('@')[0];
              if (/^\d+$/.test(prefix)) {
                linkedAdmissionNumber = prefix;
                isPreRegisteredStudent = true;
              }
            }
          }

          if (registrationEnabled || isMasterAdminEmail || isAdminEmail || isSafaEmail || isStaffEmail || isPreRegisteredStudent || isSkillEduEmail) {
            // Create a default profile
            const newRole: UserRole = isMasterAdminEmail ? 'master_admin' : (isAdminEmail ? 'admin' : (isSafaEmail ? 'safa' : (isStaffEmail ? 'staff' : 'student')));
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: userEmail,
              displayName: firebaseUser.displayName || userEmail.split('@')[0] || 'New User',
              role: newRole,
              campusId: 'default', // Always assign to default campus for now to avoid undefined issues
              photoURL: firebaseUser.photoURL || '',
              admissionNumber: linkedAdmissionNumber || undefined,
              createdAt: new Date().toISOString()
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);

            // Notification for admin (newly registered)
            const sessionKey = `notified_login_${firebaseUser.uid}`;
            if (!sessionStorage.getItem(sessionKey)) {
              addDoc(collection(db, 'loginNotifications'), {
                userId: firebaseUser.uid,
                userName: newProfile.displayName,
                userEmail: newProfile.email,
                role: newProfile.role,
                timestamp: serverTimestamp()
              }).catch(console.error);
              sessionStorage.setItem(sessionKey, 'true');
            }
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
    isAdmin: profile?.role === 'admin' || profile?.role === 'master_admin',
    isStaff: profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'master_admin' || profile?.role === 'treasurer' || profile?.role === 'academic' || profile?.role === 'safa',
    isSafa: profile?.role === 'safa' || profile?.role === 'admin' || profile?.role === 'master_admin',
    isStudent: profile?.role === 'student',
    isAcademic: profile?.role === 'academic' || profile?.role === 'admin' || profile?.role === 'master_admin',
    isMasterAdmin: profile?.role === 'master_admin',
    campusId: activeCampusId,
    currentCampus,
    switchCampus: (cid: string) => {
      if (profile?.role === 'master_admin') {
        setSelectedCampusId(cid);
      }
    }
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
