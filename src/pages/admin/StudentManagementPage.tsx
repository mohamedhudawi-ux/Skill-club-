import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, setDoc, where, getDocs, limit, getDoc, startAfter, orderBy, addDoc, writeBatch, documentId } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';
import { db } from '../../firebase';
import { Student } from '../../types';
import { CLASS_LIST, normalizeClass } from '../../constants';
import { Trash2, Edit2, X, Plus, Upload, Download, Users, Key, Search, ExternalLink } from 'lucide-react';
import { saveAs } from 'file-saver';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ImageUpload } from '../../components/ImageUpload';
import { useAuth } from '../../AuthContext';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export default function StudentManagementPage() {
  const { isAdmin, isStaff, campusId } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedClass, setSelectedClass] = useState('All');

  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [credentialStudent, setCredentialStudent] = useState<Student | null>(null);
  const [newCredEmail, setNewCredEmail] = useState('');
  const [newCredPassword, setNewCredPassword] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newStudentPhoto, setNewStudentPhoto] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkClass, setBulkClass] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkClassConfirm, setBulkClassConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSelectAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map(s => s.id!)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || !campusId) return;
    setBulkDeleteConfirm(false);
    setIsBulkUpdating(true);
    setStatus({ type: 'success', msg: `Deleting ${selectedIds.size} students...` });

    try {
      const uidsToDelete: string[] = [];
      const admissionNumbers: string[] = [];
      const batch = writeBatch(db);
      
      // 1. Get admission numbers for all selected IDs from Firestore
      const idArray = Array.from(selectedIds);
      console.log('Bulk delete IDs:', idArray);

      for (let i = 0; i < idArray.length; i += 30) {
        const chunk = idArray.slice(i, i + 30);
        const studentsQuery = query(collection(db, 'students'), where('campusId', '==', campusId), where(documentId(), 'in', chunk));
        const studentDocs = await getDocs(studentsQuery);
        
        console.log(`Found ${studentDocs.size} student docs for chunk ${i/30 + 1}`);
        
        studentDocs.forEach(doc => {
          const data = doc.data();
          if (data.admissionNumber) {
            admissionNumbers.push(data.admissionNumber);
          }
          batch.delete(doc.ref);
        });
      }
      
      // 2. Find associated user documents by admissionNumber
      if (admissionNumbers.length > 0) {
        console.log('Finding user docs for admission numbers:', admissionNumbers);
        for (let i = 0; i < admissionNumbers.length; i += 30) {
          const chunk = admissionNumbers.slice(i, i + 30);
          const usersQuery = query(collection(db, 'users'), where('campusId', '==', campusId), where('admissionNumber', 'in', chunk));
          const userDocs = await getDocs(usersQuery);
          
          console.log(`Found ${userDocs.size} user docs for chunk ${i/30 + 1}`);
          
          userDocs.forEach(userDoc => {
            uidsToDelete.push(userDoc.id);
            batch.delete(doc(db, 'users', userDoc.id));
          });
        }
      }
      
      // 3. Commit Firestore deletions
      await batch.commit();
      console.log('Firestore batch commit successful');
      
      // 4. Delete Auth accounts via backend API
      if (uidsToDelete.length > 0) {
        console.log('Deleting Auth accounts for UIDs:', uidsToDelete);
        try {
          const response = await fetch('/api/admin/delete-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uids: uidsToDelete })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.warn('Firestore documents deleted, but failed to delete some Auth accounts:', errorData);
          } else {
            console.log('Auth accounts deleted successfully');
          }
        } catch (apiErr) {
          console.error('Error calling delete-users API:', apiErr);
        }
      }
      
      setStatus({ type: 'success', msg: `Successfully deleted ${selectedIds.size} students and their accounts.` });
      setSelectedIds(new Set());
      fetchStudents(false);
    } catch (err: any) {
      console.error('Error bulk deleting:', err);
      setStatus({ type: 'error', msg: 'Failed to delete students: ' + (err.message || 'Unknown error') });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkClassChange = async () => {
    if (selectedIds.size === 0 || !bulkClass || !campusId) return;
    setBulkClassConfirm(false);
    setIsBulkUpdating(true);
    setStatus({ type: 'success', msg: `Updating class to ${bulkClass} for ${selectedIds.size} students...` });

    try {
      const batch = writeBatch(db);
      const admissionNumbers: string[] = [];
      
      // 1. Update students collection and collect admission numbers
      const idArray = Array.from(selectedIds);
      for (let i = 0; i < idArray.length; i += 30) {
        const chunk = idArray.slice(i, i + 30);
        const studentsQuery = query(collection(db, 'students'), where('campusId', '==', campusId), where(documentId(), 'in', chunk));
        const studentDocs = await getDocs(studentsQuery);
        
        studentDocs.forEach(doc => {
          const data = doc.data();
          if (data.admissionNumber) {
            admissionNumbers.push(data.admissionNumber);
          }
          batch.update(doc.ref, { class: bulkClass });
        });
      }

      // 2. Update users collection if they exist
      if (admissionNumbers.length > 0) {
        for (let i = 0; i < admissionNumbers.length; i += 30) {
          const chunk = admissionNumbers.slice(i, i + 30);
          const usersQuery = query(collection(db, 'users'), where('campusId', '==', campusId), where('admissionNumber', 'in', chunk));
          const userDocs = await getDocs(usersQuery);
          
          userDocs.forEach(userDoc => {
            batch.update(userDoc.ref, { class: bulkClass });
          });
        }
      }

      await batch.commit();

      setStatus({ type: 'success', msg: `Successfully updated class for ${selectedIds.size} students.` });
      setSelectedIds(new Set());
      setBulkClass('');
      fetchStudents(false);
    } catch (err: any) {
      console.error('Error bulk updating class:', err);
      setStatus({ type: 'error', msg: 'Failed to update class: ' + (err.message || 'Unknown error') });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const fetchStudents = async (isNext = false) => {
    if (!campusId) return;
    try {
      setLoading(true);
      
      const trimmedSearch = searchTerm.trim();
      const isAdmissionSearch = /^\d+$/.test(trimmedSearch);
      
      let newStudents: Student[] = [];
      let nextLastDoc = null;
      let nextHasMore = false;

      // Special case: Exact match for admission number
      if (isAdmissionSearch && !isNext) {
        const qAdm = query(collection(db, 'students'), where('campusId', '==', campusId), where('admissionNumber', '==', trimmedSearch));
        const snapAdm = await getDocs(qAdm);
        newStudents = snapAdm.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        nextLastDoc = null;
        nextHasMore = false;
      } else {
        // General case: Paginated list with optional class filter and name prefix search
        const constraints: any[] = [where('campusId', '==', campusId), orderBy('name', 'asc'), limit(50)];
        
        if (selectedClass !== 'All') {
          constraints.push(where('class', '==', selectedClass));
        }

        if (trimmedSearch && !isAdmissionSearch) {
          // Prefix match (case-insensitive by forcing uppercase as we normalize data to uppercase)
          const searchUpper = trimmedSearch.toUpperCase();
          constraints.push(where('name', '>=', searchUpper));
          constraints.push(where('name', '<=', searchUpper + '\uf8ff'));
        }

        if (isNext && lastDoc) {
          constraints.push(startAfter(lastDoc));
        }

        const q = query(collection(db, 'students'), ...constraints);
        const snap = await getDocs(q);
        newStudents = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        nextLastDoc = snap.docs[snap.docs.length - 1];
        nextHasMore = snap.docs.length === 50;
      }

      if (isNext) {
        setStudents(prev => [...prev, ...newStudents]);
      } else {
        setStudents(newStudents);
      }
      
      setLastDoc(nextLastDoc);
      setHasMore(nextHasMore);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      if (error.message?.includes('index')) {
        setStatus({ type: 'error', msg: 'This search/filter combination requires a Firestore index. Please check the console for the link.' });
      } else {
        setStatus({ type: 'error', msg: 'Failed to fetch students. Quota may be exceeded.' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLastDoc(null);
    setStudents([]);
    fetchStudents(false);
  }, [selectedClass]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(!!searchTerm.trim());
    setLastDoc(null);
    setStudents([]);
    fetchStudents(false);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setIsSearching(false);
    setLastDoc(null);
    setStudents([]);
    // We don't need to call fetchStudents here because the useEffect on selectedClass will trigger it if we reset searchTerm
    // Actually, let's just call it to be sure
    fetchStudents(false);
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!campusId) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    setLoading(true);
    try {
      if (fileExtension === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsed = (results.data as any[]).map(data => ({
              id: data.admissionNumber,
              name: String(data.name || '').toUpperCase(),
              admissionNumber: data.admissionNumber,
              class: normalizeClass(data.class),
              fatherName: data.fatherName || '',
              dob: data.dob || '',
              address: data.address || '',
              phone: data.phone || '',
              email: data.email || '',
              totalPoints: 0,
              categoryPoints: {},
              badges: [],
              campusId: campusId!,
              createdAt: new Date().toISOString()
            }));
            setPendingStudents(parsed);
            setLoading(false);
          }
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const parsed = jsonData.map((data: any) => ({
          id: String(data.admissionNumber || data.AdmissionNumber),
          name: String(data.name || data.Name || '').toUpperCase(),
          admissionNumber: String(data.admissionNumber || data.AdmissionNumber),
          class: normalizeClass(String(data.class || data.Class || '')),
          fatherName: String(data.fatherName || data.FatherName || ''),
          dob: String(data.dob || data.DOB || ''),
          address: String(data.address || data.Address || ''),
          phone: String(data.phone || data.Phone || ''),
          email: String(data.email || data.Email || ''),
          totalPoints: 0,
          categoryPoints: {},
          badges: [],
          campusId: campusId!,
          createdAt: new Date().toISOString()
        }));
        setPendingStudents(parsed);
        setLoading(false);
      } else if (fileExtension === 'pdf') {
        const pdfjs = await import('pdfjs-dist');
        // Use Vite's ?url import for the PDF worker to ensure it is bundled correctly
        // @ts-ignore
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min?url');
        pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        const students: any[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
          
          // Basic heuristic for parsing rows from text
          // This assumes a common format where admission number and name are on the same line or close
          const lines = pageText.split(/\s{2,}/); // Split by multiple spaces which often separate columns
          
          // Attempt to find patterns like: [Admission Number] [Name] [Class]
          // This is a generic approach and might need refinement for specific PDF layouts
          const admissionPattern = /^\d{4,6}$/; // Typical admission number format
          
          for (let j = 0; j < lines.length; j++) {
            const part = lines[j].trim();
            if (admissionPattern.test(part)) {
              // Found something that looks like an admission number
              const admissionNumber = part;
              const name = lines[j+1]?.trim() || '';
              const studentClass = lines[j+2]?.trim() || '';
              
              if (name && name.length > 2) {
                students.push({
                  id: admissionNumber,
                  name: name.toUpperCase(),
                  admissionNumber: admissionNumber,
                  class: normalizeClass(studentClass),
                  fatherName: '',
                  dob: '',
                  address: '',
                  phone: '',
                  email: '',
                  totalPoints: 0,
                  categoryPoints: {},
                  badges: [],
                  campusId: campusId!,
                  createdAt: new Date().toISOString()
                });
              }
            }
          }
        }
        
        if (students.length > 0) {
          setPendingStudents(students);
          setStatus({ type: 'success', msg: `Successfully parsed ${students.length} students from PDF.` });
        } else {
          console.log('PDF Text:', fullText);
          setStatus({ type: 'error', msg: 'Could not find student data in the PDF. Please ensure it follows a standard list format.' });
        }
        setLoading(false);
      }
    } catch (err: any) {
      setStatus({ type: 'error', msg: 'Failed to import students: ' + err.message });
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (!campusId) return;
      // Find the user by admissionNumber and campusId
      const usersQuery = query(collection(db, 'users'), where('admissionNumber', '==', deleteConfirm), where('campusId', '==', campusId));
      const userDocs = await getDocs(usersQuery);
      
      if (!userDocs.empty) {
        const uid = userDocs.docs[0].id;
        // Delete user from Firebase Auth via backend API
        const response = await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid })
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete user account');
        }

        // Delete user document from Firestore
        await deleteDoc(doc(db, 'users', uid));
      }

      // Delete student document
      await deleteDoc(doc(db, 'students', deleteConfirm));
      setDeleteConfirm(null);
      setStatus({ type: 'success', msg: 'Student and account deleted successfully.' });
    } catch (error: any) {
      console.error('Failed to delete student:', error);
      setStatus({ type: 'error', msg: 'Failed to delete student: ' + (error.message || 'Unknown error') });
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !campusId) return;
    setIsUpdating(true);
    try {
      const studentRef = doc(db, 'students', editingStudent.id!);
      const normalizedName = (editingStudent.name || '').toUpperCase();
      const normalizedClass = normalizeClass(editingStudent.class || '');
      await updateDoc(studentRef, {
        name: normalizedName,
        class: normalizedClass,
        photoURL: editingStudent.photoURL || '',
        phone: editingStudent.phone || '',
        email: editingStudent.email || '',
        fatherName: editingStudent.fatherName || '',
        dob: editingStudent.dob || '',
        address: editingStudent.address || ''
      });

      // Also update in users collection if exists
      if (editingStudent.admissionNumber) {
        const usersQuery = query(collection(db, 'users'), where('admissionNumber', '==', editingStudent.admissionNumber), where('campusId', '==', campusId));
        const userDocs = await getDocs(usersQuery);
        if (!userDocs.empty) {
          const userRef = doc(db, 'users', userDocs.docs[0].id);
          await updateDoc(userRef, {
            displayName: normalizedName,
            class: normalizedClass,
            photoURL: editingStudent.photoURL || '',
            phone: editingStudent.phone || '',
            email: editingStudent.email || ''
          });
        }
      }

      setStatus({ type: 'success', msg: `Student ${normalizedName} updated successfully!` });
      setEditingStudent(null);
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Failed to update student.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialStudent || !campusId) return;
    setLoading(true);
    try {
      // Find user UID by admission number and campusId
      const usersQuery = query(collection(db, 'users'), where('admissionNumber', '==', credentialStudent.admissionNumber), where('campusId', '==', campusId));
      const userDocs = await getDocs(usersQuery);
      if (userDocs.empty) throw new Error('User account not found for this student.');
      
      const uid = userDocs.docs[0].id;
      const response = await fetch('/api/admin/update-user-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          email: newCredEmail || undefined,
          password: newCredPassword || undefined,
          displayName: credentialStudent.name
        })
      });

      const data = await response.json();
      if (data.success) {
        // Update email in students collection too
        if (newCredEmail) {
          await updateDoc(doc(db, 'students', credentialStudent.id!), { email: newCredEmail });
          // Update local state
          setStudents(prev => prev.map(s => s.id === credentialStudent.id ? { ...s, email: newCredEmail } : s));
        }
        setStatus({ type: 'success', msg: `Credentials updated for ${credentialStudent.name}` });
        setCredentialStudent(null);
        setNewCredEmail('');
        setNewCredPassword('');
      } else {
        throw new Error(data.error || 'Failed to update credentials');
      }
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Failed to update credentials.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    const data = students.map(s => ({
      AdmissionNumber: s.admissionNumber,
      Name: s.name,
      Class: s.class,
      FatherName: s.fatherName,
      DOB: s.dob,
      Address: s.address,
      Phone: s.phone,
      Email: s.email,
      TotalPoints: s.totalPoints
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'students.xlsx');
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const name = formData.get('name') as string;
    const admissionNumber = formData.get('admissionNumber') as string;
    const studentClass = formData.get('class') as string;
    const fatherName = formData.get('fatherName') as string;
    const dob = formData.get('dob') as string;
    const address = formData.get('address') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;

    try {
      setLoading(true);
      
      if (admissionNumber) {
        const q = query(collection(db, 'students'), where('campusId', '==', campusId), where('admissionNumber', '==', admissionNumber));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setStatus({ type: 'error', msg: 'Admission number already exists.' });
          setLoading(false);
          return;
        }
      }

      const normalizedName = (name || '').toUpperCase();
      const normalizedStudentClass = normalizeClass(studentClass);
      const studentData = {
        name: normalizedName,
        admissionNumber: admissionNumber || '',
        class: normalizedStudentClass,
        fatherName,
        dob,
        address,
        phone,
        email,
        photoURL: newStudentPhoto,
        totalPoints: 0,
        categoryPoints: {},
        badges: [],
        campusId: campusId,
        createdAt: new Date().toISOString()
      };

      if (admissionNumber) {
        await setDoc(doc(db, 'students', admissionNumber), studentData);
      } else {
        await addDoc(collection(db, 'students'), studentData);
      }

      setStatus({ type: 'success', msg: `Student ${normalizedName} added successfully!` });
      setIsAdding(false);
      setNewStudentPhoto(undefined);
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Failed to add student.' });
    } finally {
      setLoading(false);
    }
  };

  const [provisionConfirm, setProvisionConfirm] = useState(false);
  const [fixNamesConfirm, setFixNamesConfirm] = useState(false);
  const [normalizeClassesConfirm, setNormalizeClassesConfirm] = useState(false);

  const handleNormalizeAllClasses = async () => {
    setNormalizeClassesConfirm(false);
    setLoading(true);
    setStatus({ type: 'success', msg: 'Starting class normalization for all students...' });

    try {
      if (!campusId) return;
      // Fetch all students for this campus
      const studentsSnap = await getDocs(query(collection(db, 'students'), where('campusId', '==', campusId)));
      let updatedCount = 0;
      let skippedCount = 0;

      for (const studentDoc of studentsSnap.docs) {
        const data = studentDoc.data();
        const currentClass = data.class || '';
        const normalized = normalizeClass(currentClass);

        if (normalized !== currentClass) {
          // Update student doc
          await updateDoc(studentDoc.ref, { class: normalized });

          // Update user doc if exists
          if (data.admissionNumber) {
            const usersQuery = query(collection(db, 'users'), where('campusId', '==', campusId), where('admissionNumber', '==', data.admissionNumber));
            const userDocs = await getDocs(usersQuery);
            if (!userDocs.empty) {
              await updateDoc(userDocs.docs[0].ref, { class: normalized });
            }
          }
          updatedCount++;
        } else {
          skippedCount++;
        }
      }

      setStatus({ type: 'success', msg: `Normalization complete! Updated: ${updatedCount}, Already correct: ${skippedCount}` });
      fetchStudents(false);
    } catch (err: any) {
      console.error('Failed to normalize classes:', err);
      setStatus({ type: 'error', msg: 'Failed to normalize classes: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFixNames = async () => {
    setFixNamesConfirm(false);
    const nameMapping: Record<string, string> = {
      "500": "MUHAMMAD ZEESHAN",
      "531": "MUHAMMED RAZA",
      "542": "SHAMS KAMAR",
      "544": "MD RAHBAR ISLAM",
      "548": "MD TASIR HUSAIN",
      "513": "SHEK SAMEER",
      "551": "REHAN ALAM",
      "555": "MULLA ASRARUL HAQ",
      "561": "S HAMMAD RAJA",
      "569": "MULLA HAYASAB GARI MAHBOOB VALI",
      "588": "SHAFQATULLAH KARIMI",
      "683": "AHMAD RAZA KHAN",
      "571": "SHAIK MAHAMMAD HUSSAIN",
      "605": "RAIYAN WARIS",
      "606": "P ABDUL MATIN KHAN",
      "613": "MOHAMMED FAIZAN",
      "614": "MOIZ ASIF",
      "618": "ABDUL DANISH",
      "620": "MD SAHIL ANSARI",
      "621": "SYED SAIF",
      "622": "MOHAMMED ISMAIL",
      "623": "T USMAN",
      "627": "SHAIK ANIS",
      "628": "NUMAN ALI",
      "633": "ANSARI INAIF SADIQ",
      "644": "FARHAN",
      "650": "SHAIK MOHAMMED AFFAN",
      "660": "MOHAMMED FAISAL",
      "661": "GAJULA ABDULLA",
      "677": "S RIYAZ",
      "678": "SHAIK ASHRAF ALI"
    };

    setLoading(true);
    setStatus({ type: 'success', msg: `Starting name updates for ${Object.keys(nameMapping).length} students...` });

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const [admNo, newName] of Object.entries(nameMapping)) {
        try {
          // Update students collection
          const studentRef = doc(db, 'students', admNo);
          const studentSnap = await getDoc(studentRef);
          
          if (studentSnap.exists()) {
            await updateDoc(studentRef, { name: newName });
          } else {
            // Create the student doc if it somehow doesn't exist
            await setDoc(studentRef, {
              name: newName,
              admissionNumber: admNo,
              totalPoints: 0,
              categoryPoints: {},
              badges: [],
              createdAt: new Date().toISOString()
            });
          }

          // Update users collection
          const usersQuery = query(collection(db, 'users'), where('admissionNumber', '==', admNo));
          const userDocs = await getDocs(usersQuery);
          if (!userDocs.empty) {
            const userRef = doc(db, 'users', userDocs.docs[0].id);
            await updateDoc(userRef, { displayName: newName });
          }

          successCount++;
        } catch (err) {
          console.error(`Failed to update name for ${admNo}:`, err);
          errorCount++;
        }
      }

      setStatus({ type: 'success', msg: `Name update complete! Success: ${successCount}, Errors: ${errorCount}` });
    } catch (err: any) {
      console.error('Name update error:', err);
      setStatus({ type: 'error', msg: 'Name update failed: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPending = async () => {
    const studentsToProvision = [
      "883", "891", "881", "887", "885", "889"
    ];

    setLoading(true);
    setStatus({ type: 'success', msg: `Checking pending accounts...` });

    try {
      const pending: string[] = [];
      for (const admNo of studentsToProvision) {
        const studentDoc = await getDoc(doc(db, 'students', admNo));
        if (!studentDoc.exists() || !studentDoc.data()?.email) {
          pending.push(admNo);
        }
      }

      if (pending.length === 0) {
        setStatus({ type: 'success', msg: `All ${studentsToProvision.length} accounts have been provisioned!` });
      } else {
        setStatus({ type: 'error', msg: `${pending.length} accounts are still pending: ${pending.join(', ')}` });
      }
    } catch (err: any) {
      console.error('Check pending error:', err);
      setStatus({ type: 'error', msg: 'Failed to check pending accounts: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleProvisionAccounts = async () => {
    setProvisionConfirm(false);
    const studentsToProvision = [
      "883", "891", "881", "887", "885", "889"
    ];

    setLoading(true);
    setStatus({ type: 'success', msg: `Starting provisioning for ${studentsToProvision.length} students...` });

    try {
      const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
      const secondaryAuth = getAuth(secondaryApp);
      
      let successCount = 0;
      let errorCount = 0;

      for (const admNo of studentsToProvision) {
        const email = `${admNo}@skill.edu`;
        const password = `stu${admNo}`;
        
        let studentDocExists = false;
        try {
          // Check if student exists in students collection
          const studentDoc = await getDoc(doc(db, 'students', admNo));
          studentDocExists = studentDoc.exists();
          let studentName = `Student ${admNo}`;
          
          if (studentDocExists) {
            const data = studentDoc.data();
            studentName = data?.name || studentName;
            
            // If student already has an email, they are likely already provisioned
            if (data?.email) {
              console.log(`Account already provisioned for ${admNo} (email exists in doc), skipping...`);
              successCount++;
              setStatus({ type: 'success', msg: `Provisioned ${successCount}/${studentsToProvision.length}...` });
              continue; // Skip the rest of the loop for this student
            }
          } else {
            console.warn(`Student doc not found for ${admNo}`);
          }

          // Create user with retry for rate limits
          let userCredential;
          let retries = 5;
          let backoff = 10000; // Start with 10 seconds
          while (retries > 0) {
            try {
              userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
              break; // Success
            } catch (err: any) {
              if (err.code === 'auth/too-many-requests') {
                retries--;
                if (retries === 0) throw err;
                console.log(`Rate limited for ${admNo}, waiting ${backoff / 1000}s before retry...`);
                setStatus({ type: 'success', msg: `Rate limit hit. Firebase requires cooldown. Waiting ${backoff / 1000}s before retrying ${admNo}...` });
                await new Promise(resolve => setTimeout(resolve, backoff));
                backoff *= 2; // Exponential backoff: 10s -> 20s -> 40s -> 80s
              } else {
                throw err; // Re-throw other errors (like email-already-in-use) to be handled by outer catch
              }
            }
          }
          
          if (!userCredential) {
            throw new Error('Failed to create user credential');
          }

          const uid = userCredential.user.uid;
          
          await updateProfile(userCredential.user, { displayName: studentName });
          
          // Update student doc
          if (studentDocExists) {
            await updateDoc(doc(db, 'students', admNo), { email });
          } else {
            await setDoc(doc(db, 'students', admNo), {
              name: studentName,
              admissionNumber: admNo,
              email,
              totalPoints: 0,
              categoryPoints: {},
              badges: [],
              createdAt: new Date().toISOString()
            });
          }
          
          // Create user doc
          await setDoc(doc(db, 'users', uid), {
            uid,
            email,
            displayName: studentName,
            role: 'student',
            admissionNumber: admNo,
            createdAt: new Date().toISOString()
          }, { merge: true });
          
          await secondaryAuth.signOut();
          successCount++;
          setStatus({ type: 'success', msg: `Provisioned ${successCount}/${studentsToProvision.length}...` });
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            console.log(`Account already exists for ${admNo}, updating student doc...`);
            // Already provisioned, just update the student doc if needed
            if (studentDocExists) {
              await updateDoc(doc(db, 'students', admNo), { email });
            }
            successCount++;
          } else {
            console.error(`Failed to provision ${admNo}:`, err);
            errorCount++;
          }
        }
        
        // Add a delay to avoid auth/too-many-requests
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      setStatus({ type: 'success', msg: `Provisioning complete! Success: ${successCount}, Errors: ${errorCount}` });
    } catch (err: any) {
      console.error('Provisioning error:', err);
      let errorMsg = err.message;
      if (errorMsg.includes('identitytoolkit.googleapis.com') || errorMsg.includes('Identity Toolkit API')) {
        errorMsg = `Firebase Authentication (Identity Toolkit API) is not enabled. 
        
1. Enable it: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=531260372208
2. Click "Get Started" in Firebase Auth: https://console.firebase.google.com/project/gen-lang-client-0615445747/authentication
3. Wait 3-5 minutes.`;
      }
      setStatus({ type: 'error', msg: 'Provisioning failed: ' + errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const classOptions = ['All', ...CLASS_LIST].sort();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-stone-900">Student Management</h2>
        {(isAdmin || isStaff) && (
          <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
            <Plus size={18} /> Add New Student
          </Button>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-4">
        <div className="relative flex-grow">
          <input 
            type="text" 
            placeholder="Search by name or admission number..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <Search className="absolute left-3 top-2.5 text-stone-400" size={18} />
          {searchTerm && (
            <button 
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <select 
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          {classOptions.map(cls => <option key={cls} value={cls}>{cls}</option>)}
        </select>
        <Button type="submit" variant="secondary" disabled={loading}>
          {loading ? '...' : 'Search'}
        </Button>
      </form>

      {status && (
        <div className={`px-4 py-2 rounded-xl text-sm font-bold ${
          status.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
        }`}>
          {status.msg}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="bg-stone-900 text-white px-6 py-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 sticky top-4 z-10 shadow-xl animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold bg-stone-800 px-3 py-1 rounded-full">{selectedIds.size} Selected</span>
            <Button variant="secondary" className="text-xs bg-stone-800 border-none text-white hover:bg-stone-700" onClick={() => setSelectedIds(new Set())}>
              Deselect All
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-stone-800 p-1 rounded-xl">
              <select 
                className="bg-transparent text-xs font-bold px-3 py-1 outline-none border-none"
                value={bulkClass}
                onChange={(e) => setBulkClass(e.target.value)}
              >
                <option value="" className="text-stone-900">Change Class...</option>
                {CLASS_LIST.map(c => <option key={c} value={c} className="text-stone-900">{c}</option>)}
              </select>
              <Button 
                variant="primary" 
                className="py-1 px-4 text-xs"
                disabled={!bulkClass || isBulkUpdating}
                onClick={() => setBulkClassConfirm(true)}
              >
                Apply
              </Button>
            </div>
            <div className="h-6 w-px bg-stone-700 mx-1" />
            <Button 
              variant="secondary" 
              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-none text-xs font-bold py-2 px-4"
              disabled={isBulkUpdating}
              onClick={() => setBulkDeleteConfirm(true)}
            >
              <Trash2 size={14} className="mr-2" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-100">
              <th className="px-6 py-4 w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                  checked={students.length > 0 && students.every(s => selectedIds.has(s.id!))}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Student</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Admission No.</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase text-center">Account</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Class</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {students.length > 0 ? students.map((student) => (
              <tr key={student.id} className={`hover:bg-stone-50 transition-colors ${selectedIds.has(student.id!) ? 'bg-emerald-50/30' : ''}`}>
                <td className="px-6 py-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                    checked={selectedIds.has(student.id!)}
                    onChange={() => toggleSelect(student.id!)}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={student.photoURL || `https://ui-avatars.com/api/?name=${student.name}&background=random`} className="w-8 h-8 rounded-full" alt="" />
                    <span className="font-bold text-stone-900">{student.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-stone-500 font-mono">{student.admissionNumber}</td>
                <td className="px-6 py-4 text-sm text-stone-500 font-mono">{student.email || 'N/A'}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    student.email ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {student.email ? 'Provisioned' : 'No Email'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-stone-500 font-bold">{student.class || 'N/A'}</td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <Button 
                    variant="secondary" 
                    className="p-2"
                    title="View Portfolio"
                    onClick={() => window.open(`/portfolio/${student.admissionNumber}`, '_blank')}
                  >
                    <ExternalLink size={16} className="text-emerald-600" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="p-2"
                    title="Clear Points"
                    onClick={async () => {
                      if (window.confirm(`Are you sure you want to clear points for ${student.name}?`)) {
                        try {
                          await updateDoc(doc(db, 'students', student.id!), {
                            totalPoints: 0,
                            categoryPoints: {},
                            badges: []
                          });

                          // Also clear in users collection if exists
                          if (student.admissionNumber) {
                            const usersQuery = query(collection(db, 'users'), where('admissionNumber', '==', student.admissionNumber));
                            const userDocs = await getDocs(usersQuery);
                            if (!userDocs.empty) {
                              await updateDoc(doc(db, 'users', userDocs.docs[0].id), {
                                totalPoints: 0,
                                badges: []
                              });
                            }
                          }

                          setStatus({ type: 'success', msg: `Points cleared for ${student.name}` });
                        } catch (err) {
                          console.error('Error clearing points:', err);
                          setStatus({ type: 'error', msg: 'Failed to clear points: ' + (err instanceof Error ? err.message : String(err)) });
                        }
                      }
                    }}
                  >
                    <Trash2 size={16} className="text-orange-500" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="p-2"
                    title="Manage Credentials"
                    onClick={() => {
                      setCredentialStudent(student);
                      setNewCredEmail(student.email || '');
                      setNewCredPassword('');
                    }}
                  >
                    <Key size={16} className="text-blue-600" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="p-2"
                    onClick={() => setEditingStudent(student)}
                  >
                    <Edit2 size={16} />
                  </Button>
                  {(isAdmin || isStaff) && (
                    <Button variant="danger" className="p-2" onClick={() => setDeleteConfirm(student.id!)}>
                      <Trash2 size={16} />
                    </Button>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-stone-400 italic">
                  {loading ? 'Loading students...' : 'No students found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button 
            variant="secondary" 
            onClick={() => fetchStudents(true)}
            disabled={loading}
            className="px-8"
          >
            {loading ? 'Loading...' : 'Load More Students'}
          </Button>
        </div>
      )}

      <div className="flex justify-end">
        <input type="file" ref={fileInputRef} onChange={handleBulkImport} accept=".csv, .pdf, .xlsx, .xls" className="hidden" />
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
          <Upload size={18} /> Import CSV/Excel/PDF
        </Button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="p-8 max-w-md w-full shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <h3 className="text-2xl font-bold text-stone-900">Add New Student</h3>
              <Button variant="ghost" onClick={() => { setIsAdding(false); setNewStudentPhoto(undefined); }} className="p-2 hover:bg-stone-100 rounded-full">
                <X size={24} />
              </Button>
            </div>
            <div className="overflow-y-auto pr-2 custom-scrollbar">
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Full Name</label>
                  <input name="name" className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Admission Number</label>
                  <input name="admissionNumber" className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Class</label>
                  <select name="class" className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none">
                    {CLASS_LIST.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Father's Name</label>
                  <input name="fatherName" className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Date of Birth</label>
                  <input name="dob" type="date" className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Address</label>
                  <input name="address" className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Phone</label>
                  <input name="phone" className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Email</label>
                  <input name="email" type="email" className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <ImageUpload
                    label="Student Photo"
                    onUpload={(base64) => setNewStudentPhoto(base64)}
                    currentImageUrl={newStudentPhoto}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Adding...' : 'Add Student'}
                </Button>
              </form>
            </div>
          </Card>
        </div>
      )}

      {credentialStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="p-8 max-w-md w-full shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-stone-900">Manage Credentials</h3>
              <Button variant="ghost" onClick={() => setCredentialStudent(null)} className="p-2 hover:bg-stone-100 rounded-full">
                <X size={24} />
              </Button>
            </div>
            <form onSubmit={handleUpdateCredentials} className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-4">
                <p className="text-xs text-blue-700 font-medium">
                  <strong>Note:</strong> Passwords are encrypted and cannot be viewed. You can only set a new password.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Student Name</label>
                <input value={credentialStudent.name} disabled className="w-full px-4 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Email Address</label>
                <input 
                  type="email"
                  value={newCredEmail}
                  onChange={e => setNewCredEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  placeholder="Enter new email"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">New Password</label>
                <input 
                  type="text"
                  value={newCredPassword}
                  onChange={e => setNewCredPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  placeholder="Enter new password"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Updating...' : 'Update Credentials'}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="p-8 max-w-md w-full shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <h3 className="text-2xl font-bold text-stone-900">Edit Student</h3>
              <Button variant="ghost" onClick={() => setEditingStudent(null)} className="p-2 hover:bg-stone-100 rounded-full">
                <X size={24} />
              </Button>
            </div>
            <div className="overflow-y-auto pr-2 custom-scrollbar">
              <form onSubmit={handleUpdateStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Name</label>
                  <input 
                    type="text"
                    value={editingStudent.name || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Class</label>
                  <select 
                    value={editingStudent.class || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, class: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {CLASS_LIST.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Father's Name</label>
                  <input 
                    type="text"
                    value={editingStudent.fatherName || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, fatherName: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Date of Birth</label>
                  <input 
                    type="date"
                    value={editingStudent.dob || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, dob: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Address</label>
                  <input 
                    type="text"
                    value={editingStudent.address || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, address: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Phone</label>
                  <input 
                    type="text"
                    value={editingStudent.phone || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Email</label>
                  <input 
                    type="email"
                    value={editingStudent.email || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, email: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <ImageUpload
                    label="Update Photo"
                    onUpload={(base64) => setEditingStudent({ ...editingStudent, photoURL: base64 })}
                    currentImageUrl={editingStudent.photoURL}
                  />
                </div>
                <Button type="submit" disabled={isUpdating} className="w-full">
                  {isUpdating ? 'Updating...' : 'Save Changes'}
                </Button>
              </form>
            </div>
          </Card>
        </div>
      )}

      {pendingStudents.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="p-8 max-w-4xl w-full shadow-2xl relative max-h-[90vh] flex flex-col">
            <h3 className="text-2xl font-bold text-stone-900 mb-6">Review Imported Students</h3>
            <div className="overflow-y-auto pr-2 custom-scrollbar flex-grow">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="px-4 py-2 text-xs font-bold text-stone-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-xs font-bold text-stone-500 uppercase">Admission No.</th>
                    <th className="px-4 py-2 text-xs font-bold text-stone-500 uppercase">Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {pendingStudents.map((student, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2"><input value={student.name} onChange={e => {
                        const updated = [...pendingStudents];
                        updated[index].name = e.target.value;
                        setPendingStudents(updated);
                      }} className="w-full px-2 py-1 rounded border border-stone-200" /></td>
                      <td className="px-4 py-2"><input value={student.admissionNumber} onChange={e => {
                        const updated = [...pendingStudents];
                        updated[index].admissionNumber = e.target.value;
                        setPendingStudents(updated);
                      }} className="w-full px-2 py-1 rounded border border-stone-200" /></td>
                      <td className="px-4 py-2">
                        <select value={student.class} onChange={e => {
                          const updated = [...pendingStudents];
                          updated[index].class = e.target.value;
                          setPendingStudents(updated);
                        }} className="w-full px-2 py-1 rounded border border-stone-200 bg-white">
                          <option value="">Select Class</option>
                          {CLASS_LIST.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-4 mt-6 flex-shrink-0">
              <Button variant="secondary" onClick={() => setPendingStudents([])}>Cancel</Button>
              <Button onClick={async () => {
                setLoading(true);
                try {
                  for (const student of pendingStudents) {
                    await setDoc(doc(db, 'students', student.admissionNumber), {
                      ...student,
                      createdAt: new Date().toISOString()
                    });
                  }
                  setStatus({ type: 'success', msg: 'Students added successfully!' });
                  setPendingStudents([]);
                } catch (err: any) {
                  setStatus({ type: 'error', msg: 'Failed to add students: ' + err.message });
                } finally {
                  setLoading(false);
                }
              }}>Confirm & Add</Button>
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t border-stone-200">
        <Button variant="secondary" onClick={handleCheckPending} disabled={loading} className="flex items-center gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">
          <Key size={18} /> Check Pending
        </Button>
        <Button variant="secondary" onClick={() => setFixNamesConfirm(true)} disabled={loading} className="flex items-center gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
          <Edit2 size={18} /> Fix Names
        </Button>
        <Button variant="secondary" onClick={() => setNormalizeClassesConfirm(true)} disabled={loading} className="flex items-center gap-2 bg-purple-100 text-purple-700 hover:bg-purple-200 border-none">
          <Users size={18} /> Normalize Classes
        </Button>
        <Button variant="secondary" onClick={() => setProvisionConfirm(true)} disabled={loading} className="flex items-center gap-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">
          <Key size={18} /> Provision Accounts
        </Button>
        <Button variant="secondary" onClick={handleDownloadExcel} className="flex items-center gap-2">
          <Download size={18} /> Download CSV
        </Button>
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Student"
        message="Are you sure you want to delete this student? This action cannot be undone."
        confirmText="Delete Student"
        variant="danger"
      />

      <ConfirmModal
        isOpen={provisionConfirm}
        onClose={() => setProvisionConfirm(false)}
        onConfirm={handleProvisionAccounts}
        title="Provision Accounts"
        message="Are you sure you want to provision accounts for the selected students? This will create Firebase Authentication accounts for them."
        confirmText="Provision Accounts"
        variant="info"
      />

      <ConfirmModal
        isOpen={fixNamesConfirm}
        onClose={() => setFixNamesConfirm(false)}
        onConfirm={handleFixNames}
        title="Fix Student Names"
        message="Are you sure you want to update the display names for the specified students to their original names?"
        confirmText="Update Names"
        variant="info"
      />

      <ConfirmModal
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Bulk Delete Students"
        message={`Are you sure you want to delete ${selectedIds.size} selected students and their associated accounts? This action cannot be undone.`}
        confirmText="Delete Selected"
        variant="danger"
      />

      <ConfirmModal
        isOpen={bulkClassConfirm}
        onClose={() => setBulkClassConfirm(false)}
        onConfirm={handleBulkClassChange}
        title="Bulk Change Class"
        message={`Are you sure you want to change the class to ${bulkClass} for ${selectedIds.size} selected students?`}
        confirmText="Apply Change"
        variant="info"
      />

      <ConfirmModal
        isOpen={normalizeClassesConfirm}
        onClose={() => setNormalizeClassesConfirm(false)}
        onConfirm={handleNormalizeAllClasses}
        title="Normalize All Classes"
        message="Are you sure you want to normalize classes for ALL students? This will remove sections from S3-SS2 and ensure S1-S2 have sections (defaulting to A)."
        confirmText="Normalize All"
        variant="info"
      />
    </div>
  );
}
