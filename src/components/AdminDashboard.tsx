import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, onSnapshot, orderBy, limit, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, where, getDoc, getCountFromServer } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Student, SkillClubEntry, Query, UserProfile, SKILL_CLUB_CATEGORIES, WorkSubmission, GraceMarkApplication, BADGES, SiteContent } from '../types';
import { 
  Users, Award, TrendingUp, MessageSquare, 
  CheckCircle, XCircle, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, Search, Shield,
  Facebook, Instagram, MessageCircle, Globe, Mail, Send, Phone,
  FileText, Download, Check, X, ExternalLink,
  Settings, AlertCircle, ClipboardList, ChevronRight, Info, PlusCircle
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { Card } from './Card';
import { Button } from './Button';
import { getCachedData, setCachedData } from '../lib/cache';

import { AdminSubmissions } from './AdminSubmissions';
import { AdminGraceMarks } from './AdminGraceMarks';
import { BrandingHeader } from './BrandingHeader';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { profile, loading: authLoading, campusId, currentCampus } = useAuth();
  const { siteContent, loading: settingsLoading } = useSettings();
  const studentUnionName = currentCampus?.studentUnionName || "SAFA Union";
  const skillClubName = currentCampus?.skillClubName || "Skill Club";
  
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalActivities: 0,
    pendingQueries: 0,
    pendingSubmissions: 0,
    pendingGraceMarks: 0,
    totalClubs: 0,
    topStudents: [] as Student[],
    classCounts: {} as Record<string, number>
  });
  const [queries, setQueries] = useState<Query[]>([]);
  const [submissions, setSubmissions] = useState<WorkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContentModal, setShowContentModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', content: '' });
  const [error, setError] = useState<string | null>(null);

  const openContentModal = (title: string, key: string) => {
    const content = siteContent.find(c => c.key === key)?.value || 'No content available.';
    setModalContent({ title, content });
    setShowContentModal(true);
  };

  useEffect(() => {
    if (authLoading || settingsLoading) return;
    
    const fetchData = async () => {
      if (!campusId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      const collections = [
        { name: 'students', key: 'totalStudents', setter: (snap: any) => setStats(prev => ({ ...prev, totalStudents: snap.size })) },
        { name: 'skillClubEntries', key: 'totalActivities', setter: (snap: any) => setStats(prev => ({ ...prev, totalActivities: snap.size })) },
        { name: 'clubs', key: 'totalClubs', setter: (snap: any) => setStats(prev => ({ ...prev, totalClubs: snap.size })) },
      ];

      for (const col of collections) {
        try {
          const snap = await getDocs(query(collection(db, col.name), where('campusId', '==', campusId)));
          const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          col.setter({ size: data.length });
        } catch (err: any) {
          handleFirestoreError(err, OperationType.LIST, col.name);
        }
      }

      // Fetch pending counts and recent data
      try {
        const [queriesSnap, submissionsSnap, graceMarksSnap] = await Promise.all([
          getDocs(query(collection(db, 'queries'), where('campusId', '==', campusId), where('status', '==', 'pending'))),
          getDocs(query(collection(db, 'workSubmissions'), where('campusId', '==', campusId), where('status', '==', 'pending'))),
          getDocs(query(collection(db, 'graceMarkApplications'), where('campusId', '==', campusId), where('status', '==', 'pending')))
        ]);

        setStats(prev => ({
          ...prev,
          pendingQueries: queriesSnap.size,
          pendingSubmissions: submissionsSnap.size,
          pendingGraceMarks: graceMarksSnap.size
        }));

        setQueries(queriesSnap.docs.slice(0, 5).map(doc => ({ id: doc.id, ...doc.data() } as Query)));
        setSubmissions(submissionsSnap.docs.slice(0, 5).map(doc => ({ id: doc.id, ...doc.data() } as WorkSubmission)));

        // Fetch top students
        const topSnap = await getDocs(query(collection(db, 'students'), where('campusId', '==', campusId), orderBy('totalPoints', 'desc'), limit(5)));
        setStats(prev => ({ ...prev, topStudents: topSnap.docs.map(doc => doc.data() as Student) }));

      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, 'dashboard-data');
      }

      setLoading(false);
    };

    fetchData();
  }, [authLoading, settingsLoading, campusId]);

  const handleReply = async (queryId: string, reply: string) => {
    if (!reply.trim()) return;
    try {
      await updateDoc(doc(db, 'queries', queryId), {
        reply,
        status: 'replied'
      });
    } catch (error) {
      console.error('Error replying to query:', error);
    }
  };

  const quickActions = [
    { label: 'Add Student', icon: Users, color: 'bg-emerald-500', tab: 'students' },
    { label: 'Add Staff', icon: Shield, color: 'bg-blue-500', tab: 'staff' },
    { label: 'Manage Clubs', icon: Globe, color: 'bg-purple-500', tab: 'clubs' },
    { label: 'Grace Marks', icon: Award, color: 'bg-amber-500', tab: 'gracemarks' },
    { label: 'Work Submissions', icon: FileText, color: 'bg-rose-500', tab: 'submissions' }
  ];

  const collegeLogo = siteContent.find(c => c.key === 'college_logo')?.value;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-stone-500 font-bold animate-pulse">Loading {studentUnionName} Dashboard...</p>
    </div>
  );

  return (
    <div className="space-y-10">
      <BrandingHeader />

      {/* Welcome Header */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-700 animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertCircle size={20} />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}
      <div className="relative overflow-hidden bg-stone-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">
              Welcome back, <span className="text-emerald-400">{profile?.displayName || 'Admin'}</span>!
            </h2>
            <p className="text-stone-400 text-lg">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
      </div>

      {/* Information Grid */}
      <div className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 ml-2">About Sections</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { key: 'about_dhpc', label: 'About Darul Huda Punganur', logoKey: 'college_logo' },
            { key: 'about_safa', label: `About ${studentUnionName}`, logoKey: 'safa_logo' },
            { key: 'about_skillclub', label: `About ${skillClubName}`, logoKey: 'skillclub_logo' }
          ].map(section => {
            const item = siteContent.find(c => c.key === section.key);
            const logo = siteContent.find(c => c.key === section.logoKey);
            return (
              <Card 
              key={section.key} 
              className="p-6 space-y-4 hover:bg-stone-50 transition-colors cursor-pointer" 
              onClick={() => openContentModal(section.label, section.key)}
            >
              <div className="flex items-center gap-3">
                <img src={logo?.value || 'https://ui-avatars.com/api/?name=' + section.label} alt={section.label} className="w-10 h-10 object-contain" />
                <h4 className="font-bold text-stone-900">{section.label}</h4>
              </div>

              <p className="text-sm text-stone-600 line-clamp-3">{item?.value || 'No content available.'}</p>
            </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 ml-2">Social Media & Contact</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { key: 'social_whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-400', baseUrl: 'https://wa.me/' },
            { key: 'social_facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-400', baseUrl: 'https://facebook.com/' },
            { key: 'social_instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-400', baseUrl: 'https://instagram.com/' },
            { key: 'social_gmail', label: 'Gmail', icon: Mail, color: 'text-red-400', baseUrl: 'mailto:' },
            { key: 'social_telegram', label: 'Telegram', icon: Send, color: 'text-sky-400', baseUrl: 'https://t.me/' },
            { key: 'social_phone', label: 'Contact', icon: Phone, color: 'text-amber-400', baseUrl: 'tel:' }
          ].map(item => {
            const contentItem = siteContent.find(c => c.key === item.key);
            let href = '#';
            if (contentItem && contentItem.value) {
              const value = contentItem.value.trim();
              if (value.startsWith('http') || value.startsWith('mailto:') || value.startsWith('tel:')) {
                href = value;
              } else {
                href = `${item.baseUrl}${value}`;
              }
            }
            return (
              <a key={item.key} href={href} target="_blank" rel="noopener noreferrer" className="block">
                <Card className="p-6 flex items-center justify-center bg-stone-900 border-stone-800 hover:bg-stone-800 transition-colors">
                  <div className={`${item.color}`}>
                    <item.icon size={32} />
                  </div>
                </Card>
              </a>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Stats & Tasks */}
        <div className="lg:col-span-8 space-y-10">
          {/* Stats Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-8 bg-emerald-50 border-emerald-100 relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-emerald-800 text-xs font-black uppercase tracking-widest mb-1">Total Students</p>
                <h4 className="text-4xl font-black text-emerald-950 mb-4">{stats.totalStudents}</h4>
                <div className="flex items-center text-emerald-600 text-xs font-bold">
                  <TrendingUp size={14} className="mr-1" />
                  Active profiles
                </div>
              </div>
              <Users className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-500/10 group-hover:scale-110 transition-transform" />
            </Card>

            <Card className="p-8 bg-blue-50 border-blue-100 relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-blue-800 text-xs font-black uppercase tracking-widest mb-1">Total Clubs</p>
                <h4 className="text-4xl font-black text-blue-950 mb-4">{stats.totalClubs}</h4>
                <div className="flex items-center text-blue-600 text-xs font-bold">
                  <Globe size={14} className="mr-1" />
                  Active organizations
                </div>
              </div>
              <Globe className="absolute -right-4 -bottom-4 w-24 h-24 text-blue-500/10 group-hover:scale-110 transition-transform" />
            </Card>

            <Card className="p-8 bg-amber-50 border-amber-100 relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-amber-800 text-xs font-black uppercase tracking-widest mb-1">Pending Tasks</p>
                <h4 className="text-4xl font-black text-amber-950 mb-4">{stats.pendingQueries + stats.pendingSubmissions + stats.pendingGraceMarks}</h4>
                <div className="flex items-center text-amber-600 text-xs font-bold">
                  <AlertCircle size={14} className="mr-1" />
                  Needs attention
                </div>
              </div>
              <ClipboardList className="absolute -right-4 -bottom-4 w-24 h-24 text-amber-500/10 group-hover:scale-110 transition-transform" />
            </Card>
          </div>

          {/* Class Counts */}
          {Object.keys(stats.classCounts).length > 0 && (
            <Card className="p-8 border-stone-100 shadow-sm">
              <h3 className="text-2xl font-black text-stone-900 mb-8">Students by Class</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Object.entries(stats.classCounts).map(([className, count]) => (
                  <div key={className} className="p-4 bg-stone-50 rounded-2xl border border-stone-100 text-center">
                    <p className="text-xs font-bold text-stone-500 uppercase">{className}</p>
                    <h4 className="text-2xl font-black text-stone-900">{count}</h4>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Pending Submissions Preview */}
          <Card className="p-8 border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-stone-900 flex items-center gap-3">
                <FileText className="text-emerald-600" />
                Recent Work Submissions
              </h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => (window as any).setActiveTab?.('submissions')}
                className="text-emerald-600 font-bold"
              >
                View All <ArrowUpRight size={16} className="ml-1" />
              </Button>
            </div>
            <div className="space-y-4">
              {submissions.length === 0 ? (
                <div className="text-center py-12 bg-stone-50 rounded-[2rem] border border-dashed border-stone-200">
                  <p className="text-stone-400 font-bold">No pending submissions</p>
                </div>
              ) : (
                submissions.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                        {sub.studentName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">{sub.title}</p>
                        <p className="text-xs text-stone-500">by {sub.studentName} • {sub.category}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => (window as any).setActiveTab?.('submissions')}
                    >
                      Review
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Recent Queries */}
          <Card className="p-8 border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-stone-900 flex items-center gap-3">
                <MessageSquare className="text-blue-600" />
                Recent Student Queries
              </h3>
            </div>
            <div className="space-y-6">
              {queries.length === 0 ? (
                <div className="text-center py-12 text-stone-400 italic">No recent queries.</div>
              ) : (
                queries.map(q => (
                  <div key={q.id} className="p-6 bg-stone-50 rounded-3xl border border-stone-100 space-y-4 hover:bg-white hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                          {q.studentName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900">{q.studentName}</p>
                          <p className="text-[10px] text-stone-400 font-mono uppercase tracking-widest">{new Date(q.timestamp?.seconds * 1000).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        q.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {q.status}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600 italic leading-relaxed">"{q.message}"</p>
                    {q.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <input 
                          id={`reply-${q.id}`}
                          className="flex-1 px-6 py-3 rounded-2xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                          placeholder="Type your response..."
                        />
                        <Button 
                          onClick={() => {
                            const input = document.getElementById(`reply-${q.id}`) as HTMLInputElement;
                            handleReply(q.id!, input.value);
                          }}
                          className="px-8"
                        >
                          Reply
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Leaderboard & Quick Stats */}
        <div className="lg:col-span-4 space-y-10">
          {/* Top Students Leaderboard */}
          <Card className="p-8 border-stone-100 shadow-sm bg-stone-900 text-white overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                <TrendingUp className="text-emerald-400" />
                Top Performers
              </h3>
              <div className="space-y-4">
                {stats.topStudents.map((student, idx) => (
                  <div key={student.admissionNumber} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        idx === 0 ? 'bg-yellow-400 text-stone-900' :
                        idx === 1 ? 'bg-stone-300 text-stone-900' :
                        idx === 2 ? 'bg-orange-400 text-stone-900' :
                        'bg-white/20 text-white'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold">{student.name}</p>
                        <p className="text-[10px] text-stone-400 uppercase tracking-widest">{student.class}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-400 text-lg">{student.totalPoints || 0}</p>
                      <p className="text-[10px] font-bold text-stone-500 uppercase">Points</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button 
                variant="ghost" 
                className="w-full mt-6 text-stone-400 hover:text-white hover:bg-white/5"
                onClick={() => navigate('/scoreboard')}
              >
                Full Scoreboard <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
          </Card>

          {/* System Health / Quick Info */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 ml-2">System Status</h3>
            <div className="space-y-4">
              <div className="p-6 bg-white rounded-3xl border border-stone-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900">Security Rules</p>
                    <p className="text-[10px] text-stone-500 uppercase font-black">Active & Secure</p>
                  </div>
                </div>
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>

              <div className="p-6 bg-white rounded-3xl border border-stone-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900">Database Sync</p>
                    <p className="text-[10px] text-stone-500 uppercase font-black">Real-time enabled</p>
                  </div>
                </div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Content Viewing Modal */}
      {showContentModal && (
        <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl flex items-center justify-center p-4 z-[110]">
          <div className="bg-white w-full max-w-2xl rounded-[48px] p-12 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-3xl font-black text-stone-900 uppercase tracking-tighter">{modalContent.title}</h3>
              <button onClick={() => setShowContentModal(false)} className="bg-stone-100 p-3 rounded-2xl text-stone-400 hover:text-stone-900 transition-all">
                <PlusCircle size={24} className="rotate-45" />
              </button>
            </div>
            <div className="prose prose-stone max-w-none text-lg text-stone-600 leading-relaxed">
              {modalContent.title === 'Social Medias' ? (
                <div className="flex flex-wrap gap-6 justify-center">
                  <a href={siteContent.find(c => c.key === 'social_whatsapp')?.value || '#'} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-emerald-600 hover:text-emerald-700">
                    <MessageCircle size={48} />
                    <span className="text-sm font-bold">WhatsApp</span>
                  </a>
                  <a href={siteContent.find(c => c.key === 'social_facebook')?.value || '#'} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-blue-600 hover:text-blue-700">
                    <Facebook size={48} />
                    <span className="text-sm font-bold">Facebook</span>
                  </a>
                  <a href={siteContent.find(c => c.key === 'social_instagram')?.value || '#'} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-pink-600 hover:text-pink-700">
                    <Instagram size={48} />
                    <span className="text-sm font-bold">Instagram</span>
                  </a>
                  <a href={`mailto:${siteContent.find(c => c.key === 'social_gmail')?.value || ''}`} className="flex flex-col items-center gap-2 text-red-600 hover:text-red-700">
                    <Mail size={48} />
                    <span className="text-sm font-bold">Gmail</span>
                  </a>
                  <a href={siteContent.find(c => c.key === 'social_telegram')?.value || '#'} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-sky-600 hover:text-sky-700">
                    <Send size={48} />
                    <span className="text-sm font-bold">Telegram</span>
                  </a>
                </div>
              ) : modalContent.title === 'Contact' ? (
                <div className="flex flex-col items-center gap-4">
                  <Phone size={64} className="text-emerald-600" />
                  <p className="text-3xl font-black text-stone-900">{siteContent.find(c => c.key === 'social_phone')?.value || 'Not set'}</p>
                </div>
              ) : (
                modalContent.content
              )}
            </div>
            <div className="mt-10">
              <Button 
                onClick={() => setShowContentModal(false)}
                className="w-full bg-stone-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-stone-800"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
