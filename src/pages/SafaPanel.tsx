import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { Program, GalleryItem, Club, Board, OfficeBearer, ClubMember, BoardMember, ClubPointEntry, MonthlyReport } from '../types';
import { Calendar, Image as ImageIcon, Users, Layout, Shield, Plus, CheckCircle2, AlertCircle, Upload, Trash2, FileText, Award, BarChart3, FileSpreadsheet, Wallet, Trophy, Settings, Globe, Mail, Phone, MessageCircle, Facebook, Instagram, Send } from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import Scoreboard from './Scoreboard';
import { SiteContent } from '../types';
import { safeToDate } from '../utils/date';
import { getGregorianDate } from '../utils/hijri';

export default function SafaPanel() {
  const { profile, isSafa, isAdmin, campusId, currentCampus } = useAuth();
  
  const studentUnionName = currentCampus?.studentUnionName || "SAFA";
  const skillClubName = currentCampus?.skillClubName || "Skill Club";

  const { siteContent } = useSettings();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'programs' | 'gallery' | 'clubs' | 'boards' | 'office-bearers' | 'club-points' | 'monthly-reports' | 'scoreboard' | 'calendar'>('programs');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['programs', 'gallery', 'clubs', 'boards', 'office-bearers', 'club-points', 'monthly-reports', 'scoreboard', 'calendar'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [location.search]);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [officeBearers, setOfficeBearers] = useState<OfficeBearer[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [clubPointEntries, setClubPointEntries] = useState<ClubPointEntry[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!campusId) return;
      try {
        if (activeTab === 'clubs' || activeTab === 'club-points' || activeTab === 'scoreboard' || activeTab === 'programs') {
          const snapshot = await getDocs(query(collection(db, 'clubs'), where('campusId', '==', campusId)));
          setClubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));
        }

        if (activeTab === 'clubs') {
          const snapshot = await getDocs(query(collection(db, 'clubMembers'), where('campusId', '==', campusId)));
          setClubMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubMember)));
        }

        if (activeTab === 'boards') {
          const boardsSnap = await getDocs(query(collection(db, 'boards'), where('campusId', '==', campusId)));
          setBoards(boardsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board)));
          
          const membersSnap = await getDocs(query(collection(db, 'boardMembers'), where('campusId', '==', campusId)));
          setBoardMembers(membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BoardMember)));
        }

        if (activeTab === 'office-bearers') {
          const snapshot = await getDocs(query(collection(db, 'officeBearers'), where('campusId', '==', campusId)));
          setOfficeBearers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OfficeBearer)));
        }

        if (activeTab === 'gallery') {
          const snapshot = await getDocs(query(collection(db, 'gallery'), where('campusId', '==', campusId), orderBy('createdAt', 'desc'), limit(50)));
          setGalleryItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem)));
        }

        if (activeTab === 'programs') {
          const snapshot = await getDocs(query(collection(db, 'programs'), where('campusId', '==', campusId), orderBy('date', 'desc'), limit(50)));
          setPrograms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Program)));
        }

        if (activeTab === 'club-points') {
          const snapshot = await getDocs(query(collection(db, 'clubPointEntries'), where('campusId', '==', campusId), orderBy('timestamp', 'desc'), limit(100)));
          setClubPointEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubPointEntry)));
        }

        if (activeTab === 'monthly-reports') {
          const snapshot = await getDocs(query(collection(db, 'monthlyReports'), where('campusId', '==', campusId), orderBy('month', 'desc'), limit(24)));
          setMonthlyReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonthlyReport)));
        }

        if (activeTab === 'calendar') {
          const snapshot = await getDocs(query(collection(db, 'calendar'), where('campusId', '==', campusId), orderBy('date', 'desc'), limit(50)));
          setCalendar(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (error) {
        console.error('Error fetching SafaPanel data:', error);
      }
    };

    fetchData();
  }, [activeTab, campusId]);

  // Form States
  const [newProgram, setNewProgram] = useState({ title: '', date: '', description: '', location: '', clubId: '', otherClubName: '', useHijri: false, hijriYear: '', hijriMonth: '', hijriDay: '' });
  const [newGallery, setNewGallery] = useState({ url: '', caption: '' });
  const [newClub, setNewClub] = useState({ name: '', description: '', logoUrl: '' });
  const [newClubMember, setNewClubMember] = useState({ clubId: '', name: '', position: '', photoUrl: '', admissionNumber: '' });
  const [newBoard, setNewBoard] = useState({ name: '', description: '' });
  const [newBoardMember, setNewBoardMember] = useState({ boardId: '', name: '', position: '', photoUrl: '', admissionNumber: '' });
  const [newOfficeBearer, setNewOfficeBearer] = useState({ name: '', position: '', photoUrl: '', admissionNumber: '' });
  const [newClubPoints, setNewClubPoints] = useState({ clubId: '', points: 0, description: '' });
  const [newMonthlyReport, setNewMonthlyReport] = useState({ month: new Date().toISOString().slice(0, 7), performanceReportText: '', financialReportText: '' });
  const [loading, setLoading] = useState(false);

  const handleAddClubPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubPoints.clubId || newClubPoints.points === 0 || !campusId) return;
    try {
      const docRef = await addDoc(collection(db, 'clubPointEntries'), {
        ...newClubPoints,
        campusId,
        addedBy: profile?.uid,
        timestamp: serverTimestamp()
      });
      
      const clubRef = doc(db, 'clubs', newClubPoints.clubId);
      const club = clubs.find(c => c.id === newClubPoints.clubId);
      if (club) {
        await updateDoc(clubRef, {
          totalPoints: (club.totalPoints || 0) + newClubPoints.points
        });
        
        // Update local clubs state
        setClubs(prev => prev.map(c => 
          c.id === newClubPoints.clubId 
            ? { ...c, totalPoints: (c.totalPoints || 0) + newClubPoints.points } 
            : c
        ));
      }

      // Update local entries state
      const newEntry: ClubPointEntry = {
        id: docRef.id,
        ...newClubPoints,
        campusId,
        addedBy: profile?.uid || '',
        timestamp: new Date()
      };
      setClubPointEntries(prev => [newEntry, ...prev].slice(0, 100));

      setNewClubPoints({ clubId: '', points: 0, description: '' });
      setStatus({ type: 'success', msg: 'Points awarded to club!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to award points.' });
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearStudentsConfirm, setShowClearStudentsConfirm] = useState(false);
  const [confirmingClubId, setConfirmingClubId] = useState<string | null>(null);

  const handleClearAllStudentPoints = async () => {
    if (!campusId) return;
    try {
      setLoading(true);
      // Only fetch students who actually have points to clear in this campus
      const studentsQuery = query(collection(db, 'students'), where('campusId', '==', campusId), where('totalPoints', '>', 0));
      const studentsSnapshot = await getDocs(studentsQuery);
      
      const batches = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;

      studentsSnapshot.docs.forEach(docSnap => {
        currentBatch.update(docSnap.ref, { totalPoints: 0, categoryPoints: {} });
        operationCount++;
        if (operationCount === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      for (const batch of batches) {
        await batch.commit();
      }

      setStatus({ type: 'success', msg: 'All student points have been cleared.' });
      setShowClearStudentsConfirm(false);
    } catch (error) {
      console.error('Error clearing student points:', error);
      setStatus({ type: 'error', msg: 'Failed to clear student points: ' + (error instanceof Error ? error.message : String(error)) });
    } finally {
      setLoading(false);
    }
  };

  const handleClearIndividualClubPoints = async (clubId: string) => {
    if (!campusId) return;
    try {
      const entriesSnapshot = await getDocs(query(collection(db, 'clubPointEntries'), where('campusId', '==', campusId), where('clubId', '==', clubId)));
      const clubRef = doc(db, 'clubs', clubId);
      
      const batches = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;

      currentBatch.update(clubRef, { totalPoints: 0 });
      operationCount++;

      entriesSnapshot.docs.forEach(docSnap => {
        currentBatch.delete(docSnap.ref);
        operationCount++;
        if (operationCount === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      for (const batch of batches) {
        await batch.commit();
      }

      // Update local state
      setClubs(prev => prev.map(c => ({ ...c, totalPoints: 0 })));
      setClubPointEntries(prev => prev.filter(e => e.clubId !== clubId));

      setStatus({ type: 'success', msg: 'Club points have been cleared.' });
      setConfirmingClubId(null);
    } catch (error) {
      console.error('Error clearing points:', error);
      setStatus({ type: 'error', msg: 'Failed to clear club points: ' + (error instanceof Error ? error.message : String(error)) });
    }
  };

  const handleClearAllClubPoints = async () => {
    if (!campusId) return;
    try {
      const entriesSnapshot = await getDocs(query(collection(db, 'clubPointEntries'), where('campusId', '==', campusId)));
      const clubsSnapshot = await getDocs(query(collection(db, 'clubs'), where('campusId', '==', campusId)));
      
      const batches = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;

      clubsSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.totalPoints > 0) {
          currentBatch.update(docSnap.ref, { totalPoints: 0 });
          operationCount++;
          if (operationCount === 500) {
            batches.push(currentBatch);
            currentBatch = writeBatch(db);
            operationCount = 0;
          }
        }
      });

      entriesSnapshot.docs.forEach(docSnap => {
        currentBatch.delete(docSnap.ref);
        operationCount++;
        if (operationCount === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      for (const batch of batches) {
        await batch.commit();
      }

      // Update local state
      setClubs(prev => prev.map(c => ({ ...c, totalPoints: 0 })));
      setClubPointEntries([]);

      setStatus({ type: 'success', msg: 'All club points have been cleared.' });
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing points:', error);
      setStatus({ type: 'error', msg: 'Failed to clear club points: ' + (error instanceof Error ? error.message : String(error)) });
    }
  };

  const handleAddMonthlyReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusId) return;
    try {
      const docRef = await addDoc(collection(db, 'monthlyReports'), {
        ...newMonthlyReport,
        campusId,
        submittedBy: profile?.uid,
        timestamp: serverTimestamp()
      });
      
      // Update local state
      const newReport: MonthlyReport = {
        id: docRef.id,
        ...newMonthlyReport,
        campusId,
        submittedBy: profile?.uid || '',
        timestamp: new Date()
      };
      setMonthlyReports(prev => [newReport, ...prev].slice(0, 24));

      setNewMonthlyReport({ month: new Date().toISOString().slice(0, 7), performanceReportText: '', financialReportText: '' });
      setStatus({ type: 'success', msg: 'Monthly report submitted!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to submit report.' });
    }
  };

  const handleAddClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusId) return;
    try {
      const docRef = await addDoc(collection(db, 'clubs'), {
        ...newClub,
        campusId
      });
      
      // Update local state
      const addedClub: Club = {
        id: docRef.id,
        ...newClub,
        campusId,
        totalPoints: 0
      };
      setClubs(prev => [...prev, addedClub]);

      setNewClub({ name: '', description: '', logoUrl: '' });
      setStatus({ type: 'success', msg: 'Club added!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add club.' });
    }
  };

  const handleAddClubMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusId) return;
    try {
      const docRef = await addDoc(collection(db, 'clubMembers'), {
        ...newClubMember,
        campusId
      });
      
      // Update local state
      const addedMember: ClubMember = {
        id: docRef.id,
        ...newClubMember,
        campusId
      };
      setClubMembers(prev => [...prev, addedMember]);

      setNewClubMember({ clubId: '', name: '', position: '', photoUrl: '', admissionNumber: '' });
      setStatus({ type: 'success', msg: 'Club member added!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add club member.' });
    }
  };

  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusId) return;
    try {
      const docRef = await addDoc(collection(db, 'boards'), {
        ...newBoard,
        campusId
      });
      
      // Update local state
      const addedBoard: Board = {
        id: docRef.id,
        ...newBoard,
        campusId
      };
      setBoards(prev => [...prev, addedBoard]);

      setNewBoard({ name: '', description: '' });
      setStatus({ type: 'success', msg: 'Board added!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add board.' });
    }
  };

  const handleAddBoardMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusId) return;
    try {
      const docRef = await addDoc(collection(db, 'boardMembers'), {
        ...newBoardMember,
        campusId
      });
      
      // Update local state
      const addedMember: BoardMember = {
        id: docRef.id,
        ...newBoardMember,
        campusId
      };
      setBoardMembers(prev => [...prev, addedMember]);

      setNewBoardMember({ boardId: '', name: '', position: '', photoUrl: '', admissionNumber: '' });
      setStatus({ type: 'success', msg: 'Board member added!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add board member.' });
    }
  };

  const handleAddOfficeBearer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusId) return;
    try {
      const docRef = await addDoc(collection(db, 'officeBearers'), {
        ...newOfficeBearer,
        campusId
      });
      
      // Update local state
      const addedBearer: OfficeBearer = {
        id: docRef.id,
        ...newOfficeBearer,
        campusId
      };
      setOfficeBearers(prev => [...prev, addedBearer]);

      setNewOfficeBearer({ name: '', position: '', photoUrl: '', admissionNumber: '' });
      setStatus({ type: 'success', msg: 'Office bearer added!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add office bearer.' });
    }
  };

  const [confirmDelete, setConfirmDelete] = useState<{ collection: string, id: string } | null>(null);
  const [editingItem, setEditingItem] = useState<{ collection: string, id: string, data: any } | null>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setLoading(true);
      const { collection: coll, id } = confirmDelete;
      
      // Special cleanup for clubs
      if (coll === 'clubs') {
        const batch = writeBatch(db);
        
        // Delete club point entries
        const entriesSnap = await getDocs(query(collection(db, 'clubPointEntries'), where('campusId', '==', campusId), where('clubId', '==', id)));
        entriesSnap.docs.forEach(d => batch.delete(d.ref));
        
        // Delete club members
        const membersSnap = await getDocs(query(collection(db, 'clubMembers'), where('campusId', '==', campusId), where('clubId', '==', id)));
        membersSnap.docs.forEach(d => batch.delete(d.ref));
        
        // Delete the club itself
        batch.delete(doc(db, 'clubs', id));
        
        await batch.commit();

        // Update local state
        setClubs(prev => prev.filter(c => c.id !== id));
        setClubMembers(prev => prev.filter(m => m.clubId !== id));
        setClubPointEntries(prev => prev.filter(e => e.clubId !== id));
      } else {
        await deleteDoc(doc(db, coll, id));
        
        // Update local state based on collection
        if (coll === 'programs') setPrograms(prev => prev.filter(p => p.id !== id));
        if (coll === 'gallery') setGalleryItems(prev => prev.filter(g => g.id !== id));
        if (coll === 'clubMembers') setClubMembers(prev => prev.filter(m => m.id !== id));
        if (coll === 'boards') setBoards(prev => prev.filter(b => b.id !== id));
        if (coll === 'boardMembers') setBoardMembers(prev => prev.filter(m => m.id !== id));
        if (coll === 'officeBearers') setOfficeBearers(prev => prev.filter(o => o.id !== id));
        if (coll === 'monthlyReports') setMonthlyReports(prev => prev.filter(r => r.id !== id));
      }
      
      setStatus({ type: 'success', msg: 'Item deleted!' });
      setConfirmDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      setStatus({ type: 'error', msg: 'Failed to delete item.' });
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch photo from students collection based on admission number
  const fetchPhotoByAdmissionNumber = async (admissionNumber: string, setter: (data: { photoUrl?: string, name?: string }) => void) => {
    if (!admissionNumber || admissionNumber.length < 2 || !campusId) return;
    try {
      const q = query(collection(db, 'students'), where('campusId', '==', campusId), where('admissionNumber', '==', admissionNumber), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const studentData = querySnapshot.docs[0].data();
        setter({
          photoUrl: studentData.photoURL || '',
          name: studentData.name || ''
        });
      }
    } catch (error) {
      console.error('Error fetching student photo:', error);
    }
  };

  // Auto-fetch photo from users collection based on name
  const fetchPhotoByName = async (name: string, setter: (photoUrl: string) => void) => {
    if (!name || name.length < 3 || !campusId) return;
    try {
      const q = query(collection(db, 'users'), where('campusId', '==', campusId), where('displayName', '==', name), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        if (userData.photoURL) {
          setter(userData.photoURL);
        }
      }
    } catch (error) {
      console.error('Error fetching photo:', error);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await updateDoc(doc(db, editingItem.collection, editingItem.id), editingItem.data);
      
      // Update local state based on collection
      const { collection: coll, id, data } = editingItem;
      if (coll === 'programs') setPrograms(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      if (coll === 'gallery') setGalleryItems(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
      if (coll === 'clubs') setClubs(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
      if (coll === 'clubMembers') setClubMembers(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
      if (coll === 'boards') setBoards(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
      if (coll === 'boardMembers') setBoardMembers(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
      if (coll === 'officeBearers') setOfficeBearers(prev => prev.map(o => o.id === id ? { ...o, ...data } : o));
      if (coll === 'monthlyReports') setMonthlyReports(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));

      setStatus({ type: 'success', msg: 'Item updated successfully!' });
      setEditingItem(null);
    } catch (error) {
      console.error('Update error:', error);
      setStatus({ type: 'error', msg: 'Failed to update item.' });
    }
  };

  const handleAddProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusId) return;
    try {
      let finalDate = newProgram.date;
      if (newProgram.useHijri) {
        finalDate = getGregorianDate(newProgram.hijriYear, newProgram.hijriMonth, newProgram.hijriDay);
      }
      
      const docRef = await addDoc(collection(db, 'programs'), {
        title: newProgram.title,
        date: finalDate,
        description: newProgram.description,
        location: newProgram.location,
        clubId: newProgram.clubId === 'other' ? undefined : newProgram.clubId,
        otherClubName: newProgram.clubId === 'other' ? newProgram.otherClubName : null,
        campusId,
        addedBy: profile?.uid,
        timestamp: serverTimestamp()
      });
      
      // Update local state
      const addedProgram: Program = {
        id: docRef.id,
        title: newProgram.title,
        date: finalDate,
        description: newProgram.description,
        location: newProgram.location,
        clubId: newProgram.clubId === 'other' ? undefined : newProgram.clubId,
        otherClubName: newProgram.clubId === 'other' ? newProgram.otherClubName : null,
        campusId,
        addedBy: profile?.uid || '',
        timestamp: new Date()
      };
      setPrograms(prev => [addedProgram, ...prev].slice(0, 50));

      setStatus({ type: 'success', msg: 'Program added successfully!' });
      setNewProgram({ title: '', date: '', description: '', location: '', clubId: '', otherClubName: '', useHijri: false, hijriYear: '', hijriMonth: '', hijriDay: '' });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', msg: 'Failed to add program.' });
    }
  };

  const handleAddGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGallery.url || !campusId) {
      setStatus({ type: 'error', msg: 'Please select an image to upload.' });
      return;
    }
    try {
      const docRef = await addDoc(collection(db, 'gallery'), {
        ...newGallery,
        campusId,
        uploadedBy: profile?.uid,
        timestamp: serverTimestamp()
      });
      
      // Update local state
      const addedItem: GalleryItem = {
        id: docRef.id,
        ...newGallery,
        campusId,
        uploadedBy: profile?.uid || '',
        timestamp: new Date()
      };
      setGalleryItems(prev => [addedItem, ...prev].slice(0, 50));

      setStatus({ type: 'success', msg: 'Image added to gallery!' });
      setNewGallery({ url: '', caption: '' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add image.' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-emerald-700">{studentUnionName}</h2>
        <div className="flex bg-stone-100 p-1 rounded-2xl overflow-x-auto">
          {[
            { id: 'programs', label: 'Programs', icon: Calendar },
            { id: 'gallery', label: 'Gallery', icon: ImageIcon },
            { id: 'clubs', label: 'Clubs', icon: Users },
            { id: 'boards', label: 'Boards', icon: Layout },
            { id: 'office-bearers', label: 'Office Bearers', icon: Shield },
            { id: 'club-points', label: 'Club Points', icon: BarChart3 },
            { id: 'scoreboard', label: 'Scoreboard', icon: Trophy },
            { id: 'monthly-reports', label: 'Reports', icon: FileSpreadsheet },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {status && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-4 ${
          status.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {status.msg}
        </div>
      )}

      {activeTab === 'programs' && (
        <div className="space-y-8">
          <Card className="p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
              <Plus className="text-emerald-600" /> Add New Program
            </h3>
            <form onSubmit={handleAddProgram} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Program Title</label>
                <input 
                  type="text" required
                  value={newProgram.title}
                  onChange={e => setNewProgram({...newProgram, title: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Club (Optional)</label>
                <select 
                  value={newProgram.clubId}
                  onChange={e => setNewProgram({...newProgram, clubId: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Select a Club</option>
                  {clubs.map(club => <option key={club.id} value={club.id}>{club.name}</option>)}
                  <optgroup label={`${studentUnionName} Boards`}>
                    <option value="SRDB">SRDB</option>
                    <option value="LB">LB</option>
                    <option value="SAB">SAB</option>
                    <option value="SAFA">SAFA</option>
                  </optgroup>
                  <option value="other">Other</option>
                </select>
                {newProgram.clubId === 'other' && (
                  <input 
                    type="text" placeholder="Club Name" required
                    value={newProgram.otherClubName}
                    onChange={e => setNewProgram({...newProgram, otherClubName: e.target.value})}
                    className="w-full px-4 py-2 mt-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <input 
                  type="checkbox"
                  checked={newProgram.useHijri}
                  onChange={e => setNewProgram({...newProgram, useHijri: e.target.checked})}
                />
                <label className="text-xs font-bold text-stone-500 uppercase">Use Hijri Date</label>
              </div>
              {newProgram.useHijri ? (
                <div className="flex gap-2">
                  <input type="text" placeholder="YYYY" value={newProgram.hijriYear} onChange={e => setNewProgram({...newProgram, hijriYear: e.target.value})} className="w-1/3 px-4 py-2 rounded-xl border border-stone-200" />
                  <input type="text" placeholder="MM" value={newProgram.hijriMonth} onChange={e => setNewProgram({...newProgram, hijriMonth: e.target.value})} className="w-1/3 px-4 py-2 rounded-xl border border-stone-200" />
                  <input type="text" placeholder="DD" value={newProgram.hijriDay} onChange={e => setNewProgram({...newProgram, hijriDay: e.target.value})} className="w-1/3 px-4 py-2 rounded-xl border border-stone-200" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Date</label>
                  <input 
                    type="date" required={!newProgram.useHijri}
                    value={newProgram.date}
                    onChange={e => setNewProgram({...newProgram, date: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Description</label>
                <textarea 
                  value={newProgram.description}
                  onChange={e => setNewProgram({...newProgram, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                />
              </div>
              <Button type="submit" className="w-full">
                Add Program
              </Button>
            </form>
          </Card>

          <div className="space-y-8">
            {clubs.map(club => {
              const clubPrograms = programs.filter(p => p.clubId === club.id);
              if (clubPrograms.length === 0) return null;
              return (
                <div key={club.id} className="space-y-4">
                  <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                    <Users size={16} /> {club.name}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clubPrograms.map(event => (
                      <Card key={event.id} className="p-6 relative group">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setEditingItem({ collection: 'programs', id: event.id!, data: { title: event.title, date: event.date, description: event.description } })}
                            className="p-2 text-stone-900 bg-stone-100 rounded-lg hover:bg-stone-200"
                          >
                            <FileText size={16} />
                          </button>
                          <button 
                            onClick={() => setConfirmDelete({ collection: 'programs', id: event.id! })}
                            className="p-2 text-stone-900 bg-stone-100 rounded-lg hover:bg-stone-200"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <h4 className="font-bold text-stone-900">{event.title}</h4>
                        <p className="text-xs text-stone-400 mt-1">{event.date}</p>
                        <p className="text-sm text-stone-600 mt-2 line-clamp-2">{event.description}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Extra Clubs / Boards Grouping */}
            {['SRDB', 'LB', 'SAB', 'SAFA'].map(specialId => {
              const specialPrograms = programs.filter(p => p.clubId === specialId);
              if (specialPrograms.length === 0) return null;
              return (
                <div key={specialId} className="space-y-4">
                  <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                    <Shield size={16} /> {specialId}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {specialPrograms.map(event => (
                      <Card key={event.id} className="p-6 relative group">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setEditingItem({ collection: 'programs', id: event.id!, data: { title: event.title, date: event.date, description: event.description } })}
                            className="p-2 text-stone-900 bg-stone-100 rounded-lg hover:bg-stone-200"
                          >
                            <FileText size={16} />
                          </button>
                          <button 
                            onClick={() => setConfirmDelete({ collection: 'programs', id: event.id! })}
                            className="p-2 text-stone-900 bg-stone-100 rounded-lg hover:bg-stone-200"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <h4 className="font-bold text-stone-900">{event.title}</h4>
                        <p className="text-xs text-stone-400 mt-1">{event.date}</p>
                        <p className="text-sm text-stone-600 mt-2 line-clamp-2">{event.description}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Other Club Programs */}
            {(() => {
              const otherPrograms = programs.filter(p => p.otherClubName);
              if (otherPrograms.length === 0) return null;
              return (
                <div className="space-y-4">
                  <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                    <Globe size={16} /> Other Clubs
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {otherPrograms.map(event => (
                      <Card key={event.id} className="p-6 relative group">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setEditingItem({ collection: 'programs', id: event.id!, data: { title: event.title, date: event.date, description: event.description } })}
                            className="p-2 text-stone-900 bg-stone-100 rounded-lg hover:bg-stone-200"
                          >
                            <FileText size={16} />
                          </button>
                          <button 
                            onClick={() => setConfirmDelete({ collection: 'programs', id: event.id! })}
                            className="p-2 text-stone-900 bg-stone-100 rounded-lg hover:bg-stone-200"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <h4 className="font-bold text-stone-900 py-1">{event.title} <span className="text-[10px] text-stone-400 font-bold ml-1">({event.otherClubName})</span></h4>
                        <p className="text-xs text-stone-400">{event.date}</p>
                        <p className="text-sm text-stone-600 mt-2 line-clamp-2">{event.description}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Uncategorized Programs */}
            {(() => {
              const uncategorized = programs.filter(p => !p.clubId && !p.otherClubName);
              if (uncategorized.length === 0) return null;
              return (
                <div className="space-y-4">
                  <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                    <Calendar size={16} /> General Programs
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {uncategorized.map(event => (
                      <Card key={event.id} className="p-6 relative group">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setEditingItem({ collection: 'programs', id: event.id!, data: { title: event.title, date: event.date, description: event.description } })}
                            className="p-2 text-stone-900 bg-stone-100 rounded-lg hover:bg-stone-200"
                          >
                            <FileText size={16} />
                          </button>
                          <button 
                            onClick={() => setConfirmDelete({ collection: 'programs', id: event.id! })}
                            className="p-2 text-stone-900 bg-stone-100 rounded-lg hover:bg-stone-200"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <h4 className="font-bold text-stone-900">{event.title}</h4>
                        <p className="text-xs text-stone-400 mt-1">{event.date}</p>
                        <p className="text-sm text-stone-600 mt-2 line-clamp-2">{event.description}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="space-y-8">
          <Card className="p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
              <Plus className="text-emerald-600" /> Add Calendar Event
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
                  await addDoc(collection(db, 'calendar'), { title, date, type, createdAt: serverTimestamp() });
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
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calendar.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(event => (
              <div key={event.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-stone-100 hover:shadow-md transition-all group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  event.type === 'exam' ? 'bg-rose-100 text-rose-600' :
                  event.type === 'holiday' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  <Calendar size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-stone-900 truncate">{event.title}</h4>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{new Date(event.date).toLocaleDateString()}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{event.type}</p>
                </div>
                <Button 
                  variant="danger" 
                  size="sm"
                  onClick={() => setConfirmDelete({ collection: 'calendar', id: event.id! })}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'gallery' && (
        <div className="space-y-8">
          <Card className="p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
              <Plus className="text-emerald-600" /> Upload to Gallery
            </h3>
            <form onSubmit={handleAddGallery} className="space-y-6">
              <ImageUpload
                label="Select Image"
                onUpload={(base64) => setNewGallery({ ...newGallery, url: base64 })}
                currentImageUrl={newGallery.url}
                maxSize={800}
              />
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Caption</label>
                <input 
                  type="text"
                  value={newGallery.caption}
                  onChange={e => setNewGallery({...newGallery, caption: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <Button type="submit" className="w-full">
                Upload Image
              </Button>
            </form>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleryItems.map(item => (
              <Card key={item.id} className="p-2 relative group overflow-hidden aspect-square">
                <img src={item.url} alt={item.caption} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button 
                    onClick={() => setEditingItem({ collection: 'gallery', id: item.id!, data: { url: item.url, caption: item.caption } })}
                    className="p-2 bg-stone-100 text-stone-900 rounded-lg hover:bg-stone-200"
                  >
                    <FileText size={16} />
                  </button>
                  <button 
                    onClick={() => setConfirmDelete({ collection: 'gallery', id: item.id! })}
                    className="p-2 bg-stone-100 text-stone-900 rounded-lg hover:bg-stone-200"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {item.caption && (
                  <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg text-[10px] font-bold text-stone-900 truncate">
                    {item.caption}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'clubs' && (
        <div className="space-y-8">
          <Card className="p-8 max-w-2xl mx-auto mb-8">
            <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
              <Plus className="text-emerald-600" /> Add New Club
            </h3>
            <form onSubmit={handleAddClub} className="space-y-6">
              <ImageUpload
                label="Club Logo"
                onUpload={(base64) => setNewClub({ ...newClub, logoUrl: base64 })}
                currentImageUrl={newClub.logoUrl}
              />
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Club Name</label>
                <input 
                  type="text" required
                  value={newClub.name}
                  onChange={e => setNewClub({...newClub, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Description</label>
                <textarea 
                  value={newClub.description}
                  onChange={e => setNewClub({...newClub, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                />
              </div>
              <Button type="submit" className="w-full">
                Add Club
              </Button>
            </form>
          </Card>

          <Card className="p-8 max-w-2xl mx-auto mb-8">
            <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
              <Plus className="text-emerald-600" /> Add Club Member
            </h3>
            <form onSubmit={handleAddClubMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Select Club</label>
                <select 
                  required
                  value={newClubMember.clubId}
                  onChange={e => setNewClubMember({...newClubMember, clubId: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Select a club</option>
                  {clubs.map(club => <option key={club.id} value={club.id}>{club.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Admission Number (Optional)</label>
                <input 
                  type="text"
                  value={newClubMember.admissionNumber}
                  onChange={e => {
                    const val = e.target.value;
                    setNewClubMember({...newClubMember, admissionNumber: val});
                    fetchPhotoByAdmissionNumber(val, (data) => {
                      setNewClubMember(prev => ({
                        ...prev, 
                        photoUrl: data.photoUrl || prev.photoUrl,
                        name: data.name || prev.name
                      }));
                    });
                  }}
                  placeholder="Enter admission number to auto-link photo"
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Member Name</label>
                <input 
                  type="text" required
                  value={newClubMember.name}
                  onChange={e => {
                    const val = e.target.value;
                    setNewClubMember({...newClubMember, name: val});
                    if (!newClubMember.admissionNumber) {
                      fetchPhotoByName(val, (url) => setNewClubMember(prev => ({...prev, photoUrl: url})));
                    }
                  }}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Position</label>
                <input 
                  type="text" required
                  value={newClubMember.position}
                  onChange={e => setNewClubMember({...newClubMember, position: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <ImageUpload
                label="Member Photo"
                onUpload={(base64) => setNewClubMember({...newClubMember, photoUrl: base64})}
                currentImageUrl={newClubMember.photoUrl}
              />
              <Button type="submit" className="w-full">
                Add Member
              </Button>
            </form>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clubs.map(club => (
              <div key={club.id} className="space-y-4">
                <Card className="p-4 flex flex-col items-center text-center relative">
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button 
                      onClick={() => setEditingItem({ collection: 'clubs', id: club.id, data: { name: club.name, description: club.description, logoUrl: club.logoUrl } })}
                      className="p-2 text-stone-400 bg-stone-50 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                      title="Edit Club"
                    >
                      <FileText size={16} />
                    </button>
                    <button 
                      onClick={() => setConfirmDelete({ collection: 'clubs', id: club.id })}
                      className="p-2 text-stone-400 bg-stone-50 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Delete Club"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {club.logoUrl ? (
                    <img src={club.logoUrl} alt={club.name} className="w-16 h-16 object-cover rounded-2xl mb-3" />
                  ) : (
                    <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-3">
                      <Users className="text-stone-400" size={24} />
                    </div>
                  )}
                  <h4 className="font-bold text-stone-900">{club.name}</h4>
                  <p className="text-sm text-stone-500 mt-1 line-clamp-2">{club.description}</p>
                </Card>
                <div className="pl-4 border-l-2 border-stone-200 space-y-2">
                  {clubMembers.filter(m => m.clubId === club.id).map(member => (
                    <div key={member.id} className="flex items-center gap-2 text-sm bg-white p-2 rounded-lg shadow-sm">
                      <div className="font-bold text-stone-900">{member.name}</div>
                      <div className="text-stone-500">- {member.position}</div>
                      <div className="ml-auto flex gap-1">
                        <button 
                          onClick={() => setEditingItem({ collection: 'clubMembers', id: member.id, data: { clubId: member.clubId, name: member.name, position: member.position, photoUrl: member.photoUrl } })}
                          className="text-stone-400 hover:text-emerald-600 transition-colors"
                          title="Edit Member"
                        >
                          <FileText size={14} />
                        </button>
                        <button 
                          onClick={() => setConfirmDelete({ collection: 'clubMembers', id: member.id })}
                          className="text-stone-400 hover:text-rose-600 transition-colors"
                          title="Delete Member"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'boards' && (
        <div className="space-y-8">
          <Card className="p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
              <Plus className="text-emerald-600" /> Add New Board
            </h3>
            <form onSubmit={handleAddBoard} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Board Name</label>
                <input 
                  type="text" required
                  value={newBoard.name}
                  onChange={e => setNewBoard({...newBoard, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Description</label>
                <textarea 
                  value={newBoard.description}
                  onChange={e => setNewBoard({...newBoard, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                />
              </div>
              <Button type="submit" className="w-full">
                Add Board
              </Button>
            </form>
          </Card>

          <Card className="p-8 max-w-2xl mx-auto mb-8">
            <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
              <Plus className="text-emerald-600" /> Add Board Member
            </h3>
            <form onSubmit={handleAddBoardMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Select Board</label>
                <select 
                  required
                  value={newBoardMember.boardId}
                  onChange={e => setNewBoardMember({...newBoardMember, boardId: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Select a board</option>
                  {boards.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Admission Number (Optional)</label>
                <input 
                  type="text"
                  value={newBoardMember.admissionNumber}
                  onChange={e => {
                    const val = e.target.value;
                    setNewBoardMember({...newBoardMember, admissionNumber: val});
                    fetchPhotoByAdmissionNumber(val, (data) => {
                      setNewBoardMember(prev => ({
                        ...prev, 
                        photoUrl: data.photoUrl || prev.photoUrl,
                        name: data.name || prev.name
                      }));
                    });
                  }}
                  placeholder="Enter admission number to auto-link photo"
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Member Name</label>
                <input 
                  type="text" required
                  value={newBoardMember.name}
                  onChange={e => {
                    const val = e.target.value;
                    setNewBoardMember({...newBoardMember, name: val});
                    if (!newBoardMember.admissionNumber) {
                      fetchPhotoByName(val, (url) => setNewBoardMember(prev => ({...prev, photoUrl: url})));
                    }
                  }}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Position</label>
                <input 
                  type="text" required
                  value={newBoardMember.position}
                  onChange={e => setNewBoardMember({...newBoardMember, position: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <ImageUpload
                label="Member Photo"
                onUpload={(base64) => setNewBoardMember({...newBoardMember, photoUrl: base64})}
                currentImageUrl={newBoardMember.photoUrl}
              />
              <Button type="submit" className="w-full">
                Add Board Member
              </Button>
            </form>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map(board => (
              <div key={board.id} className="space-y-4">
                <Card className="p-4 flex flex-col items-center text-center relative">
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button 
                      onClick={() => setEditingItem({ collection: 'boards', id: board.id, data: { name: board.name, description: board.description } })}
                      className="p-2 text-stone-400 bg-stone-50 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                      title="Edit Board"
                    >
                      <FileText size={16} />
                    </button>
                    <button 
                      onClick={() => setConfirmDelete({ collection: 'boards', id: board.id })}
                      className="p-2 text-stone-400 bg-stone-50 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Delete Board"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h4 className="font-bold text-stone-900">{board.name}</h4>
                  <p className="text-sm text-stone-500 mt-1 line-clamp-2">{board.description}</p>
                </Card>
                <div className="pl-4 border-l-2 border-stone-200 space-y-2">
                  {boardMembers.filter(m => m.boardId === board.id).map(member => (
                    <div key={member.id} className="flex items-center justify-between bg-white p-2 rounded-xl border border-stone-100 shadow-sm">
                      <span className="text-sm font-medium">{member.name} ({member.position})</span>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setEditingItem({ collection: 'boardMembers', id: member.id, data: { boardId: member.boardId, name: member.name, position: member.position, photoUrl: member.photoUrl } })}
                          className="text-stone-400 hover:text-emerald-600 transition-colors"
                          title="Edit Member"
                        >
                          <FileText size={14} />
                        </button>
                        <button 
                          onClick={() => setConfirmDelete({ collection: 'boardMembers', id: member.id })}
                          className="text-stone-400 hover:text-rose-600 transition-colors"
                          title="Delete Member"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'office-bearers' && (
        <div className="space-y-8">
          <Card className="p-8 max-w-2xl mx-auto mb-8">
            <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
              <Plus className="text-emerald-600" /> Add Office Bearer
            </h3>
            <form onSubmit={handleAddOfficeBearer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Admission Number (Optional)</label>
                <input 
                  type="text"
                  value={newOfficeBearer.admissionNumber}
                  onChange={e => {
                    const val = e.target.value;
                    setNewOfficeBearer({...newOfficeBearer, admissionNumber: val});
                    fetchPhotoByAdmissionNumber(val, (data) => {
                      setNewOfficeBearer(prev => ({
                        ...prev, 
                        photoUrl: data.photoUrl || prev.photoUrl,
                        name: data.name || prev.name
                      }));
                    });
                  }}
                  placeholder="Enter admission number to auto-link photo"
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Name</label>
                <input 
                  type="text" required
                  value={newOfficeBearer.name}
                  onChange={e => {
                    const val = e.target.value;
                    setNewOfficeBearer({...newOfficeBearer, name: val});
                    if (!newOfficeBearer.admissionNumber) {
                      fetchPhotoByName(val, (url) => setNewOfficeBearer(prev => ({...prev, photoUrl: url})));
                    }
                  }}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Position</label>
                <input 
                  type="text" required
                  value={newOfficeBearer.position}
                  onChange={e => setNewOfficeBearer({...newOfficeBearer, position: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <ImageUpload
                label="Bearer Photo"
                onUpload={(base64) => setNewOfficeBearer({...newOfficeBearer, photoUrl: base64})}
                currentImageUrl={newOfficeBearer.photoUrl}
              />
              <Button type="submit" className="w-full">
                Add Office Bearer
              </Button>
            </form>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {officeBearers.map(bearer => (
              <Card key={bearer.id} className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900">{bearer.name}</h4>
                  <p className="text-sm text-stone-500">{bearer.position}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingItem({ collection: 'officeBearers', id: bearer.id, data: { name: bearer.name, position: bearer.position, photoUrl: bearer.photoUrl } })}
                    className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Edit Office Bearer"
                  >
                    <FileText size={18} />
                  </button>
                  <button 
                    onClick={() => setConfirmDelete({ collection: 'officeBearers', id: bearer.id })}
                    className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Office Bearer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'club-points' && (
        <div className="space-y-8">
          <div className="flex justify-end">
            {isAdmin && (
              <div className="flex items-center gap-2">
                {!showClearConfirm ? (
                  <Button 
                    onClick={() => setShowClearConfirm(true)} 
                    variant="outline" 
                    className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    <Trash2 size={16} className="mr-2" /> Clear All Points
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 animate-in zoom-in duration-200">
                    <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">Are you sure?</span>
                    <Button onClick={handleClearAllClubPoints} variant="danger" className="text-xs py-1">
                      Clear
                    </Button>
                    <Button onClick={() => setShowClearConfirm(false)} variant="secondary" className="text-xs py-1">
                      No
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          <Card className="p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
              <Award className="text-emerald-600" /> Award Points to Club
            </h3>
            <form onSubmit={handleAddClubPoints} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Select Club</label>
                <select 
                  required
                  value={newClubPoints.clubId}
                  onChange={e => setNewClubPoints({...newClubPoints, clubId: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Select a club</option>
                  {clubs.map(club => <option key={club.id} value={club.id}>{club.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Points</label>
                <input 
                  type="number" required
                  value={newClubPoints.points || ''}
                  onChange={e => setNewClubPoints({...newClubPoints, points: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Description</label>
                <input 
                  type="text" required
                  placeholder="e.g., Winning Monthly Arts Fest"
                  value={newClubPoints.description}
                  onChange={e => setNewClubPoints({...newClubPoints, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <Button type="submit" className="w-full">Award Points</Button>
            </form>
            
            {isAdmin && (
              <div className="mt-8 pt-8 border-t border-stone-100">
                <h4 className="text-sm font-bold text-stone-900 mb-4">Danger Zone</h4>
                {!showClearStudentsConfirm ? (
                  <Button onClick={() => setShowClearStudentsConfirm(true)} variant="danger" className="w-full">
                    Clear All Student Points
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 animate-in zoom-in duration-200">
                    <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">Are you sure?</span>
                    <Button onClick={handleClearAllStudentPoints} variant="danger" className="text-xs py-1">
                      Yes, Clear All
                    </Button>
                    <Button onClick={() => setShowClearStudentsConfirm(false)} variant="secondary" className="text-xs py-1">
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map(club => (
              <Card key={club.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    {club.logoUrl ? (
                      <img src={club.logoUrl} alt={club.name} className="w-12 h-12 object-cover rounded-xl" />
                    ) : (
                      <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center">
                        <Users className="text-stone-400" size={20} />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-stone-900">{club.name}</h4>
                      <p className="text-2xl font-black text-emerald-600">{club.totalPoints || 0} <span className="text-xs text-stone-400 uppercase">Points</span></p>
                    </div>
                  </div>
                  {isSafa && (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setEditingItem({ collection: 'clubs', id: club.id, data: { name: club.name, description: club.description, logoUrl: club.logoUrl } })}
                          className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit Club"
                        >
                          <FileText size={16} />
                        </button>
                        <button 
                          onClick={() => setConfirmDelete({ collection: 'clubs', id: club.id })}
                          className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Club"
                        >
                          <Trash2 size={16} />
                        </button>
                        {isAdmin && (
                          confirmingClubId !== club.id ? (
                            <button 
                              onClick={() => setConfirmingClubId(club.id)}
                              className="p-2 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Clear Club Points"
                            >
                              <BarChart3 size={16} />
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
                              <button 
                                onClick={() => handleClearIndividualClubPoints(club.id)}
                                className="text-[10px] font-bold text-rose-600 uppercase hover:underline"
                              >
                                Clear?
                              </button>
                              <button 
                                onClick={() => setConfirmingClubId(null)}
                                className="text-[10px] font-bold text-stone-400 uppercase hover:underline"
                              >
                                No
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {clubPointEntries.filter(e => e.clubId === club.id).map(entry => (
                    <div key={entry.id} className="text-xs p-2 bg-stone-50 rounded-lg border border-stone-100">
                      <div className="flex justify-between font-bold text-stone-700">
                        <span>{entry.description}</span>
                        <span className="text-emerald-600">+{entry.points}</span>
                      </div>
                      <div className="text-stone-400 mt-1">
                        {safeToDate(entry.timestamp)?.toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'scoreboard' && (
        <Scoreboard />
      )}

      {activeTab === 'monthly-reports' && (
        <div className="space-y-8">
          <Card className="p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-600" /> Submit Monthly Report
            </h3>
            <form onSubmit={handleAddMonthlyReport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Month</label>
                <input 
                  type="month" required
                  value={newMonthlyReport.month}
                  onChange={e => setNewMonthlyReport({...newMonthlyReport, month: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Performance Report</label>
                <textarea 
                  required
                  placeholder="Describe the performance activities of this month..."
                  value={newMonthlyReport.performanceReportText}
                  onChange={e => setNewMonthlyReport({...newMonthlyReport, performanceReportText: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none h-32"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Financial Report</label>
                <textarea 
                  required
                  placeholder="Describe the financial activities of this month..."
                  value={newMonthlyReport.financialReportText}
                  onChange={e => setNewMonthlyReport({...newMonthlyReport, financialReportText: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none h-32"
                />
              </div>
              <Button type="submit" className="w-full">Submit Report</Button>
            </form>
          </Card>

          <div className="space-y-4">
            {monthlyReports.map(report => (
              <Card key={report.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-lg font-bold text-stone-900">Report for {new Date(report.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h4>
                  <button 
                    onClick={() => setConfirmDelete({ collection: 'monthlyReports', id: report.id! })}
                    className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <h5 className="text-sm font-bold text-stone-900 uppercase tracking-widest mb-1">Performance Report</h5>
                    <p className="text-stone-600 whitespace-pre-wrap leading-relaxed bg-stone-50 p-4 rounded-xl">{report.performanceReportText}</p>
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-stone-900 uppercase tracking-widest mb-1">Financial Report</h5>
                    <p className="text-stone-600 whitespace-pre-wrap leading-relaxed bg-stone-50 p-4 rounded-xl">{report.financialReportText}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-stone-100 text-xs text-stone-400">
                  Submitted on {safeToDate(report.timestamp)?.toLocaleString()}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4 mb-6 text-red-600">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-xl font-black text-stone-900">Confirm Deletion</h3>
            </div>
            <p className="text-stone-600 mb-8">Are you sure you want to delete this item? This action cannot be undone.</p>
            <div className="flex gap-4 justify-end">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-black text-stone-900 mb-6">Edit {editingItem.collection.replace(/([A-Z])/g, ' $1').trim()}</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              {editingItem.data.admissionNumber !== undefined && (
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Admission Number</label>
                  <input 
                    type="text"
                    value={editingItem.data.admissionNumber}
                    onChange={e => {
                      const val = e.target.value;
                      setEditingItem({...editingItem, data: {...editingItem.data, admissionNumber: val}});
                      fetchPhotoByAdmissionNumber(val, (data) => {
                        setEditingItem(prev => prev ? ({
                          ...prev, 
                          data: {
                            ...prev.data, 
                            photoUrl: data.photoUrl || prev.data.photoUrl,
                            name: data.name || prev.data.name
                          }
                        }) : null);
                      });
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}
              {editingItem.data.name !== undefined && (
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Name</label>
                  <input 
                    type="text" required
                    value={editingItem.data.name}
                    onChange={e => {
                      const val = e.target.value;
                      setEditingItem({...editingItem, data: {...editingItem.data, name: val}});
                      // Only auto-fetch if it's an office bearer, board member or club member and no admission number
                      if (['officeBearers', 'boardMembers', 'clubMembers'].includes(editingItem.collection) && !editingItem.data.admissionNumber) {
                        fetchPhotoByName(val, (url) => setEditingItem(prev => prev ? ({...prev, data: {...prev.data, photoUrl: url}}) : null));
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}
              {editingItem.data.title !== undefined && (
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Title</label>
                  <input 
                    type="text" required
                    value={editingItem.data.title}
                    onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, title: e.target.value}})}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}
              {editingItem.data.date !== undefined && (
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Date</label>
                  <input 
                    type="date" required
                    value={editingItem.data.date}
                    onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, date: e.target.value}})}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}
              {editingItem.data.description !== undefined && (
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Description</label>
                  <textarea 
                    value={editingItem.data.description}
                    onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, description: e.target.value}})}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                  />
                </div>
              )}
              {editingItem.data.position !== undefined && (
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Position</label>
                  <input 
                    type="text" required
                    value={editingItem.data.position}
                    onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, position: e.target.value}})}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}
              {editingItem.data.caption !== undefined && (
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Caption</label>
                  <input 
                    type="text"
                    value={editingItem.data.caption}
                    onChange={e => setEditingItem({...editingItem, data: {...editingItem.data, caption: e.target.value}})}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}
              {editingItem.data.url !== undefined && (
                <ImageUpload
                  label="Image"
                  onUpload={(base64) => setEditingItem({...editingItem, data: {...editingItem.data, url: base64}})}
                  currentImageUrl={editingItem.data.url}
                />
              )}
              {editingItem.data.logoUrl !== undefined && (
                <ImageUpload
                  label="Logo"
                  onUpload={(base64) => setEditingItem({...editingItem, data: {...editingItem.data, logoUrl: base64}})}
                  currentImageUrl={editingItem.data.logoUrl}
                />
              )}
              {editingItem.data.photoUrl !== undefined && (
                <ImageUpload
                  label="Photo"
                  onUpload={(base64) => setEditingItem({...editingItem, data: {...editingItem.data, photoUrl: base64}})}
                  currentImageUrl={editingItem.data.photoUrl}
                />
              )}
              <div className="flex gap-4 pt-4">
                <Button variant="ghost" onClick={() => setEditingItem(null)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
