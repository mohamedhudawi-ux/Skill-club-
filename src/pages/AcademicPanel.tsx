import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, getDoc, updateDoc, increment, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { SKILL_CLUB_CATEGORIES, Student, SkillClubCategory, BADGES, SKILL_CLUB_RULES } from '../types';
import { Star, Search, CheckCircle2, AlertCircle, FileText, PlusCircle, ClipboardList, GraduationCap } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { AdminSubmissions } from '../components/AdminSubmissions';
import { AdminGraceMarks } from '../components/AdminGraceMarks';

export default function AcademicPanel() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'performance' | 'submissions' | 'gracemarks' | 'reports'>('performance');
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [downloading, setDownloading] = useState(false);
  
  // Enter Marks State
  const [marksData, setMarksData] = useState({
    admissionNumber: '',
    category: SKILL_CLUB_CATEGORIES[0] as SkillClubCategory,
    subCategory: '',
    points: '',
    description: ''
  });
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const currentRules = SKILL_CLUB_RULES.find(r => r.category === marksData.category);

  // Auto-fill name when admission number is entered
  useEffect(() => {
    const fetchStudent = async () => {
      if (marksData.admissionNumber.length >= 3) {
        const docRef = doc(db, 'students', marksData.admissionNumber);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFoundStudent(docSnap.data() as Student);
        } else {
          setFoundStudent(null);
        }
      } else {
        setFoundStudent(null);
      }
    };
    fetchStudent();
  }, [marksData.admissionNumber]);

  const checkBadges = (totalPoints: number, currentBadges: string[]) => {
    const newBadges: string[] = [...currentBadges];
    BADGES.forEach(badge => {
      if (totalPoints >= badge.minPoints && !newBadges.includes(badge.id)) {
        newBadges.push(badge.id);
      }
    });
    return newBadges;
  };

  const handleEnterMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundStudent) {
      setStatus({ type: 'error', msg: 'Invalid admission number.' });
      return;
    }

    try {
      const points = Number(marksData.points);
      const studentRef = doc(db, 'students', marksData.admissionNumber);
      
      const newTotalPoints = (foundStudent.totalPoints || 0) + points;
      const updatedBadges = checkBadges(newTotalPoints, foundStudent.badges || []);

      await updateDoc(studentRef, {
        totalPoints: increment(points),
        [`categoryPoints.${marksData.category}`]: increment(points),
        badges: updatedBadges
      });

      // Also update user profile if it exists
      const usersQuery = query(collection(db, 'users'), where('admissionNumber', '==', marksData.admissionNumber));
      const userDocs = await getDocs(usersQuery);
      if (!userDocs.empty) {
        const userRef = doc(db, 'users', userDocs.docs[0].id);
        await updateDoc(userRef, {
          totalPoints: increment(points),
          badges: updatedBadges
        });
      }

      await addDoc(collection(db, 'skillClubEntries'), {
        studentAdmissionNumber: marksData.admissionNumber,
        category: marksData.category,
        subCategory: marksData.subCategory,
        points: points,
        description: marksData.description,
        addedBy: profile?.uid,
        timestamp: serverTimestamp()
      });

      // Update local state
      setFoundStudent(prev => prev ? {
        ...prev,
        totalPoints: newTotalPoints,
        badges: updatedBadges,
        categoryPoints: {
          ...prev.categoryPoints,
          [marksData.category]: (prev.categoryPoints?.[marksData.category] || 0) + points
        }
      } : null);

      setStatus({ type: 'success', msg: `Added ${points} points to ${foundStudent.name}!` });
      setMarksData({ ...marksData, points: '', description: '', subCategory: '' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add marks.' });
    }
  };

  const downloadMonthlyReport = async () => {
    setDownloading(true);
    try {
      const [year, month] = reportMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const q = query(
        collection(db, 'skillClubEntries'),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(doc => doc.data());

      if (entries.length === 0) {
        setStatus({ type: 'error', msg: 'No entries found for the selected month.' });
        setDownloading(false);
        return;
      }

      // Fetch student names for the entries
      const admissionNumbers = [...new Set(entries.map(e => e.studentAdmissionNumber))];
      const studentMap: Record<string, string> = {};
      
      for (const adm of admissionNumbers) {
        const sDoc = await getDoc(doc(db, 'students', adm));
        if (sDoc.exists()) {
          studentMap[adm] = sDoc.data().name;
        }
      }

      const reportData = entries.map(e => ({
        'Student Name': studentMap[e.studentAdmissionNumber] || 'Unknown',
        'Admission No': e.studentAdmissionNumber,
        'Sub-Category': e.subCategory,
        'Points': e.points
      }));

      // Convert to CSV using a simple manual implementation or papaparse if preferred
      // Using manual for simplicity as it's a flat structure
      const headers = Object.keys(reportData[0]).join(',');
      const rows = reportData.map(row => 
        Object.values(row).map(val => `"${val}"`).join(',')
      ).join('\n');
      
      const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `SkillClub_Report_${reportMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatus({ type: 'success', msg: 'Report downloaded successfully!' });
    } catch (error) {
      console.error('Report error:', error);
      setStatus({ type: 'error', msg: 'Failed to generate report.' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-stone-900">Academic Panel</h2>
        
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-stone-100 shadow-sm">
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'performance' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-stone-500 hover:bg-stone-50'
            }`}
          >
            <Star size={16} /> Performance
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'submissions' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-stone-500 hover:bg-stone-50'
            }`}
          >
            <ClipboardList size={16} /> Submissions
          </button>
          <button
            onClick={() => setActiveTab('gracemarks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'gracemarks' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-stone-500 hover:bg-stone-50'
            }`}
          >
            <GraduationCap size={16} /> Grace Marks
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'reports' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-stone-500 hover:bg-stone-50'
            }`}
          >
            <FileText size={16} /> Reports
          </button>
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

      {activeTab === 'performance' && (
        <Card className="p-8 max-w-2xl mx-auto">
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
              {foundStudent && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <p className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                    Student: {foundStudent.name}
                  </p>
                  <p className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                    Current Points: {foundStudent.totalPoints}
                  </p>
                </div>
              )}
            </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Category</label>
                  <select 
                    required
                    value={marksData.category}
                    onChange={e => {
                      const newCat = e.target.value as SkillClubCategory;
                      const rules = SKILL_CLUB_RULES.find(r => r.category === newCat);
                      setMarksData({
                        ...marksData, 
                        category: newCat,
                        subCategory: rules ? rules.subCategories[0].name : '',
                        points: rules ? rules.subCategories[0].points.toString() : ''
                      });
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    {SKILL_CLUB_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Sub-Category</label>
                  {currentRules ? (
                    <select
                      required
                      value={marksData.subCategory}
                      onChange={e => {
                        const sub = e.target.value;
                        const points = currentRules.subCategories.find(s => s.name === sub)?.points || '';
                        setMarksData({...marksData, subCategory: sub, points: points.toString()});
                      }}
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    >
                      {currentRules.subCategories.map(sub => (
                        <option key={sub.name} value={sub.name}>{sub.name} ({sub.points} pts)</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text"
                      value={marksData.subCategory}
                      onChange={e => setMarksData({...marksData, subCategory: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="e.g. Exam Topper, Star Program"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Points</label>
                <input 
                  type="number" required
                  value={marksData.points}
                  readOnly={!!currentRules}
                  onChange={e => setMarksData({...marksData, points: e.target.value})}
                  className={`w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none ${currentRules ? 'bg-stone-50 text-stone-500' : ''}`}
                  placeholder="Numeric points"
                />
                {currentRules && (
                  <p className="text-[10px] text-stone-400 mt-1 font-bold italic">* Points are fixed based on Skill Club rules for this category.</p>
                )}
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

            <div className="flex gap-4 mt-4">
              <Button 
                type="submit" 
                disabled={!foundStudent}
                className="flex-1"
              >
                Submit Performance Record
              </Button>
              <Button 
                type="button"
                variant="secondary"
                onClick={() => {
                  setMarksData({
                    admissionNumber: '',
                    category: SKILL_CLUB_CATEGORIES[0] as SkillClubCategory,
                    subCategory: '',
                    points: '',
                    description: ''
                  });
                  setFoundStudent(null);
                  setStatus(null);
                }}
                className="px-6"
              >
                Clear
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'reports' && (
        <Card className="p-8 max-w-md mx-auto">
          <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
            <FileText className="text-emerald-600" /> Monthly Performance Reports
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Select Month</label>
              <input 
                type="month" 
                value={reportMonth}
                onChange={e => setReportMonth(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-bold text-stone-700"
              />
            </div>
            
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
              <p className="text-xs text-stone-500 leading-relaxed">
                This report will include all Skill Club entries for the selected month, including student names, categories, and points.
              </p>
            </div>

            <Button 
              onClick={downloadMonthlyReport}
              disabled={downloading}
              className="w-full py-4 flex items-center justify-center gap-2"
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <FileText size={18} />
                  Download CSV Report
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'submissions' && <AdminSubmissions />}
      {activeTab === 'gracemarks' && <AdminGraceMarks />}
    </div>
  );
}
