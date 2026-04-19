import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, setDoc, getDocs, where, increment, serverTimestamp, limit, orderBy, writeBatch } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { UserProfile, UserRole, Club, Board, OfficeBearer, Student, CLASS_LIST } from '../types';
import { 
  Shield, 
  User, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Layout, 
  UserCircle, 
  UserPlus,
  Globe,
  Plus,
  Save,
  X,
  FileText,
  Edit2,
  Award,
  Send,
  Settings,
  Image as ImageIcon,
  Download,
  Lock,
  MessageCircle,
  Camera,
  ChevronUp,
  ChevronDown,
  Upload,
  BarChart3,
  ClipboardList,
  GraduationCap,
  Wallet,
  Search,
  Trophy,
  Calendar as CalendarIcon
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { ClubMember, BoardMember } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { ClubMemberBulkUpload } from '../components/ClubMemberBulkUpload';
import { StudentBulkUpload } from '../components/StudentBulkUpload';
import { BulkUpload } from '../components/BulkUpload';
import { ImageUpload } from '../components/ImageUpload';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

import { AdminDashboard } from '../components/AdminDashboard';
import { StaffDashboard } from '../components/StaffDashboard';
import { AdminSubmissions } from '../components/AdminSubmissions';
import { AdminGraceMarks } from '../components/AdminGraceMarks';
import SettingsPage from './admin/SettingsPage';
import { CCEMarksAdmin } from '../components/CCEMarksAdmin';



type Tab = 'dashboard' | 'profile' | 'gallery' | 'clubs' | 'boards' | 'calendar' | 'users' | 'staff' | 'club-points' | 'club-members' | 'students' | 'submissions' | 'gracemarks' | 'settings' | 'reports' | 'marks';

import { Card } from '../components/Card';
import { Button } from '../components/Button';

export default function AdminCommandCenter() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { settings, refreshContent } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [gallery, setGallery] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [studentSortField, setStudentSortField] = useState<'name' | 'admissionNumber' | 'class'>('name');
  const [studentSortDirection, setStudentSortDirection] = useState<'asc' | 'desc'>('asc');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [bearers, setBearers] = useState<OfficeBearer[]>([]);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ coll: string, id: string, title: string, message: string } | null>(null);

  // Form states
  const [newClub, setNewClub] = useState({ name: '', description: '', logoUrl: '' });
  const [newBoard, setNewBoard] = useState({ name: '', description: '' });
  const [newBearer, setNewBearer] = useState({ name: '', position: '', photoUrl: '' });
  
  // Member management states
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [newMember, setNewMember] = useState({ name: '', position: '', photoUrl: '' });
  const [newUserPhoto, setNewUserPhoto] = useState('');
  const [newStudentPhoto, setNewStudentPhoto] = useState('');

  // Edit states
  const [editingEntity, setEditingEntity] = useState<{ type: 'club' | 'board' | 'bearer' | 'user' | 'student', id: string, data: any } | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    // Handle tab from URL
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as Tab;
    if (tab) setActiveTab(tab);

    (window as any).setActiveTab = setActiveTab;

    return () => {
      delete (window as any).setActiveTab;
    };
  }, []);

  // Conditional Fetching to save quota
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'users' || activeTab === 'staff') {
          const snap = await getDocs(query(collection(db, 'users'), limit(100)));
          setUsers(snap.docs.map(doc => doc.data() as UserProfile));
        }

        if (activeTab === 'clubs' || activeTab === 'club-points' || activeTab === 'club-members' || activeTab === 'dashboard') {
          const snap = await getDocs(query(collection(db, 'clubs'), limit(50)));
          setClubs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));
        }

        if (activeTab === 'boards') {
          const snap = await getDocs(query(collection(db, 'boards'), limit(50)));
          setBoards(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board)));
          
          const membersSnap = await getDocs(query(collection(db, 'boardMembers'), limit(200)));
          setBoardMembers(membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BoardMember)));
        }

        if (activeTab === 'dashboard') {
          const snap = await getDocs(query(collection(db, 'officeBearers'), limit(50)));
          setBearers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OfficeBearer)));
        }

        if (activeTab === 'club-members' || activeTab === 'clubs') {
          const snap = await getDocs(query(collection(db, 'clubMembers'), limit(200)));
          setClubMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubMember)));
        }

        if (activeTab === 'students' || activeTab === 'dashboard') {
          const snap = await getDocs(query(collection(db, 'students'), limit(100)));
          setStudents(snap.docs.map(doc => doc.data() as Student));
        }

        if (activeTab === 'gallery') {
          const snap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc'), limit(50)));
          setGallery(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }

        if (activeTab === 'calendar') {
          const snap = await getDocs(query(collection(db, 'calendar'), orderBy('date', 'desc'), limit(50)));
          setCalendar(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setStatus({ type: 'success', msg: 'User role updated!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to update role.' });
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      const currentStatus = settings?.maintenanceMode || false;
      await setDoc(doc(db, 'settings', 'system'), { maintenanceMode: !currentStatus }, { merge: true });
      await refreshContent(true);
      setStatus({ type: 'success', msg: `Maintenance mode ${!currentStatus ? 'enabled' : 'disabled'}` });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to update maintenance mode.' });
    }
  };

  const handleDelete = async (coll: string, id: string) => {
    try {
      if (coll === 'portal_reset') {
        const collectionsToReset = ['students', 'workSubmissions', 'queries', 'skillClubEntries', 'programs'];
        for (const collectionName of collectionsToReset) {
          try {
            const snapshot = await getDocs(collection(db, collectionName));
            const batches = [];
            let currentBatch = writeBatch(db);
            let operationCount = 0;

            for (const docSnap of snapshot.docs) {
              currentBatch.delete(docSnap.ref);
              operationCount++;
              if (operationCount === 500) {
                batches.push(currentBatch);
                currentBatch = writeBatch(db);
                operationCount = 0;
              }
            }
            if (operationCount > 0) batches.push(currentBatch);
            for (const batch of batches) await batch.commit();
          } catch (err) {
            handleFirestoreError(err, OperationType.LIST, collectionName);
          }
        }
        // Mark student users as deleted
        const usersQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        try {
          const userSnapshot = await getDocs(usersQuery);
          const batches = [];
          let currentBatch = writeBatch(db);
          let operationCount = 0;

          for (const userSnap of userSnapshot.docs) {
            currentBatch.update(userSnap.ref, { deleted: true });
            operationCount++;
            if (operationCount === 500) {
              batches.push(currentBatch);
              currentBatch = writeBatch(db);
              operationCount = 0;
            }
          }
          if (operationCount > 0) batches.push(currentBatch);
          for (const batch of batches) await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, 'users');
        }
        setStatus({ type: 'success', msg: 'Portal reset successfully!' });
        setConfirmDelete(null);
        return;
      }

      if (coll === 'users') {
        const response = await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: id })
        });
        if (!response.ok) {
          const result = await response.json();
          let errorMsg = result.error || 'Failed to delete user from Auth';
          if (errorMsg.includes('identitytoolkit.googleapis.com') || errorMsg.includes('Identity Toolkit API')) {
            errorMsg = `Firebase Authentication (Identity Toolkit API) is not enabled. 
            
1. Enable it: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=531260372208
2. Click "Get Started" in Firebase Auth: https://console.firebase.google.com/project/gen-lang-client-0615445747/authentication
3. Wait 3-5 minutes.`;
          }
          throw new Error(errorMsg);
        }
      }
      try {
        await deleteDoc(doc(db, coll, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, coll);
      }
      setStatus({ type: 'success', msg: 'Item deleted!' });
      setConfirmDelete(null);
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to delete.' });
    }
  };

  const handleAddClub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'clubs'), newClub);
      setNewClub({ name: '', description: '', logoUrl: '' });
      setStatus({ type: 'success', msg: 'Club added!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add club.' });
    }
  };

  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'boards'), newBoard);
      setNewBoard({ name: '', description: '' });
      setStatus({ type: 'success', msg: 'Board added!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add board.' });
    }
  };

  const handleAddBearer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'officeBearers'), newBearer);
      setNewBearer({ name: '', position: '', photoUrl: '' });
      setStatus({ type: 'success', msg: 'Office bearer added!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add office bearer.' });
    }
  };

  const handleAddMember = async (e: React.FormEvent, type: 'club' | 'board') => {
    e.preventDefault();
    const parentId = type === 'club' ? selectedClub : selectedBoard;
    if (!parentId) return;

    try {
      const coll = type === 'club' ? 'clubMembers' : 'boardMembers';
      await addDoc(collection(db, coll), {
        ...newMember,
        [type === 'club' ? 'clubId' : 'boardId']: parentId
      });
      setNewMember({ name: '', position: '', photoUrl: '' });
      setStatus({ type: 'success', msg: 'Member added!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add member.' });
    }
  };

  const handleUpdateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntity) return;

    // Helper to remove undefined values recursively
    const clean = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const cleaned = Array.isArray(obj) ? [...obj] : { ...obj };
      
      Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === undefined) {
          delete cleaned[key];
        } else if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
          cleaned[key] = clean(cleaned[key]);
        }
      });
      return cleaned;
    };

    const cleanedData = clean(editingEntity.data);

    try {
      if (editingEntity.type === 'user') {
        await updateDoc(doc(db, 'users', editingEntity.id), cleanedData);
        
        // Update Auth Profile
        await fetch('/api/admin/update-user-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clean({ 
            uid: editingEntity.id, 
            displayName: cleanedData.displayName,
            photoURL: cleanedData.photoURL
          }))
        });

        if (newPassword) {
          await fetch('/api/admin/update-user-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: editingEntity.id, newPassword })
          });
        }
      } else if (editingEntity.type === 'student') {
        await updateDoc(doc(db, 'students', editingEntity.id), cleanedData);
        // Also update users collection if student has an account
        const user = users.find(u => u.admissionNumber === editingEntity.id);
        if (user) {
          await updateDoc(doc(db, 'users', user.uid), clean({
            displayName: cleanedData.name,
            photoURL: cleanedData.photoURL
          }));

          // Update Auth Profile
          const authResponse = await fetch('/api/admin/update-user-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clean({ 
              uid: user.uid, 
              displayName: cleanedData.name,
              photoURL: cleanedData.photoURL
            }))
          });
          if (!authResponse.ok) {
            const result = await authResponse.json();
            let errorMsg = result.error || 'Failed to update Auth profile';
            if (errorMsg.includes('identitytoolkit.googleapis.com') || errorMsg.includes('Identity Toolkit API')) {
              errorMsg = `Firebase Authentication (Identity Toolkit API) is not enabled. 
              
1. Enable it: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=531260372208
2. Click "Get Started" in Firebase Auth: https://console.firebase.google.com/project/gen-lang-client-0615445747/authentication
3. Wait 3-5 minutes.`;
            }
            throw new Error(errorMsg);
          }

          if (newPassword) {
            const passResponse = await fetch('/api/admin/update-user-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: user.uid, newPassword })
            });
            if (!passResponse.ok) {
              const result = await passResponse.json();
              let errorMsg = result.error || 'Failed to update password';
              if (errorMsg.includes('identitytoolkit.googleapis.com') || errorMsg.includes('Identity Toolkit API')) {
                errorMsg = `Firebase Authentication (Identity Toolkit API) is not enabled. 
                
1. Enable it: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=531260372208
2. Click "Get Started" in Firebase Auth: https://console.firebase.google.com/project/gen-lang-client-0615445747/authentication
3. Wait 3-5 minutes.`;
              }
              throw new Error(errorMsg);
            }
          }
        }
      } else {
        const coll = editingEntity.type === 'club' ? 'clubs' : 
                     editingEntity.type === 'board' ? 'boards' : 'officeBearers';
        await updateDoc(doc(db, coll, editingEntity.id), cleanedData);
      }
      setEditingEntity(null);
      setNewPassword('');
      setStatus({ type: 'success', msg: 'Updated successfully!' });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', msg: 'Update failed.' });
    }
  };

  const handleResetPortal = async () => {
    setLoading(true);
    try {
      const collectionsToClear = [
        'users', 'clubs', 'boards', 'officeBearers', 'clubMembers', 
        'boardMembers', 'siteContent', 'clubPoints', 'students', 'skillClubEntries', 'programs', 'gallery', 'queries', 'notifications'
      ];

      for (const collName of collectionsToClear) {
        // Fetch only IDs to reduce read payload, though Firestore still counts as full reads
        const snap = await getDocs(collection(db, collName));
        
        const batches = [];
        let currentBatch = writeBatch(db);
        let operationCount = 0;

        for (const docSnap of snap.docs) {
          // Don't delete the current user from Firestore
          if (collName === 'users' && docSnap.id === profile?.uid) continue;
          
          // If it's a user, delete from Auth via API
          if (collName === 'users') {
            const response = await fetch('/api/admin/delete-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: docSnap.id })
            });
            if (!response.ok) {
              const result = await response.json();
              let errorMsg = result.error || 'Failed to delete user from Auth';
              if (errorMsg.includes('identitytoolkit.googleapis.com') || errorMsg.includes('Identity Toolkit API')) {
                errorMsg = `Firebase Authentication (Identity Toolkit API) is not enabled. 
                
1. Enable it: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=531260372208
2. Click "Get Started" in Firebase Auth: https://console.firebase.google.com/project/gen-lang-client-0615445747/authentication
3. Wait 3-5 minutes.`;
              }
              throw new Error(errorMsg);
            }
          }

          currentBatch.delete(docSnap.ref);
          operationCount++;
          
          if (operationCount === 500) {
            batches.push(currentBatch);
            currentBatch = writeBatch(db);
            operationCount = 0;
          }
        }

        if (operationCount > 0) {
          batches.push(currentBatch);
        }

        for (const batch of batches) {
          await batch.commit();
        }
      }

      setStatus({ type: 'success', msg: 'Portal reset successfully!' });
      setConfirmDelete(null);
    } catch (error) {
      console.error('Reset failed:', error);
      setStatus({ type: 'error', msg: 'Failed to reset portal.' });
    } finally {
      setLoading(false);
    }
  };

  const [newStaffData, setNewStaffData] = useState({ name: '', phone: '', email: '', role: 'staff' });
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingStaff(true);
    try {
      const email = newStaffData.email || `staff_${newStaffData.phone}@skill.edu`;
      const password = newStaffData.phone || 'password123';

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName: newStaffData.name,
          role: newStaffData.role,
          phone: newStaffData.phone
        })
      });

      const result = await response.json();
      if (!response.ok) {
        let errorMsg = result.error || 'Failed to create staff in Auth';
        if (errorMsg.includes('identitytoolkit.googleapis.com') || errorMsg.includes('Identity Toolkit API')) {
          errorMsg = `Firebase Authentication (Identity Toolkit API) is not enabled. 
          
1. Enable it: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=531260372208
2. Click "Get Started" in Firebase Auth: https://console.firebase.google.com/project/gen-lang-client-0615445747/authentication
3. Wait 3-5 minutes.`;
        }
        throw new Error(errorMsg);
      }

      const uid = result.uid;
      const newStaffRef = doc(db, 'users', uid);
      
      try {
        await setDoc(newStaffRef, {
          uid,
          email,
          displayName: newStaffData.name,
          role: newStaffData.role,
          phone: newStaffData.phone,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'users');
      }
      
      setStatus({ type: 'success', msg: `Staff ${newStaffData.name} created successfully!` });
      setNewStaffData({ name: '', phone: '', email: '', role: 'staff' });
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Failed to create staff.' });
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const renderProfile = () => {
    if (!profile) return null;
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-8">
        <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <User size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-900">My Profile Settings</h3>
              <p className="text-sm text-stone-500">Update your personal information and photo</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-6 mb-10">
            <div className="relative group">
              <img 
                src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName || 'User'}&background=random`} 
                className="w-32 h-32 rounded-full object-cover border-4 border-emerald-50 shadow-lg"
                alt="Profile"
              />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="text-white" size={24} />
              </div>
            </div>
            <div className="text-center">
              <h4 className="text-lg font-bold text-stone-900">{profile.displayName || 'Unnamed Admin'}</h4>
              <p className="text-sm text-stone-500">{profile.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                {profile.role}
              </span>
            </div>
          </div>

          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get('displayName') as string;
              const photo = formData.get('photoURL') as string;
              
              try {
                setLoading(true);
                // Update Firestore
                await updateDoc(doc(db, 'users', profile.uid), {
                  displayName: name,
                  photoURL: photo
                });

                // Update Auth Profile
                await fetch('/api/admin/update-user-profile', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    uid: profile.uid, 
                    displayName: name,
                    photoURL: photo
                  })
                });

                setStatus({ type: 'success', msg: 'Profile updated successfully!' });
              } catch (error) {
                setStatus({ type: 'error', msg: 'Failed to update profile.' });
              } finally {
                setLoading(false);
              }
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase ml-1">Display Name</label>
              <input 
                name="displayName"
                defaultValue={profile.displayName || ''}
                placeholder="Your Full Name" 
                className="w-full px-6 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-stone-50" 
                required 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase ml-1">Profile Photo URL</label>
              <div className="space-y-4">
                <input 
                  name="photoURL"
                  id="profilePhotoInput"
                  defaultValue={profile.photoURL || ''}
                  placeholder="https://example.com/photo.jpg" 
                  className="w-full px-6 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-stone-50" 
                />
                <div className="p-6 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 hover:border-emerald-300 transition-colors">
                  <p className="text-[10px] text-stone-400 mb-4 uppercase font-black tracking-widest text-center">Or Upload New Photo</p>
                  <ImageUpload 
                    label="Upload Photo"
                    onUpload={(url) => {
                      const input = document.getElementById('profilePhotoInput') as HTMLInputElement;
                      if (input) input.value = url;
                    }} 
                  />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full py-4 rounded-2xl text-lg shadow-lg shadow-emerald-100">
              {loading ? 'Saving Changes...' : 'Save Profile Changes'}
            </Button>
          </form>
        </div>
      </div>
    );
  };

  const handleStudentSort = (field: 'name' | 'admissionNumber' | 'class') => {
    if (studentSortField === field) {
      setStudentSortDirection(studentSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setStudentSortField(field);
      setStudentSortDirection('asc');
    }
  };

  const renderDashboard = () => role === 'staff' ? <StaffDashboard /> : <AdminDashboard />;
  const renderSubmissions = () => <AdminSubmissions />;
  const renderGracemarks = () => <AdminGraceMarks />;
  const renderSettings = () => <SettingsPage />;

  const renderGallery = () => (
    <div className="space-y-8">
      <div className="p-8 bg-stone-50 rounded-3xl border border-stone-100 shadow-inner">
        <h3 className="text-sm font-black uppercase tracking-widest text-stone-900 mb-6 flex items-center gap-2">
          <Plus size={16} className="text-emerald-600" /> Add Gallery Image
        </h3>
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const title = formData.get('title') as string;
            const url = formData.get('url') as string;
            try {
              setLoading(true);
              await addDoc(collection(db, 'gallery'), { title, url, createdAt: new Date().toISOString() });
              setStatus({ type: 'success', msg: 'Image added to gallery!' });
              (e.target as HTMLFormElement).reset();
            } catch (error) {
              setStatus({ type: 'error', msg: 'Failed to add image.' });
            } finally {
              setLoading(false);
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="space-y-4">
            <input name="title" placeholder="Image Title" className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500" required />
            <input name="url" id="galleryUrlInput" placeholder="Image URL" className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500" required />
          </div>
          <div className="p-6 bg-white rounded-2xl border-2 border-dashed border-stone-200 hover:border-emerald-300 transition-colors">
            <ImageUpload 
              label="Upload Image"
              onUpload={(url) => {
                const input = document.getElementById('galleryUrlInput') as HTMLInputElement;
                if (input) input.value = url;
              }} 
            />
          </div>
          <Button type="submit" className="md:col-span-2">Add to Gallery</Button>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {gallery.map(img => (
          <div key={img.id} className="relative group aspect-square rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
            <img src={img.url} alt={img.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
              <p className="text-white text-xs font-bold mb-2">{img.title}</p>
              <Button 
                variant="danger" 
                size="sm"
                onClick={() => setConfirmDelete({
                  coll: 'gallery',
                  id: img.id!,
                  title: 'Delete Image?',
                  message: 'Are you sure you want to delete this image?'
                })}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-8">
      <Card className="p-8">
        <h3 className="text-xl font-black text-stone-900 mb-6">Automated Reporting</h3>
        <p className="text-stone-500 mb-8 font-medium">Generate and download comprehensive PDF reports of student performance and club activities.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 border-2 border-stone-100 hover:border-emerald-500 transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <Users size={24} />
              </div>
              <div>
                <h4 className="font-black text-stone-900">Student Performance</h4>
                <p className="text-xs text-stone-500 font-bold uppercase tracking-widest">Full Directory</p>
              </div>
            </div>
            <Button onClick={() => generateStudentReport()} className="w-full flex items-center justify-center gap-2">
              <Download size={18} /> Download PDF
            </Button>
          </Card>

          <Card className="p-6 border-2 border-stone-100 hover:border-emerald-500 transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-all">
                <Trophy size={24} />
              </div>
              <div>
                <h4 className="font-black text-stone-900">Club Standings</h4>
                <p className="text-xs text-stone-500 font-bold uppercase tracking-widest">Points & Rankings</p>
              </div>
            </div>
            <Button onClick={() => generateClubReport()} className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800">
              <Download size={18} /> Download PDF
            </Button>
          </Card>
        </div>
      </Card>
    </div>
  );

  const generateStudentReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Safa Union Student Performance Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    
    (doc as any).autoTable({
      startY: 40,
      head: [['Admission', 'Name', 'Class', 'Total Points', 'Badges']],
      body: students.map(s => [
        s.admissionNumber, 
        s.name, 
        s.class, 
        s.totalPoints || 0,
        (s.badges || []).length
      ]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
    });
    doc.save('student_performance_report.pdf');
  };

  const generateClubReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Safa Union Club Performance Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    
    (doc as any).autoTable({
      startY: 40,
      head: [['Club Name', 'Total Points', 'Description']],
      body: clubs.map(c => [
        c.name, 
        c.totalPoints || 0,
        c.description
      ]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
    });
    doc.save('club_performance_report.pdf');
  };

  const renderClubs = () => (
    <div className="space-y-8">
      <form onSubmit={handleAddClub} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-6 rounded-2xl border border-stone-100">
        <input 
          placeholder="Club Name" 
          className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
          value={newClub.name}
          onChange={e => setNewClub({...newClub, name: e.target.value})}
          required
        />
        <textarea 
          placeholder="Description" 
          className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
          value={newClub.description}
          onChange={e => setNewClub({...newClub, description: e.target.value})}
          required
        />
        <Button type="submit" className="md:col-span-2">
          <Plus size={18} /> Add Club
        </Button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clubs.map(club => (
          <div key={club.id} className="flex flex-col p-4 border border-stone-100 rounded-2xl hover:bg-stone-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Globe size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900">{club.name}</h3>
                  <p className="text-xs text-stone-500 line-clamp-1">{club.description}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="ghost"
                  onClick={() => setEditingEntity({ type: 'club', id: club.id, data: { name: club.name, description: club.description } })}
                  className="p-2"
                >
                  <Edit2 size={18} />
                </Button>
                <Button 
                  variant="danger"
                  onClick={() => setConfirmDelete({
                    coll: 'clubs',
                    id: club.id!,
                    title: 'Delete Club?',
                    message: `Are you sure you want to delete ${club.name}?`
                  })} 
                  className="p-2"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>

            <Button 
              variant="ghost"
              onClick={() => setSelectedClub(selectedClub === club.id ? null : club.id)}
              className="text-xs font-bold text-emerald-600 hover:underline text-left"
            >
              {selectedClub === club.id ? 'Hide Members' : 'Manage Members'}
            </Button>

            {selectedClub === club.id && (
              <div className="mt-4 pt-4 border-t border-stone-100 space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {clubMembers.filter(m => m.clubId === club.id).map(member => (
                    <div key={member.id} className="flex items-center justify-between bg-white p-2 rounded-xl border border-stone-100">
                      <div className="flex items-center gap-2">
                        <img src={member.photoUrl || `https://ui-avatars.com/api/?name=${member.name}&background=random`} className="w-6 h-6 rounded-full" alt="" />
                        <span className="text-sm font-medium">{member.name} ({member.position})</span>
                      </div>
                      <Button 
                        variant="danger"
                        onClick={() => setConfirmDelete({
                          coll: 'clubMembers',
                          id: member.id,
                          title: 'Remove Member?',
                          message: `Are you sure you want to remove ${member.name}?`
                        })} 
                        className="p-1"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
                <form onSubmit={(e) => handleAddMember(e, 'club')} className="space-y-4 bg-white p-4 rounded-2xl border border-stone-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input 
                      placeholder="Member Name" 
                      className="w-full text-sm px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newMember.name}
                      onChange={e => setNewMember({...newMember, name: e.target.value})}
                      required
                    />
                    <input 
                      placeholder="Position" 
                      className="w-full text-sm px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newMember.position}
                      onChange={e => setNewMember({...newMember, position: e.target.value})}
                      required
                    />
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <ImageUpload
                        label="Member Photo"
                        onUpload={(base64) => setNewMember({ ...newMember, photoUrl: base64 })}
                        currentImageUrl={newMember.photoUrl}
                      />
                    </div>
                    <Button type="submit" className="h-[42px]">
                      Add Member
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderClubMembers = () => (
    <div className="space-y-8">
      <div className="p-8 bg-stone-50 rounded-3xl border border-stone-100 shadow-inner">
        <h3 className="text-sm font-black uppercase tracking-widest text-stone-900 mb-6 flex items-center gap-2">
          <Users size={16} className="text-emerald-600" /> Bulk Upload Club Members
        </h3>
        <ClubMemberBulkUpload onUpload={() => setStatus({ type: 'success', msg: 'Members uploaded successfully!' })} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clubMembers.map(member => (
          <div key={member.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-stone-100 hover:shadow-md transition-all group">
            <img src={member.photoUrl || `https://ui-avatars.com/api/?name=${member.name}&background=random`} className="w-12 h-12 rounded-xl object-cover" alt="" />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-stone-900 truncate">{member.name}</h4>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{member.position}</p>
              <p className="text-[10px] text-stone-400 uppercase tracking-widest">{clubs.find(c => c.id === member.clubId)?.name || 'Unknown Club'}</p>
            </div>
            <Button 
              variant="danger" 
              size="sm"
              onClick={() => setConfirmDelete({
                coll: 'clubMembers',
                id: member.id,
                title: 'Remove Member?',
                message: `Are you sure you want to remove ${member.name}?`
              })}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBoards = () => (
    <div className="space-y-8">
      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-emerald-800 text-sm">
        <strong>Note:</strong> These are Safa Union boards (e.g. Library Board, Language Board, SRDB, Publishing Bureau).
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs font-bold text-stone-400 uppercase py-2">Quick Add:</span>
        {['Library Board', 'Language Board', 'SRDB', 'Publishing Bureau'].map(name => (
          <Button
            key={name}
            variant="ghost"
            onClick={async () => {
              try {
                await addDoc(collection(db, 'boards'), { name, description: `Official Safa Union ${name}` });
                setStatus({ type: 'success', msg: `${name} added!` });
              } catch (error) {
                setStatus({ type: 'error', msg: 'Failed to add board.' });
              }
            }}
            className="px-3 py-1 bg-stone-100 text-stone-600 rounded-lg text-xs font-bold hover:bg-stone-200 transition-all"
          >
            + {name}
          </Button>
        ))}
      </div>
      <form onSubmit={handleAddBoard} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-6 rounded-2xl border border-stone-100">
        <input 
          placeholder="Board Name" 
          className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
          value={newBoard.name}
          onChange={e => setNewBoard({...newBoard, name: e.target.value})}
          required
        />
        <textarea 
          placeholder="Description" 
          className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
          value={newBoard.description}
          onChange={e => setNewBoard({...newBoard, description: e.target.value})}
          required
        />
        <Button type="submit" className="md:col-span-2">
          <Plus size={18} /> Add Board
        </Button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {boards.map(board => (
          <div key={board.id} className="flex flex-col p-4 border border-stone-100 rounded-2xl hover:bg-stone-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Layout size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900">{board.name}</h3>
                  <p className="text-xs text-stone-500 line-clamp-1">{board.description}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="ghost"
                  onClick={() => setEditingEntity({ type: 'board', id: board.id, data: { name: board.name, description: board.description } })}
                  className="p-2"
                >
                  <Edit2 size={18} />
                </Button>
                <Button 
                  variant="danger"
                  onClick={() => setConfirmDelete({
                    coll: 'boards',
                    id: board.id!,
                    title: 'Delete Board?',
                    message: `Are you sure you want to delete ${board.name}?`
                  })} 
                  className="p-2"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>

            <Button 
              variant="ghost"
              onClick={() => setSelectedBoard(selectedBoard === board.id ? null : board.id)}
              className="text-xs font-bold text-emerald-600 hover:underline text-left"
            >
              {selectedBoard === board.id ? 'Hide Members' : 'Manage Members'}
            </Button>

            {selectedBoard === board.id && (
              <div className="mt-4 pt-4 border-t border-stone-100 space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {boardMembers.filter(m => m.boardId === board.id).map(member => (
                    <div key={member.id} className="flex items-center justify-between bg-white p-2 rounded-xl border border-stone-100">
                      <div className="flex items-center gap-2">
                        <img src={member.photoUrl || `https://ui-avatars.com/api/?name=${member.name}&background=random`} className="w-6 h-6 rounded-full" alt="" />
                        <span className="text-sm font-medium">{member.name} ({member.position})</span>
                      </div>
                      <Button 
                        variant="danger"
                        onClick={() => setConfirmDelete({
                          coll: 'boardMembers',
                          id: member.id,
                          title: 'Remove Member?',
                          message: `Are you sure you want to remove ${member.name}?`
                        })} 
                        className="p-1"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
                <form onSubmit={(e) => handleAddMember(e, 'board')} className="space-y-4 bg-white p-4 rounded-2xl border border-stone-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input 
                      placeholder="Member Name" 
                      className="w-full text-sm px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newMember.name}
                      onChange={e => setNewMember({...newMember, name: e.target.value})}
                      required
                    />
                    <input 
                      placeholder="Position" 
                      className="w-full text-sm px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newMember.position}
                      onChange={e => setNewMember({...newMember, position: e.target.value})}
                      required
                    />
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <ImageUpload
                        label="Member Photo"
                        onUpload={(base64) => setNewMember({ ...newMember, photoUrl: base64 })}
                        currentImageUrl={newMember.photoUrl}
                      />
                    </div>
                    <Button type="submit" className="h-[42px]">
                      Add Member
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStaff = () => (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-stone-900">Staff Management</h3>
      </div>

      {/* Add Staff Form */}
      <div className="p-8 bg-stone-50 rounded-3xl border border-stone-100 shadow-inner">
        <h3 className="text-sm font-black uppercase tracking-widest text-stone-900 mb-6 flex items-center gap-2">
          <Plus size={16} className="text-emerald-600" /> Add New Staff
        </h3>
        <form onSubmit={handleCreateStaff} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-stone-400 uppercase ml-1">Full Name</label>
            <input 
              value={newStaffData.name}
              onChange={e => setNewStaffData({...newStaffData, name: e.target.value})}
              placeholder="Staff Name" 
              className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white" 
              required 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-stone-400 uppercase ml-1">Email Address</label>
            <input 
              type="email"
              value={newStaffData.email}
              onChange={e => setNewStaffData({...newStaffData, email: e.target.value})}
              placeholder="e.g. staff@skill.edu" 
              className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white" 
              required 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-stone-400 uppercase ml-1">Phone Number</label>
            <input 
              value={newStaffData.phone}
              onChange={e => setNewStaffData({...newStaffData, phone: e.target.value})}
              placeholder="Phone (will be password)" 
              className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white" 
              required 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-stone-400 uppercase ml-1">Role</label>
            <select 
              value={newStaffData.role}
              onChange={e => setNewStaffData({...newStaffData, role: e.target.value})}
              className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              required
            >
              <option value="staff">Staff Member</option>
              <option value="treasurer">Treasurer</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <Button type="submit" className="md:col-span-4 h-14 rounded-2xl shadow-lg shadow-emerald-100" disabled={isCreatingStaff}>
            {isCreatingStaff ? 'Creating...' : 'Create Staff Account'}
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.filter(u => ['staff', 'treasurer', 'admin'].includes(u.role)).map(user => (
          <div key={user.uid} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-stone-100 hover:shadow-md transition-all group cursor-pointer" onClick={() => setEditingEntity({ type: 'user', id: user.uid, data: user })}>
            <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400">
              <Shield size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-stone-900 truncate">{user.displayName || 'Unnamed Staff'}</h4>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{user.role}</p>
              <p className="text-[10px] text-stone-400 truncate">{user.email}</p>
            </div>
            <Button 
              variant="danger" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete({
                  coll: 'users',
                  id: user.uid,
                  title: 'Delete Staff?',
                  message: `Are you sure you want to delete ${user.displayName}?`
                });
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(user => (
          <div key={user.uid} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`} 
                className="w-14 h-14 rounded-2xl object-cover shadow-inner" 
                alt="" 
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-stone-900 truncate">{user.displayName || 'Anonymous'}</h4>
                <p className="text-xs text-stone-400 truncate">{user.email}</p>
              </div>
              <Button 
                variant="danger" 
                size="sm"
                onClick={() => setConfirmDelete({
                  coll: 'users',
                  id: user.uid,
                  title: 'Delete User?',
                  message: `Are you sure you want to delete ${user.displayName}?`
                })}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </Button>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-stone-50">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                  user.role === 'admin' ? 'bg-rose-100 text-rose-600' :
                  user.role === 'staff' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-stone-100 text-stone-600'
                }`}>
                  {user.role}
                </span>
              </div>
              <select 
                value={user.role}
                onChange={async (e) => {
                  try {
                    setLoading(true);
                    await updateDoc(doc(db, 'users', user.uid), { role: e.target.value });
                    setStatus({ type: 'success', msg: 'Role updated!' });
                  } catch (error) {
                    setStatus({ type: 'error', msg: 'Failed to update role.' });
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-xs font-bold text-stone-500 bg-stone-50 px-2 py-1 rounded-lg outline-none border-none"
              >
                <option value="student">Student</option>
                <option value="staff">Staff</option>
                <option value="treasurer">Treasurer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );





  const renderStudents = () => {
    const filteredStudents = students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                            student.admissionNumber.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesClass = selectedClass === 'All' || student.class === selectedClass;
      return matchesSearch && matchesClass;
    });

    const classCounts = CLASS_LIST.reduce((acc, cls) => {
      acc[cls] = students.filter(s => s.class === cls).length;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="space-y-8">
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Search by name or admission number..." 
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="flex-grow px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <select 
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="All">All Classes</option>
            {CLASS_LIST.map(cls => <option key={cls} value={cls}>{cls} ({classCounts[cls] || 0})</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {CLASS_LIST.map(cls => (
            <div key={cls} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
              <p className="text-[10px] font-black text-stone-400 uppercase">{cls}</p>
              <p className="text-2xl font-bold text-stone-900">{classCounts[cls] || 0}</p>
            </div>
          ))}
        </div>

        <div className="p-8 bg-stone-50 rounded-3xl border border-stone-100 shadow-inner">
          <h3 className="text-sm font-black uppercase tracking-widest text-stone-900 mb-6 flex items-center gap-2">
            <Plus size={16} className="text-emerald-600" /> Add New Student
          </h3>
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get('name') as string;
              const admissionNumber = formData.get('admissionNumber') as string;
              const studentClass = formData.get('class') as string;
              const email = formData.get('email') as string;

              try {
                setLoading(true);
                
                const q = query(collection(db, 'students'), where('admissionNumber', '==', admissionNumber));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                  setStatus({ type: 'error', msg: 'Admission number already exists.' });
                  setLoading(false);
                  return;
                }

                await setDoc(doc(db, 'students', admissionNumber), {
                  name,
                  admissionNumber,
                  class: studentClass,
                  email,
                  totalPoints: 0,
                  categoryPoints: {},
                  badges: [],
                  uid: '',
                  createdAt: new Date().toISOString()
                });

                setStatus({ type: 'success', msg: `Student ${name} added successfully!` });
                e.currentTarget.reset();
              } catch (err: any) {
                setStatus({ type: 'error', msg: err.message || 'Failed to add student.' });
              } finally {
                setLoading(false);
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <div className="space-y-1">
              <label className="text-[10px] font-black text-stone-400 uppercase ml-1">Full Name</label>
              <input name="name" placeholder="Student Name" className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-stone-400 uppercase ml-1">Admission Number</label>
              <input name="admissionNumber" placeholder="e.g. 1234" className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-stone-400 uppercase ml-1">Class</label>
              <select name="class" className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                <option value="">Select Class</option>
                {CLASS_LIST.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-stone-400 uppercase ml-1">Email</label>
              <input name="email" type="email" placeholder="student@skill.edu" className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white" />
            </div>
            
            <div className="flex items-end">
              <Button type="submit" disabled={loading} className="w-full py-3.5">
                {loading ? 'Adding...' : 'Add Student'}
              </Button>
            </div>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Admission No.</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Class</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filteredStudents.map((student) => (
                <tr key={student.admissionNumber} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-stone-900">{student.name}</td>
                  <td className="px-6 py-4 text-sm text-stone-500 font-mono">{student.admissionNumber}</td>
                  <td className="px-6 py-4 text-sm text-stone-500 font-bold">{student.class || 'N/A'}</td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingEntity({ type: 'student', id: student.admissionNumber!, data: student })}>
                      <Edit2 size={14} />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setConfirmDelete({ coll: 'students', id: student.admissionNumber!, title: 'Delete Student?', message: `Are you sure you want to delete ${student.name}?` })}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <Button variant="secondary" className="flex items-center gap-2">
            <Upload size={18} /> Import CSV/Excel/PDF
          </Button>
        </div>
      </div>
    );
  };

  const renderCalendar = () => (
    <div className="space-y-8">
      <div className="p-8 bg-stone-50 rounded-3xl border border-stone-100 shadow-inner">
        <h3 className="text-sm font-black uppercase tracking-widest text-stone-900 mb-6 flex items-center gap-2">
          <CalendarIcon size={16} className="text-emerald-600" /> Add Calendar Event
        </h3>
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const title = formData.get('title') as string;
            const date = formData.get('date') as string;
            const type = formData.get('type') as string;
            try {
              setLoading(true);
              await addDoc(collection(db, 'calendar'), { title, date, type, createdAt: new Date().toISOString() });
              setStatus({ type: 'success', msg: 'Event added to calendar!' });
              (e.target as HTMLFormElement).reset();
            } catch (error) {
              setStatus({ type: 'error', msg: 'Failed to add event.' });
            } finally {
              setLoading(false);
            }
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <input name="title" placeholder="Event Title" className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500" required />
          <input name="date" type="date" className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500" required />
          <select name="type" className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white" required>
            <option value="exam">Examination</option>
            <option value="holiday">Holiday</option>
            <option value="event">Event</option>
            <option value="other">Other</option>
          </select>
          <Button type="submit" className="md:col-span-3">Add Event</Button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {calendar.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(event => (
          <div key={event.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-stone-100 hover:shadow-md transition-all group">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              event.type === 'exam' ? 'bg-rose-100 text-rose-600' :
              event.type === 'holiday' ? 'bg-emerald-100 text-emerald-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              <CalendarIcon size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-stone-900 truncate">{event.title}</h4>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{new Date(event.date).toLocaleDateString()}</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{event.type}</p>
            </div>
            <Button 
              variant="danger" 
              size="sm"
              onClick={() => setConfirmDelete({
                coll: 'calendar',
                id: event.id!,
                title: 'Delete Event?',
                message: `Are you sure you want to delete ${event.title}?`
              })}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderClubPoints = () => (
    <div className="space-y-8">
      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-emerald-800 text-sm">
        <strong>Note:</strong> Manage points for each club. These points reflect on the public scoreboard.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs.map(club => (
          <div key={club.id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Globe size={24} />
              </div>
              <div>
                <h4 className="font-bold text-stone-900">{club.name}</h4>
                <p className="text-xs text-stone-400">Current Points: <span className="font-black text-emerald-600">{club.points || 0}</span></p>
              </div>
            </div>
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const points = parseInt(formData.get('points') as string);
                try {
                  setLoading(true);
                  await updateDoc(doc(db, 'clubs', club.id!), { points: (club.points || 0) + points });
                  setStatus({ type: 'success', msg: `Added ${points} points to ${club.name}` });
                  (e.target as HTMLFormElement).reset();
                } catch (error) {
                  setStatus({ type: 'error', msg: 'Failed to update points.' });
                } finally {
                  setLoading(false);
                }
              }}
              className="flex gap-2"
            >
              <input 
                name="points" 
                type="number" 
                placeholder="Add points" 
                className="flex-1 px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500" 
                required 
              />
              <Button type="submit">Add</Button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 space-y-4">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-stone-500 font-bold animate-pulse">Loading Safa Dashboard...</p>
    </div>
  );

  const role = profile?.role || 'student';
  const menuGroups = [
    {
      title: 'Dashboard',
      items: [
        { id: 'dashboard', label: 'Overview', icon: BarChart3 },
      ]
    },
    {
      title: 'Academic',
      items: [
        ...(role === 'admin' || role === 'academic' || role === 'safa' || role === 'treasurer' ? [
          { id: 'submissions', label: 'Submissions', icon: FileText },
          { id: 'gracemarks', label: 'Grace Marks', icon: Award },
          { id: 'marks', label: 'CCE Marks', icon: ClipboardList },
          { id: 'reports', label: 'Reports', icon: ClipboardList },
        ] : []),
      ]
    },
    ...(role === 'admin' || role === 'staff' ? [{
      title: 'User Management',
      items: [
        { id: 'students', label: 'Add New Student', icon: Users },
        { id: 'users', label: 'User Profiles', icon: UserCircle },
        { id: 'staff', label: 'Staff Members', icon: Shield },
        { id: 'clubs', label: 'Clubs', icon: Globe },
        { id: 'club-members', label: 'Club Members', icon: Users },
        { id: 'club-points', label: 'Club Points', icon: Award },
        { id: 'boards', label: 'Boards', icon: Layout },
      ]
    }] : []),
    {
      title: 'System',
      items: [
        { id: 'calendar', label: 'Calendar', icon: GraduationCap },
        { id: 'gallery', label: 'Gallery', icon: ImageIcon },
        { id: 'profile', label: 'My Profile', icon: User },
        ...(role === 'admin' ? [{ id: 'settings', label: 'Portal Settings', icon: Settings, isLink: true }] : []),
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-80 bg-[#141414] text-[#E4E3E0] flex flex-col h-screen sticky top-0 overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-900/50">
              <Shield size={20} />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Admin Portal</h2>
          </div>
          <p className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] ml-1">Command Center</p>
        </div>

        <nav className="flex-1 px-4 pb-8 space-y-8">
          {menuGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="px-4 text-[10px] font-black text-stone-600 uppercase tracking-[0.2em]">{group.title}</h3>
              <div className="space-y-1">
                {group.items.filter(item => item.id !== 'settings').map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.isLink) {
                        navigate('/admin/settings');
                      } else {
                        setActiveTab(item.id as Tab);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                      activeTab === item.id 
                        ? 'bg-emerald-500 text-white' 
                        : 'text-stone-400 hover:bg-stone-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-stone-500 group-hover:text-white'} />
                      <span className="font-bold text-sm tracking-tight">{item.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-6 border-t border-stone-800">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-stone-500 hover:text-rose-400 hover:bg-rose-950/50"
            onClick={() => auth.signOut()}
          >
            <X size={18} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        {status && (
          <div className={`mb-8 p-6 rounded-3xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300 ${
            status.type === 'success' ? 'bg-emerald-900/10 text-emerald-700 border border-emerald-500/20' : 'bg-rose-900/10 text-rose-700 border border-rose-500/20'
          }`}>
            <div className="flex items-center gap-3">
              {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              <p className="font-bold">{status.msg}</p>
            </div>
            <button onClick={() => setStatus(null)} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>
        )}

        <div className="animate-in fade-in duration-500 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'submissions' && renderSubmissions()}
          {activeTab === 'gracemarks' && renderGracemarks()}
          {activeTab === 'marks' && <CCEMarksAdmin />}
          {activeTab === 'students' && renderStudents()}
          {activeTab === 'staff' && renderStaff()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'clubs' && renderClubs()}
          {activeTab === 'boards' && renderBoards()}
          {activeTab === 'club-members' && renderClubMembers()}
          {activeTab === 'calendar' && renderCalendar()}
          {activeTab === 'gallery' && renderGallery()}
          {activeTab === 'profile' && renderProfile()}
          {activeTab === 'club-points' && renderClubPoints()}
          {activeTab === 'settings' && renderSettings()}
          {activeTab === 'reports' && renderReports()}
        </div>
      </div>



      {/* Edit Modal */}
      {editingEntity && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-stone-900 capitalize">Edit {editingEntity.type}</h3>
              <Button onClick={() => { setEditingEntity(null); setNewPassword(''); }} variant="ghost" className="text-stone-400 hover:text-stone-600 p-2">
                <X size={24} />
              </Button>
            </div>
            <form onSubmit={handleUpdateEntity} className="space-y-4">
              {editingEntity.type === 'user' || editingEntity.type === 'student' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Name</label>
                    <input 
                      value={editingEntity.data.displayName || editingEntity.data.name || ''}
                      onChange={e => setEditingEntity({
                        ...editingEntity, 
                        data: { ...editingEntity.data, [editingEntity.type === 'user' ? 'displayName' : 'name']: e.target.value }
                      })}
                      className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  {(editingEntity.type === 'student') && (
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase mb-1">
                        Class
                      </label>
                      <select 
                        value={editingEntity.data.class || ''}
                        onChange={e => setEditingEntity({
                          ...editingEntity, 
                          data: { ...editingEntity.data, class: e.target.value }
                        })}
                        className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        <option value="">Select Class</option>
                        {CLASS_LIST.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <ImageUpload
                      label="Photo"
                      onUpload={(base64) => setEditingEntity({
                        ...editingEntity, 
                        data: { ...editingEntity.data, photoURL: base64 }
                      })}
                      currentImageUrl={editingEntity.data.photoURL}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Reset Password (Enter new password to change)</label>
                    <input 
                      type="text"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Name</label>
                    <input 
                      value={editingEntity.data.name}
                      onChange={e => setEditingEntity({...editingEntity, data: {...editingEntity.data, name: e.target.value}})}
                      className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  {editingEntity.type !== 'bearer' && (
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Description</label>
                      <textarea 
                        value={editingEntity.data.description}
                        onChange={e => setEditingEntity({...editingEntity, data: {...editingEntity.data, description: e.target.value}})}
                        className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px]"
                      />
                    </div>
                  )}
                  {editingEntity.type === 'bearer' && (
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Position</label>
                      <input 
                        value={editingEntity.data.position}
                        onChange={e => setEditingEntity({...editingEntity, data: {...editingEntity.data, position: e.target.value}})}
                        className="w-full p-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                  {(editingEntity.type === 'club' || editingEntity.type === 'bearer') && (
                    <div>
                      <ImageUpload
                        label={editingEntity.type === 'club' ? 'Logo' : 'Photo'}
                        onUpload={(base64) => setEditingEntity({
                          ...editingEntity, 
                          data: {
                            ...editingEntity.data, 
                            [editingEntity.type === 'club' ? 'logoUrl' : 'photoUrl']: base64
                          }
                        })}
                        currentImageUrl={editingEntity.type === 'club' ? editingEntity.data.logoUrl : editingEntity.data.photoUrl}
                      />
                    </div>
                  )}
                </>
              )}
              <Button type="submit" className="w-full py-4 mt-4">
                Save Changes
              </Button>
            </form>
          </div>
        </div>
      )}

      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-stone-900">Edit Student</h3>
              <button 
                onClick={() => setEditingStudent(null)}
                className="text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const studentClass = formData.get('class') as string;

                try {
                  setLoading(true);
                  
                  // Update students collection
                  await updateDoc(doc(db, 'students', editingStudent.admissionNumber), {
                    name,
                    class: studentClass
                  });

                  // Update users collection if uid exists
                  if (editingStudent.uid) {
                    await updateDoc(doc(db, 'users', editingStudent.uid), {
                      displayName: name
                    });
                  }

                  setStatus({ type: 'success', msg: `Student ${name} updated successfully!` });
                  setEditingStudent(null);
                } catch (err: any) {
                  setStatus({ type: 'error', msg: err.message || 'Failed to update student.' });
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-black text-stone-400 uppercase ml-1">Admission Number</label>
                <input 
                  value={editingStudent.admissionNumber} 
                  disabled
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50 text-stone-500 outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-stone-400 uppercase ml-1">Full Name</label>
                <input 
                  name="name" 
                  defaultValue={editingStudent.name} 
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white" 
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-stone-400 uppercase ml-1">Class</label>
                <select 
                  name="class" 
                  defaultValue={editingStudent.class} 
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white" 
                  required 
                >
                  <option value="">Select Class</option>
                  {CLASS_LIST.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setEditingStudent(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete?.coll === 'RESET_PORTAL') {
            handleResetPortal();
          } else if (confirmDelete) {
            handleDelete(confirmDelete.coll, confirmDelete.id);
          }
        }}
        title={confirmDelete?.title || 'Confirm Deletion'}
        message={confirmDelete?.message || 'Are you sure you want to delete this item?'}
      />
    </div>
  );
}
