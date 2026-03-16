import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Student, SkillClubEntry, SKILL_CLUB_CATEGORIES, Query, Notification } from '../types';
import { 
  User, Mail, Phone, MapPin, Calendar, Award, TrendingUp, 
  FileText, Users, CheckCircle, MessageSquare, Bell, 
  BarChart3, PlusCircle, Image as ImageIcon, Search
} from 'lucide-react';
import { WorkSubmissions } from '../components/WorkSubmissions';
import { QueryBox } from '../components/QueryBox';
import { AdminDashboard } from '../components/AdminDashboard';
import { StaffDashboard } from '../components/StaffDashboard';
import { SafaDashboard } from '../components/SafaDashboard';

export default function Dashboard() {
  const { profile, isAdmin, isStaff, isSafa, isStudent } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [entries, setEntries] = useState<SkillClubEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'queries' | 'notifications'>('overview');

  useEffect(() => {
    if (!profile) return;

    // Notifications listener for all users
    const qNotify = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', profile.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const unsubNotify = onSnapshot(qNotify, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    });

    if (isStudent && profile.admissionNumber) {
      const unsubStudent = onSnapshot(doc(db, 'students', profile.admissionNumber), (doc) => {
        if (doc.exists()) {
          setStudent(doc.data() as Student);
        }
        setLoading(false);
      });

      const qEntries = query(
        collection(db, 'skillClubEntries'),
        where('studentAdmissionNumber', '==', profile.admissionNumber),
        orderBy('timestamp', 'desc')
      );
      const unsubEntries = onSnapshot(qEntries, (snapshot) => {
        setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SkillClubEntry)));
      });

      return () => {
        unsubNotify();
        unsubStudent();
        unsubEntries();
      };
    } else {
      setLoading(false);
      return () => unsubNotify();
    }
  }, [profile, isStudent]);

  if (loading) return (
    <div className="animate-pulse space-y-8">
      <div className="h-40 bg-stone-200 rounded-3xl"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="h-60 bg-stone-200 rounded-3xl"></div>
        <div className="h-60 bg-stone-200 rounded-3xl col-span-2"></div>
      </div>
    </div>
  );

  if (isAdmin) return <AdminDashboard />;
  if (isStaff) return <StaffDashboard />;
  if (isSafa) return <SafaDashboard />;

  if (isStudent && !profile?.admissionNumber) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-8 rounded-3xl text-center">
        <h2 className="text-2xl font-bold text-amber-900 mb-2">Profile Not Linked</h2>
        <p className="text-amber-700">Your account is not yet linked to a student record. Please contact the staff or admin to add your admission number.</p>
      </div>
    );
  }

  if (isStudent && !student) return <div className="text-center py-20 text-stone-500">Student record not found.</div>;

  return (
    <div className="space-y-8">
      {/* Student Profile Header */}
      {student && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 flex flex-col md:flex-row gap-8 items-center md:items-start">
          <img 
            src={student.photoURL || `https://ui-avatars.com/api/?name=${student.name}&background=random&size=200`} 
            alt={student.name} 
            className="w-40 h-40 rounded-2xl object-cover shadow-lg border-4 border-white"
          />
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl font-black text-stone-900 mb-2">{student.name}</h2>
            <div className="flex flex-wrap items-center gap-3 mb-6 justify-center md:justify-start">
              <p className="text-emerald-700 font-bold">Admission No: {student.admissionNumber}</p>
              <span className="px-3 py-1 bg-stone-100 rounded-full text-xs font-bold text-stone-600">Class: {student.class || 'N/A'}</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-stone-600">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Calendar size={16} className="text-stone-400" /> <span>DOB: {student.dob}</span>
              </div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <User size={16} className="text-stone-400" /> <span>Father: {student.fatherName}</span>
              </div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Mail size={16} className="text-stone-400" /> <span>{student.email}</span>
              </div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Phone size={16} className="text-stone-400" /> <span>{student.phone}</span>
              </div>
            </div>
          </div>
          <div className="bg-emerald-900 text-white p-6 rounded-2xl text-center min-w-[160px] shadow-xl shadow-emerald-900/20">
            <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-70">Total Points</p>
            <p className="text-5xl font-black">{student.totalPoints || 0}</p>
            <div className="mt-4 flex items-center justify-center gap-1 text-emerald-300 text-xs font-bold">
              <TrendingUp size={14} /> <span>SkillClub Rank</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-stone-200 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'submissions', label: 'Submissions', icon: FileText },
          { id: 'queries', label: 'Queries', icon: MessageSquare },
          { id: 'notifications', label: 'Notifications', icon: Bell }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'border-emerald-600 text-emerald-900' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {activeTab === 'overview' && student && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
              <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
                <Award className="text-emerald-600" /> Category Performance
              </h3>
              <div className="space-y-4">
                {SKILL_CLUB_CATEGORIES.map((cat) => {
                  const points = student.categoryPoints?.[cat] || 0;
                  const max = 100;
                  const percentage = Math.min((points / max) * 100, 100);
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm font-bold mb-1">
                        <span className="text-stone-600">{cat}</span>
                        <span className="text-emerald-700">{points} pts</span>
                      </div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-600 rounded-full transition-all duration-1000" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
              <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
                <TrendingUp className="text-emerald-600" /> Recent Activities
              </h3>
              <div className="space-y-4">
                {entries.length > 0 ? entries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-100">
                    <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg">
                      <Award size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-stone-900">{entry.category}</h4>
                        <span className="text-emerald-700 font-black">+{entry.points}</span>
                      </div>
                      <p className="text-sm text-stone-500 mt-1">{entry.description}</p>
                      <p className="text-[10px] text-stone-400 mt-2 font-medium uppercase tracking-wider">
                        {entry.timestamp?.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 text-stone-400 italic">
                    No activities recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'submissions' && profile && (
          <div className="max-w-4xl mx-auto">
            <WorkSubmissions userProfile={profile} />
          </div>
        )}

        {activeTab === 'queries' && profile && (
          <div className="max-w-4xl mx-auto">
            <QueryBox userProfile={profile} />
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="max-w-2xl mx-auto space-y-4">
            {notifications.length > 0 ? notifications.map(n => (
              <div key={n.id} className={`p-6 rounded-3xl border ${n.read ? 'bg-white border-stone-100' : 'bg-emerald-50 border-emerald-100 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-stone-900">{n.title}</h4>
                  <span className="text-[10px] text-stone-400 font-bold uppercase">
                    {n.timestamp?.toDate().toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-stone-600">{n.message}</p>
              </div>
            )) : (
              <div className="text-center py-20 text-stone-400 italic">
                No notifications yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
