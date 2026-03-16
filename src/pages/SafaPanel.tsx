import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { SAFA_CLUBS } from '../types';
import { Calendar, Award, CheckCircle2, AlertCircle, Bell, Users, Shield, FileText } from 'lucide-react';
import { SafaBoardsManager } from '../components/SafaBoardsManager';
import { ClubsManager } from '../components/ClubsManager';
import { WorkSubmissions } from '../components/WorkSubmissions';

export default function SafaPanel() {
  const { profile } = useAuth();
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'calendar' | 'boards' | 'clubs' | 'submissions'>('calendar');

  // Calendar State
  const [programData, setProgramData] = useState({
    title: '',
    date: '',
    description: ''
  });

  // Club Marks State
  const [clubMarks, setClubMarks] = useState({
    club: SAFA_CLUBS[0],
    description: '',
    points: '',
    admissionNumber: ''
  });

  const handleAddProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'programs'), {
        ...programData,
        addedBy: profile?.uid,
        timestamp: serverTimestamp()
      });
      setStatus({ type: 'success', msg: 'Program added to calendar!' });
      setProgramData({ title: '', date: '', description: '' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add program.' });
    }
  };

  const handleAddClubMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (clubMarks.admissionNumber) {
        const studentRef = doc(db, 'students', clubMarks.admissionNumber);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
          const points = Number(clubMarks.points);
          await updateDoc(studentRef, {
            totalPoints: increment(points),
            [`categoryPoints.Safa Programs`]: increment(points)
          });

          await addDoc(collection(db, 'skillClubEntries'), {
            studentAdmissionNumber: clubMarks.admissionNumber,
            category: 'Safa Programs',
            points: points,
            description: `[${clubMarks.club}] ${clubMarks.description}`,
            addedBy: profile?.uid,
            timestamp: serverTimestamp()
          });
          setStatus({ type: 'success', msg: 'Club marks awarded successfully!' });
        } else {
          setStatus({ type: 'error', msg: 'Student not found.' });
          return;
        }
      } else {
        await addDoc(collection(db, 'skillClubEntries'), {
          studentAdmissionNumber: 'UNION_RECORD',
          category: 'Safa Programs',
          points: Number(clubMarks.points),
          description: `[${clubMarks.club}] ${clubMarks.description}`,
          addedBy: profile?.uid,
          timestamp: serverTimestamp()
        });
        setStatus({ type: 'success', msg: 'Club activity recorded!' });
      }
      
      setClubMarks({ ...clubMarks, points: '', description: '', admissionNumber: '' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to record club marks.' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-stone-900">Safa Panel</h2>
        <div className="flex bg-stone-100 p-1 rounded-2xl overflow-x-auto">
          {[
            { id: 'calendar', label: 'Calendar & Marks', icon: Calendar },
            { id: 'boards', label: 'Boards', icon: Users },
            { id: 'clubs', label: 'Clubs', icon: Shield },
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

      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Program to Calendar */}
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
            <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
              <Calendar className="text-emerald-600" /> Update Calendar
            </h3>
            <form onSubmit={handleAddProgram} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Program Title</label>
                <input 
                  type="text" required
                  value={programData.title}
                  onChange={e => setProgramData({...programData, title: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="e.g. Monthly Union Meet"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Date</label>
                <input 
                  type="date" required
                  value={programData.date}
                  onChange={e => setProgramData({...programData, date: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Description</label>
                <textarea 
                  value={programData.description}
                  onChange={e => setProgramData({...programData, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                  placeholder="Brief details about the program..."
                />
              </div>
              <button type="submit" className="w-full bg-emerald-800 text-white py-3 rounded-xl font-bold hover:bg-emerald-900 transition-colors flex items-center justify-center gap-2">
                <Bell size={18} /> Publish & Notify
              </button>
            </form>
          </section>

          {/* Best Club Marks */}
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
            <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
              <Award className="text-emerald-600" /> Best Club Marks
            </h3>
            <form onSubmit={handleAddClubMarks} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Select Club</label>
                <select 
                  required
                  value={clubMarks.club}
                  onChange={e => setClubMarks({...clubMarks, club: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  {SAFA_CLUBS.map(club => (
                    <option key={club} value={club}>{club}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Admission Number (Optional)</label>
                <input 
                  type="text"
                  value={clubMarks.admissionNumber}
                  onChange={e => setClubMarks({...clubMarks, admissionNumber: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Enter student admission no. if applicable"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Points</label>
                <input 
                  type="number" required
                  value={clubMarks.points}
                  onChange={e => setClubMarks({...clubMarks, points: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Program Description</label>
                <textarea 
                  required
                  value={clubMarks.description}
                  onChange={e => setClubMarks({...clubMarks, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none h-24"
                  placeholder="Describe the club activity..."
                />
              </div>
              <button type="submit" className="w-full bg-emerald-800 text-white py-3 rounded-xl font-bold hover:bg-emerald-900 transition-colors">
                Add Club Marks
              </button>
            </form>
          </section>
        </div>
      )}

      {activeTab === 'boards' && <SafaBoardsManager />}
      {activeTab === 'clubs' && <ClubsManager />}
      {activeTab === 'submissions' && profile && <WorkSubmissions userProfile={profile} />}
    </div>
  );
}
