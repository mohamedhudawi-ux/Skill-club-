import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, writeBatch, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Student, CCEMark, CLASS_LIST, SUBJECT_LIST, CCE_TERMS } from '../types';
import { Card } from './Card';
import { Button } from './Button';
import { ClipboardList, Search, Save, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../AuthContext';

export function CCEMarksStaff() {
  const { profile } = useAuth();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<typeof CCE_TERMS[number] | ''>('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [existingMarks, setExistingMarks] = useState<Record<string, CCEMark>>({});
  const [marksInput, setMarksInput] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const handleClearAllMarks = async () => {
    // Removed native confirm() which is blocked on many mobile browsers
    setLoading(true);
    setStatus(null);
    try {
      const qMarks = query(
        collection(db, 'cceMarks'),
        where('class', '==', selectedClass),
        where('subject', '==', selectedSubject),
        where('term', '==', selectedTerm)
      );
      const markSnap = await getDocs(qMarks);
      
      if (markSnap.empty) {
        setStatus({ type: 'error', msg: 'No marks found to clear.' });
        setLoading(false);
        return;
      }
      
      const batch = writeBatch(db);
      markSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      setStatus({ type: 'success', msg: 'All marks cleared successfully.' });
      setExistingMarks({});
      setMarksInput({});
      handleSearch();
    } catch (error) {
      console.error('FAILED to clear marks:', error);
      setStatus({ type: 'error', msg: 'Failed to clear marks.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMark = async (studentId: string) => {
    // Removed native confirm() which is blocked on many mobile browsers
    const markId = existingMarks[studentId]?.id;
    if (!markId) return;

    try {
      await deleteDoc(doc(db, 'cceMarks', markId));
      
      setMarksInput(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      setExistingMarks(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      setStatus({ type: 'success', msg: 'Mark deleted successfully.' });
    } catch (error) {
      console.error('FAILED to delete mark:', error);
      setStatus({ type: 'error', msg: 'Failed to delete mark.' });
    }
  };

  const handleSearch = async () => {
    if (!selectedClass || !selectedSubject || !selectedTerm) {
      // Removed native alert()
      setStatus({ type: 'error', msg: 'Please select Class, Subject, and CCE Term.' });
      return;
    }

    setFetching(true);
    setStatus(null);
    try {
      // Fetch students of the class
      const qStudents = query(
        collection(db, 'students'),
        where('class', '==', selectedClass)
      );
      const studentSnap = await getDocs(qStudents);
      const studentList = studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      studentList.sort((a, b) => a.name.localeCompare(b.name));
      setStudents(studentList);

      // Fetch existing marks for this subject/term/class
      const qMarks = query(
        collection(db, 'cceMarks'),
        where('class', '==', selectedClass),
        where('subject', '==', selectedSubject),
        where('term', '==', selectedTerm)
      );
      const markSnap = await getDocs(qMarks);
      const marksMap: Record<string, CCEMark> = {};
      const inputs: Record<string, string> = {};
      
      markSnap.docs.forEach(doc => {
        const data = doc.data() as CCEMark;
        marksMap[data.studentId] = { id: doc.id, ...data };
        inputs[data.studentId] = data.mark.toString();
      });

      setExistingMarks(marksMap);
      setMarksInput(inputs);
    } catch (error) {
      console.error('Error fetching marks:', error);
      setStatus({ type: 'error', msg: 'Failed to fetch data.' });
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      for (const student of students) {
        const markValue = marksInput[student.admissionNumber];
        if (markValue === undefined || markValue.trim() === '') continue;

        const existingMark = existingMarks[student.admissionNumber];
        const markData = {
          studentId: student.admissionNumber,
          studentName: student.name,
          class: selectedClass,
          subject: selectedSubject,
          term: selectedTerm,
          mark: Number(markValue),
          uploadedBy: profile.uid,
          timestamp: serverTimestamp()
        };

        if (existingMark?.id) {
          const markRef = doc(db, 'cceMarks', existingMark.id);
          batch.update(markRef, markData);
        } else {
          const markRef = doc(collection(db, 'cceMarks'));
          batch.set(markRef, markData);
        }
      }

      await batch.commit();
      setStatus({ type: 'success', msg: 'Marks saved successfully!' });
      // Refresh to get new IDs
      handleSearch();
    } catch (error) {
      console.error('Error saving marks:', error);
      setStatus({ type: 'error', msg: 'Failed to save marks.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
          <ClipboardList size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-stone-900 uppercase tracking-tight">CCE Marks Upload</h1>
          <p className="text-sm font-medium text-stone-500">Select class and subject to manage continuous evaluation marks.</p>
        </div>
      </div>

      <Card className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Class</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-5 py-3 rounded-2xl border-2 border-stone-100 outline-none focus:border-indigo-500 bg-stone-50 font-bold transition-all"
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
              className="w-full px-5 py-3 rounded-2xl border-2 border-stone-100 outline-none focus:border-indigo-500 bg-stone-50 font-bold transition-all"
            >
              <option value="">Select Subject</option>
              {SUBJECT_LIST.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">CCE Term</label>
            <select 
              value={selectedTerm} 
              onChange={(e) => setSelectedTerm(e.target.value as any)}
              className="w-full px-5 py-3 rounded-2xl border-2 border-stone-100 outline-none focus:border-indigo-500 bg-stone-50 font-bold transition-all"
            >
              <option value="">Select CCE</option>
              {CCE_TERMS.map(term => <option key={term} value={term}>{term}</option>)}
            </select>
          </div>
          <Button onClick={handleSearch} disabled={fetching} className="h-[52px] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700">
            {fetching ? <Loader2 className="animate-spin" size={20} /> : <><Search size={20} /> Load Students</>}
          </Button>
        </div>
      </Card>

      {status && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${
          status.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {status.msg}
        </div>
      )}

      {students.length > 0 && (
        <Card className="overflow-hidden border-stone-200 shadow-xl shadow-stone-200/50">
          <div className="p-4 border-b border-stone-100 flex justify-end">
            <Button onClick={handleClearAllMarks} className="bg-red-600 text-white hover:bg-red-700 flex items-center gap-2">
              <Trash2 size={16} /> Clear All Marks
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Adm No</th>
                  <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Student Name</th>
                  <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest text-center">Marks (CCE 1-4)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {students.map((student) => (
                  <tr key={student.admissionNumber} className="hover:bg-stone-50 transition-colors">
                    <td className="px-8 py-5 font-mono text-sm text-stone-500">{student.admissionNumber}</td>
                    <td className="px-8 py-5">
                      <p className="font-bold text-stone-900">{student.name}</p>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          value={marksInput[student.admissionNumber] || ''}
                          onChange={(e) => setMarksInput({ ...marksInput, [student.admissionNumber]: e.target.value })}
                          className="w-24 px-4 py-2 text-center rounded-xl border border-stone-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-bold"
                          placeholder="0-100"
                        />
                        {existingMarks[student.admissionNumber] && (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteMark(student.admissionNumber);
                            }} 
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors z-[100] cursor-pointer"
                            title="Delete Mark"
                          >
                            <Trash2 size={24} className="pointer-events-none" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-8 bg-stone-50 border-t border-stone-100 flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 px-8 py-3 rounded-2xl"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Save All Marks</>}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
