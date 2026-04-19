import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Student, CCEMark, CLASS_LIST, SUBJECT_LIST, CCE_TERMS, UserProfile } from '../types';
import { Card } from './Card';
import { Button } from './Button';
import { ClipboardList, Search, User, GraduationCap, Loader2, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { CCEMarksStudent } from './CCEMarksStudent';

export function CCEMarksAdmin() {
  const [viewType, setViewType] = useState<'staff' | 'student' | 'manage'>('staff');
  
  // Staff Selection States
  const [allStaff, setAllStaff] = useState<UserProfile[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjects, setSubjects] = useState<string[]>(SUBJECT_LIST);
  const [newSubject, setNewSubject] = useState('');
  
  // Student Selection States
  const [selectedStudentClass, setSelectedStudentClass] = useState('');
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Results
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, Record<string, {mark: number, docId: string}>>>({});
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchSubjects = async () => {
      const docRef = doc(db, 'siteContent', 'subjects');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSubjects((docSnap.data().value as string).split(',').map(s => s.trim()));
      }
    };
    fetchSubjects();
    
    const fetchStaff = async () => {
      const q = query(collection(db, 'users'), where('role', 'in', ['staff', 'admin', 'academic']));
      const snap = await getDocs(q);
      setAllStaff(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    };
    fetchStaff();
  }, []);

  useEffect(() => {
    if (selectedStudentClass) {
      const fetchClassStudents = async () => {
        const q = query(collection(db, 'students'), where('class', '==', selectedStudentClass));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setClassStudents(list);
      };
      fetchClassStudents();
    } else {
      setClassStudents([]);
      setSelectedStudent(null);
    }
  }, [selectedStudentClass]);

  const handleStaffViewSearch = async () => {
    if (!selectedClass || !selectedSubject) {
      alert('Please select Class and Subject.');
      return;
    }
    setLoading(true);
    try {
      // Fetch students of the class
      const qStudents = query(collection(db, 'students'), where('class', '==', selectedClass));
      const studentSnap = await getDocs(qStudents);
      const studentList = studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      studentList.sort((a, b) => a.name.localeCompare(b.name));
      setStudents(studentList);

      // Fetch marks for this class and subject
      const qMarks = query(
        collection(db, 'cceMarks'),
        where('class', '==', selectedClass),
        where('subject', '==', selectedSubject)
      );
      const markSnap = await getDocs(qMarks);
      const marksMap: Record<string, Record<string, {mark: number, docId: string}>> = {};
      
      markSnap.docs.forEach(doc => {
        const data = doc.data() as CCEMark;
        // Optional filter by staff if specified
        if (selectedStaff && data.uploadedBy !== selectedStaff) return;
        
        if (!marksMap[data.studentId]) marksMap[data.studentId] = {};
        marksMap[data.studentId][data.term] = { mark: Number(data.mark), docId: doc.id };
      });
      setMarks(marksMap);
    } catch (error) {
      console.error('Error fetching admin staff view:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSubject = async (subject: string) => {
    const updatedSubjects = subjects.filter(s => s !== subject);
    await setDoc(doc(db, 'siteContent', 'subjects'), { value: updatedSubjects.join(',') });
    setSubjects(updatedSubjects);
  };

  const handleAddSubject = async () => {
    if (!newSubject.trim()) return;
    const updatedSubjects = [...subjects, newSubject.trim()];
    await setDoc(doc(db, 'siteContent', 'subjects'), { value: updatedSubjects.join(',') });
    setSubjects(updatedSubjects);
    setNewSubject('');
  };

  const handleUpdateMark = async (studentId: string, term: string, newValue: number, existingDocId: string) => {
    try {
      await updateDoc(doc(db, 'cceMarks', existingDocId), { mark: newValue });
      setMarks(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [term]: { ...prev[studentId][term], mark: newValue }
        }
      }));
    } catch (error) {
      console.error('Error updating mark:', error);
      alert('Failed to update mark.');
    }
  };

  const handleDeleteMark = async (studentId: string, term: string, existingDocId: string) => {
    // Removed native confirm() which is blocked on many mobile browsers
    try {
      await deleteDoc(doc(db, 'cceMarks', existingDocId));
      setMarks(prev => {
        const next = { ...prev };
        if (next[studentId]) {
          const nextStudentMarks = { ...next[studentId] };
          delete nextStudentMarks[term];
          next[studentId] = nextStudentMarks;
        }
        return next;
      });
    } catch (error) {
      console.error('FAILED to delete mark:', error);
    }
  };

  const handleClearAllMarks = async () => {
    // Removed native confirm() which is blocked on many mobile browsers
    setLoading(true);
    try {
      const qMarks = query(
        collection(db, 'cceMarks'),
        where('class', '==', selectedClass),
        where('subject', '==', selectedSubject)
      );
      const markSnap = await getDocs(qMarks);
      if (markSnap.empty) {
        setLoading(false);
        return;
      }
      const batch = writeBatch(db);
      markSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      setMarks({});
    } catch (error) {
      console.error('FAILED to clear marks:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-4">
        <button 
          onClick={() => setViewType('staff')}
          className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
            viewType === 'staff' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-stone-500 hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <User size={18} /> Staff View
          </div>
        </button>
        <button 
          onClick={() => setViewType('student')}
          className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
            viewType === 'student' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white text-stone-500 hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <GraduationCap size={18} /> Student View
          </div>
        </button>
        <button 
          onClick={() => setViewType('manage')}
          className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
            viewType === 'manage' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-white text-stone-500 hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <ClipboardList size={18} /> Manage Subjects
          </div>
        </button>
      </div>

      {viewType === 'manage' ? (
        <Card className="p-8">
            <h3 className="text-lg font-bold mb-4">Manage Subjects</h3>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={newSubject} 
                onChange={(e) => setNewSubject(e.target.value)} 
                className="flex-1 px-5 py-3 rounded-2xl border-2 border-stone-100 outline-none focus:border-indigo-500 bg-stone-50"
                placeholder="New Subject Name"
              />
              <Button onClick={handleAddSubject} className="bg-emerald-600">
                <Plus size={20} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {subjects.map(sub => (
                <div key={sub} className="flex items-center gap-2 bg-stone-100 px-3 py-1 rounded-full text-sm">
                  {sub}
                  <button onClick={() => handleRemoveSubject(sub)} className="text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </Card>
      ) : viewType === 'staff' ? (
        <div className="space-y-6">
          <Card className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Staff Member (Optional)</label>
                <select 
                  value={selectedStaff} 
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl border-2 border-stone-100 outline-none focus:border-indigo-500 bg-stone-50 font-bold"
                >
                  <option value="">Any Staff</option>
                  {allStaff
                    .filter(s => s.displayName !== "Mohamed Thaha" && s.displayName !== "Admin")
                    .map(s => <option key={s.uid} value={s.uid}>{s.displayName || s.email}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Class</label>
                <select 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl border-2 border-stone-100 outline-none focus:border-indigo-500 bg-stone-50 font-bold"
                >
                  <option value="">Select Class</option>
                  {CLASS_LIST.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Subject</label>
                <select 
                  value={selectedSubject} 
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl border-2 border-stone-100 outline-none focus:border-indigo-500 bg-stone-50 font-bold"
                >
                  <option value="">Select Subject</option>
                  {subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>
              <Button onClick={handleStaffViewSearch} disabled={loading} className="h-[52px] bg-indigo-600">
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              </Button>
            </div>
          </Card>

          {students.length > 0 && (
            <Card className="overflow-hidden border-stone-200">
              <div className="p-4 border-b border-stone-100 flex justify-end">
                <Button onClick={handleClearAllMarks} className="bg-red-600 text-white hover:bg-red-700">
                  <Trash2 size={16} className="mr-2" /> Clear All Marks
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Student</th>
                      <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest text-center">Adm No</th>
                      {CCE_TERMS.map(term => (
                        <th key={term} className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest text-center">{term}</th>
                      ))}
                      <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {students.map(student => {
                      const studentMarks = marks[student.admissionNumber] || {};
                      return (
                        <tr key={student.admissionNumber} className="hover:bg-stone-50">
                          <td className="px-6 py-4 font-bold text-stone-900">{student.name}</td>
                          <td className="px-6 py-4 text-center font-mono text-sm text-stone-500">{student.admissionNumber}</td>
                    {CCE_TERMS.map(term => (
                            <td key={term} className="px-6 py-4 text-center">
                              {studentMarks[term] ? (
                                <div className="flex items-center justify-center gap-2">
                                  <input
                                    type="number"
                                    value={studentMarks[term].mark}
                                    onChange={(e) => handleUpdateMark(student.admissionNumber, term, Number(e.target.value), studentMarks[term].docId)}
                                    className="w-16 px-2 py-1 border rounded text-center font-bold text-stone-900"
                                  />
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('Admin delete clicked for:', student.admissionNumber, term);
                                      handleDeleteMark(student.admissionNumber, term, studentMarks[term].docId);
                                    }}
                                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors z-[100] cursor-pointer"
                                    title="Delete Mark"
                                  >
                                    <Trash2 size={24} className="pointer-events-none" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-stone-300">-</span>
                              )}
                            </td>
                          ))}
                          <td className="px-6 py-4 font-black text-stone-900 text-center">
                            {(() => {
                              let sum = 0;
                              CCE_TERMS.forEach(term => {
                                if (studentMarks[term]) sum += Number(studentMarks[term].mark || 0);
                              });
                              if (selectedSubject.toLowerCase() === 'hifz & nazira') return sum;
                              return (sum / CCE_TERMS.length).toFixed(1);
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Class</label>
                <select 
                  value={selectedStudentClass} 
                  onChange={(e) => setSelectedStudentClass(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl border-2 border-stone-100 outline-none focus:border-emerald-500 bg-stone-50 font-bold"
                >
                  <option value="">Select Class</option>
                  {CLASS_LIST.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Student</label>
                <select 
                  onChange={(e) => {
                    const admitted = classStudents.find(s => s.admissionNumber === e.target.value);
                    setSelectedStudent(admitted || null);
                  }}
                  className="w-full px-5 py-3 rounded-2xl border-2 border-stone-100 outline-none focus:border-emerald-500 bg-stone-50 font-bold"
                >
                  <option value="">Select Student</option>
                  {classStudents.map(s => <option key={s.admissionNumber} value={s.admissionNumber}>{s.name} ({s.admissionNumber})</option>)}
                </select>
              </div>
            </div>
          </Card>

          {selectedStudent && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CCEMarksStudent student={selectedStudent} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
