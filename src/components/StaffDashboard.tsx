import React, { useEffect, useState } from 'react';
import { Card } from './Card';
import { Users, Calendar, FileText, Award, TrendingUp, ChevronRight, CheckCircle, XCircle, Clock, Search, AlertCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { collection, getDocs, query, orderBy, limit, where, getCountFromServer, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Student, WorkSubmission } from '../types';
import { Button } from './Button';
import { CLASS_LIST } from '../constants';
import { BrandingHeader } from './BrandingHeader';

export function StaffDashboard() {
  const { profile } = useAuth();
  const { siteContent: content } = useSettings();
  const [topStudents, setTopStudents] = useState<Student[]>([]);
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [recentSubmissions, setRecentSubmissions] = useState<WorkSubmission[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [filteredClassStudents, setFilteredClassStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribers: (() => void)[] = [];

    const setupListeners = () => {
      if (!profile?.campusId) return;
      const campusId = profile.campusId;

      // Top Students
      unsubscribers.push(onSnapshot(query(collection(db, 'students'), where('campusId', '==', campusId), orderBy('totalPoints', 'desc'), limit(3)), (snap) => {
        setTopStudents(snap.docs.map(doc => doc.data() as Student));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'students')));

      // Class Counts
      unsubscribers.push(onSnapshot(query(collection(db, 'students'), where('campusId', '==', campusId)), (snap) => {
        const counts: Record<string, number> = {};
        CLASS_LIST.forEach(className => {
          counts[className] = snap.docs.filter(doc => doc.data().class === className).length;
        });
        setClassCounts(counts);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'students')));

      // Recent Submissions
      unsubscribers.push(onSnapshot(query(
        collection(db, 'workSubmissions'),
        where('campusId', '==', campusId),
        where('status', '==', 'pending'),
        orderBy('timestamp', 'desc'),
        limit(5)
      ), (snap) => {
        setRecentSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkSubmission)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'workSubmissions')));

      setLoading(false);
    };

    setupListeners();
    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  const handleClassClick = async (className: string) => {
    if (!profile?.campusId) return;
    
    setSelectedClass(className);
    setSearchTerm('');
    try {
      const q = query(collection(db, 'students'), where('campusId', '==', profile.campusId), where('class', '==', className), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      const students = snap.docs.map(doc => doc.data() as Student);
      setClassStudents(students);
      setFilteredClassStudents(students);
    } catch (error) {
      console.error('Error fetching class students:', error);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = classStudents.filter(s => 
      s.name.toLowerCase().includes(term.toLowerCase()) || 
      s.admissionNumber.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredClassStudents(filtered);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-stone-500 font-bold animate-pulse">Loading Staff Dashboard...</p>
      </div>
    );
  }

  const collegeLogo = content.find(c => c.key === 'college_logo')?.value;

  return (
    <div className="space-y-10">
      <BrandingHeader />

      {error && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-700 animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertCircle size={20} />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-stone-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl flex flex-col md:flex-row items-center gap-8">
        <img 
          src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'Staff'}&background=random&size=200`} 
          alt="Profile" 
          className="w-24 h-24 md:w-32 md:h-32 rounded-3xl object-cover border-4 border-white/10 shadow-xl"
        />
        <div className="text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
            Welcome,<br />
            <span className="text-blue-400">{profile?.displayName || 'Staff Member'}</span>!
          </h2>
          <p className="text-stone-400 font-medium">Here's what's happening in your classes today.</p>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-8 bg-blue-50 border-blue-100 relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-blue-800 text-xs font-black uppercase tracking-widest mb-1">Total Students</p>
            <h4 className="text-4xl font-black text-blue-950 mb-2">
              {Object.values(classCounts).reduce((a: number, b: number) => a + b, 0)}
            </h4>
            <div className="flex items-center text-blue-600 text-xs font-bold">
              <Users size={14} className="mr-1" />
              Across {Object.keys(classCounts).length} classes
            </div>
          </div>
          <Users className="absolute -right-4 -bottom-4 w-24 h-24 text-blue-500/10 group-hover:scale-110 transition-transform" />
        </Card>

        <Card className="p-8 bg-emerald-50 border-emerald-100 relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-emerald-800 text-xs font-black uppercase tracking-widest mb-1">Pending Reviews</p>
            <h4 className="text-4xl font-black text-emerald-950 mb-2">{recentSubmissions.length}</h4>
            <div className="flex items-center text-emerald-600 text-xs font-bold">
              <Clock size={14} className="mr-1" />
              Recent work submissions
            </div>
          </div>
          <FileText className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-500/10 group-hover:scale-110 transition-transform" />
        </Card>

        <Card className="p-8 bg-amber-50 border-amber-100 relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-amber-800 text-xs font-black uppercase tracking-widest mb-1">Top Class</p>
            <h4 className="text-4xl font-black text-amber-950 mb-2">
              {Object.entries(classCounts).sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0]?.[0] || 'N/A'}
            </h4>
            <div className="flex items-center text-amber-600 text-xs font-bold">
              <TrendingUp size={14} className="mr-1" />
              Most active class
            </div>
          </div>
          <Award className="absolute -right-4 -bottom-4 w-24 h-24 text-amber-500/10 group-hover:scale-110 transition-transform" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Class Counts & Selection */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-8 border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-stone-900">Students by Class</h3>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Click to view students</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Object.entries(classCounts).map(([className, count]) => (
                <button 
                  key={className} 
                  onClick={() => handleClassClick(className)}
                  className={`p-6 rounded-3xl border transition-all text-center group ${
                    selectedClass === className 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-[1.02]' 
                      : 'bg-stone-50 border-stone-100 hover:border-blue-200 hover:bg-white'
                  }`}
                >
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                    selectedClass === className ? 'text-blue-100' : 'text-stone-400'
                  }`}>
                    Class
                  </p>
                  <h4 className="text-2xl font-black mb-2">{className}</h4>
                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold ${
                    selectedClass === className ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                  }`}>
                    <Users size={10} /> {count} Students
                  </div>
                  <div className={`mt-3 pt-3 border-t flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest ${
                    selectedClass === className ? 'border-white/20 text-blue-100' : 'border-stone-200 text-stone-400'
                  }`}>
                    View Details
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Selected Class Students */}
          {selectedClass && (
            <Card className="p-8 border-blue-100 bg-blue-50/30 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-2xl font-black text-stone-900">Class {selectedClass} Directory</h3>
                  <p className="text-sm text-stone-500 font-medium">Showing all students in {selectedClass}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search students..." 
                      value={searchTerm}
                      className="pl-10 pr-4 py-2 rounded-xl border border-blue-100 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                    <Search className="absolute left-3 top-2.5 text-stone-400" size={16} />
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedClass(null)} className="text-stone-400 hover:text-stone-900">
                    <XCircle size={24} />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredClassStudents.map(s => (
                  <div key={s.admissionNumber} className="bg-white p-4 rounded-2xl border border-stone-100 flex items-center justify-between group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <img 
                        src={s.photoURL || `https://ui-avatars.com/api/?name=${s.name}&background=random`} 
                        className="w-12 h-12 rounded-xl object-cover"
                        alt=""
                      />
                      <div>
                        <p className="font-bold text-stone-900">{s.name}</p>
                        <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest">{s.admissionNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-blue-600">{s.totalPoints || 0}</p>
                      <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Points</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent Submissions */}
          <Card className="p-8 border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-stone-900 flex items-center gap-3">
                <FileText className="text-blue-600" /> Recent Submissions
              </h3>
            </div>
            <div className="space-y-4">
              {recentSubmissions.length > 0 ? recentSubmissions.map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 hover:bg-white hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 group-hover:text-blue-600 transition-colors">{sub.title}</p>
                      <p className="text-xs text-stone-500">
                        {sub.studentName} • {sub.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      Pending
                    </span>
                    <ChevronRight size={18} className="text-stone-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
                  <p className="text-stone-400 font-bold italic">No pending submissions to review.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Top 3 Ranks */}
          <Card className="p-8 bg-stone-900 text-white overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-xl font-black mb-8 flex items-center gap-2">
                <Award className="text-amber-400" /> Overall Top 3
              </h3>
              <div className="space-y-6">
                {topStudents.map((s, idx) => (
                  <div key={s.admissionNumber} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                      idx === 0 ? 'bg-amber-400 text-stone-900' :
                      idx === 1 ? 'bg-stone-300 text-stone-900' :
                      'bg-orange-400 text-stone-900'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{s.name}</p>
                      <p className="text-[10px] text-stone-400 uppercase tracking-widest">{s.class}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-400">{s.totalPoints || 0}</p>
                      <p className="text-[8px] font-bold text-stone-500 uppercase">pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          </Card>

          {/* About Sections */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-2">Quick Info</h4>
            {[
              { key: 'about_college', label: 'Darul Huda', logoKey: 'college_logo' },
              { key: 'about_safa', label: 'Safa Union', logoKey: 'safa_logo' },
              { key: 'about_skillclub', label: 'Skill Club', logoKey: 'skillclub_logo' }
            ].map(section => {
              const item = content.find(c => c.key === section.key);
              const logo = content.find(c => c.key === section.logoKey);
              return (
                <Card key={section.key} className="p-4 hover:bg-stone-50 transition-colors cursor-pointer group">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <img src={logo?.value || `https://ui-avatars.com/api/?name=${section.label}`} alt="" className="w-8 h-8 object-contain" />
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-bold text-stone-900 truncate">{section.label}</h5>
                      </div>
                      <ChevronRight size={14} className="text-stone-300 group-hover:text-stone-900 transition-colors" />
                    </div>
                    {section.key === 'about_college' && (
                      <div className="flex-1 min-w-0">
                        {/* Photo removed as per request */}
                      </div>
                    )}
                    <p className="text-[10px] text-stone-500 line-clamp-2">{item?.value || 'No content available.'}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
