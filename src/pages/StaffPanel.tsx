import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, getDoc, updateDoc, increment, serverTimestamp, setDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { SKILL_CLUB_CATEGORIES, Student } from '../types';
import { UserPlus, Star, Search, CheckCircle2, AlertCircle, FileSpreadsheet, FileText, Users } from 'lucide-react';
import { BulkUpload } from '../components/BulkUpload';
import { WorkSubmissions } from '../components/WorkSubmissions';

export default function StaffPanel() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'students' | 'marks' | 'bulk' | 'submissions'>('students');
  
  // Add Student State
  const [newStudent, setNewStudent] = useState({
    admissionNumber: '',
    name: '',
    dob: '',
    fatherName: '',
    address: '',
    phone: '',
    email: '',
    photoURL: '',
    class: ''
  });
  
  // Enter Marks State
  const [marksData, setMarksData] = useState({
    admissionNumber: '',
    category: SKILL_CLUB_CATEGORIES[0],
    points: '',
    description: ''
  });
  const [foundStudentName, setFoundStudentName] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Auto-fill name when admission number is entered
  useEffect(() => {
    const fetchStudent = async () => {
      if (marksData.admissionNumber.length >= 3) {
        const docRef = doc(db, 'students', marksData.admissionNumber);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFoundStudentName(docSnap.data().name);
        } else {
          setFoundStudentName('');
        }
      } else {
        setFoundStudentName('');
      }
    };
    fetchStudent();
  }, [marksData.admissionNumber]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'students', newStudent.admissionNumber), {
        ...newStudent,
        totalPoints: 0,
        categoryPoints: {}
      });
      setStatus({ type: 'success', msg: 'Student added successfully!' });
      setNewStudent({ admissionNumber: '', name: '', dob: '', fatherName: '', address: '', phone: '', email: '', photoURL: '', class: '' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add student.' });
    }
  };

  const handleEnterMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundStudentName) {
      setStatus({ type: 'error', msg: 'Invalid admission number.' });
      return;
    }

    try {
      const points = Number(marksData.points);
      const studentRef = doc(db, 'students', marksData.admissionNumber);
      
      await updateDoc(studentRef, {
        totalPoints: increment(points),
        [`categoryPoints.${marksData.category}`]: increment(points)
      });

      await addDoc(collection(db, 'skillClubEntries'), {
        studentAdmissionNumber: marksData.admissionNumber,
        category: marksData.category,
        points: points,
        description: marksData.description,
        addedBy: profile?.uid,
        timestamp: serverTimestamp()
      });

      setStatus({ type: 'success', msg: 'Marks added successfully!' });
      setMarksData({ ...marksData, points: '', description: '' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add marks.' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-stone-900">Staff Panel</h2>
        <div className="flex bg-stone-100 p-1 rounded-2xl overflow-x-auto">
          {[
            { id: 'students', label: 'Students', icon: Users },
            { id: 'marks', label: 'Enter Marks', icon: Star },
            { id: 'bulk', label: 'Bulk Upload', icon: FileSpreadsheet },
            { id: 'submissions', label: 'Submissions', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
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

      {activeTab === 'students' && (
        <section className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
            <UserPlus className="text-emerald-600" /> Add New Student
          </h3>
          <form onSubmit={handleAddStudent} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Admission Number</label>
              <input 
                type="text" required
                value={newStudent.admissionNumber}
                onChange={e => setNewStudent({...newStudent, admissionNumber: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Full Name</label>
              <input 
                type="text" required
                value={newStudent.name}
                onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Class</label>
              <input 
                type="text" required
                value={newStudent.class}
                onChange={e => setNewStudent({...newStudent, class: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="e.g. 10th A"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Date of Birth</label>
              <input 
                type="date" required
                value={newStudent.dob}
                onChange={e => setNewStudent({...newStudent, dob: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Father's Name</label>
              <input 
                type="text" required
                value={newStudent.fatherName}
                onChange={e => setNewStudent({...newStudent, fatherName: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Phone</label>
              <input 
                type="tel" required
                value={newStudent.phone}
                onChange={e => setNewStudent({...newStudent, phone: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Address</label>
              <textarea 
                required
                value={newStudent.address}
                onChange={e => setNewStudent({...newStudent, address: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none h-20"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Email</label>
              <input 
                type="email" required
                value={newStudent.email}
                onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <button type="submit" className="sm:col-span-2 bg-emerald-800 text-white py-3 rounded-xl font-bold hover:bg-emerald-900 transition-colors mt-4">
              Register Student
            </button>
          </form>
        </section>
      )}

      {activeTab === 'marks' && (
        <section className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
            <Star className="text-emerald-600" /> SkillClub Performance Entry
          </h3>
          <form onSubmit={handleEnterMarks} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Admission Number</label>
              <div className="relative">
                <input 
                  type="text" required
                  value={marksData.admissionNumber}
                  onChange={e => setMarksData({...marksData, admissionNumber: e.target.value})}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Enter Admission No."
                />
                <Search className="absolute left-3 top-2.5 text-stone-400" size={18} />
              </div>
              {foundStudentName && (
                <p className="text-xs font-bold text-emerald-700 mt-2 bg-emerald-50 px-3 py-1 rounded-full inline-block">
                  Student: {foundStudentName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Category</label>
              <select 
                required
                value={marksData.category}
                onChange={e => setMarksData({...marksData, category: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                {SKILL_CLUB_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Points</label>
              <input 
                type="number" required
                value={marksData.points}
                onChange={e => setMarksData({...marksData, points: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Numeric points"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Program Description</label>
              <textarea 
                required
                value={marksData.description}
                onChange={e => setMarksData({...marksData, description: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                placeholder="Describe the program/achievement..."
              />
            </div>

            <button 
              type="submit" 
              disabled={!foundStudentName}
              className="w-full bg-emerald-800 text-white py-3 rounded-xl font-bold hover:bg-emerald-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              Submit Performance Record
            </button>
          </form>
        </section>
      )}

      {activeTab === 'bulk' && <BulkUpload />}
      {activeTab === 'submissions' && profile && <WorkSubmissions userProfile={profile} />}
    </div>
  );
}
