import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, doc, deleteDoc, limit, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { Program, SKILL_CLUB_CATEGORIES, SiteContent, OfficeBearer, Board, BoardMember, Club, Transaction } from '../types';
import { 
  PlusCircle, Calendar, Users, FileText, 
  MapPin, Clock, Award, CheckCircle,
  Info, Target, Moon, UserCircle, Layout, TrendingUp,
  Settings, Camera, LogOut, ChevronRight, Image as ImageIcon,
  Shield, MessageSquare, Bell, Trash2, Wallet, Trophy
} from 'lucide-react';
import { getFullHijriDate } from '../utils/hijri';
import { useNavigate } from 'react-router-dom';
import { Card } from './Card';
import { Button } from './Button';
import { ImageUpload } from './ImageUpload';
import { BrandingHeader } from './BrandingHeader';

export function SafaDashboard() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { siteContent, loading: settingsLoading } = useSettings();
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventData, setEventData] = useState({ title: '', date: '', description: '', category: '' });
  const [recentEvents, setRecentEvents] = useState<Program[]>([]);
  const [officeBearers, setOfficeBearers] = useState<OfficeBearer[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [currentBearerIndex, setCurrentBearerIndex] = useState(0);

  const isSafaAdmin = user?.email === 'safa@skill.edu';                
                                                                      
  useEffect(() => {                                                    
    const unsub = onSnapshot(collection(db, 'treasury'), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });                                                                
    return unsub;                                                      
  }, []);                                                              

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);                
  const balance = totalIncome - totalExpense;                          
                                                                      
  useEffect(() => {
    if (officeBearers.length > 1) {
      const interval = setInterval(() => {
        setCurrentBearerIndex((prev) => (prev + 1) % officeBearers.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [officeBearers.length]);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    const setupListeners = () => {
      // Programs
      unsubscribers.push(onSnapshot(query(collection(db, 'programs'), orderBy('timestamp', 'desc'), limit(10)), (snap) => {
        setRecentEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Program)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'programs')));

      // Office Bearers
      unsubscribers.push(onSnapshot(query(collection(db, 'officeBearers'), limit(50)), (snap) => {
        setOfficeBearers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OfficeBearer)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'officeBearers')));

      // Boards
      unsubscribers.push(onSnapshot(query(collection(db, 'boards'), limit(50)), (snap) => {
        setBoards(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'boards')));

      // Board Members
      unsubscribers.push(onSnapshot(query(collection(db, 'boardMembers'), limit(200)), (snap) => {
        setBoardMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BoardMember)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'boardMembers')));

      // Clubs
      unsubscribers.push(onSnapshot(query(collection(db, 'clubs'), orderBy('totalPoints', 'desc'), limit(10)), (snap) => {
        setClubs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'clubs')));

      // Transactions
      unsubscribers.push(onSnapshot(query(collection(db, 'treasury'), orderBy('date', 'desc'), limit(20)), (snap) => {
        setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'treasury')));
    };

    setupListeners();
    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'programs'), {
        ...eventData,
        addedBy: profile?.uid,
        timestamp: serverTimestamp()
      });
      setEventData({ title: '', date: '', description: '', category: '' });
      setShowEventForm(false);
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteDoc(doc(db, 'programs', id));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const [showContentModal, setShowContentModal] = useState(false);
  const [editingContent, setEditingContent] = useState({ key: '', value: '' });

  const handleUpdateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docId = siteContent.find(c => c.key === editingContent.key)?.id;
      if (docId) {
        await updateDoc(doc(db, 'siteContent', docId), { value: editingContent.value });
      } else {
        await addDoc(collection(db, 'siteContent'), { key: editingContent.key, value: editingContent.value });
      }
      setShowContentModal(false);
    } catch (error) {
      console.error('Error updating content:', error);
    }
  };

  const handleUpdateHijriOffset = async (offset: string) => {
    try {
      const docId = siteContent.find(c => c.key === 'hijri_offset')?.id;
      if (docId) {
        await updateDoc(doc(db, 'siteContent', docId), { value: offset });
      } else {
        await addDoc(collection(db, 'siteContent'), { key: 'hijri_offset', value: offset });
      }
    } catch (error) {
      console.error('Error updating hijri offset:', error);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'treasury'), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });
    return unsub;
  }, []);

  const stats = [
    { label: 'Total Programs', value: recentEvents.length, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Clubs', value: clubs.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Safa Balance', value: `₹${balance.toLocaleString()}`, icon: Wallet, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Office Bearers', value: officeBearers.length, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const collegeLogo = siteContent.find(c => c.key === 'college_logo')?.value;

  return (
    <div className="space-y-10 pb-20">
      <BrandingHeader />

      {/* Editorial Hero Section */}
      <section className="relative h-[450px] rounded-[48px] overflow-hidden bg-stone-900 text-white flex flex-col justify-end p-10 md:p-20">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2000" 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/60 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-5xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-emerald-500 text-white px-5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.25em] shadow-lg shadow-emerald-500/20">
              Safa Executive Portal
            </div>
            <div className="h-px w-12 bg-white/20" />
            <span className="text-white text-xs font-bold tracking-widest uppercase">{getFullHijriDate(parseInt(siteContent.find(c => c.key === 'hijri_offset')?.value || '0'))}</span>
          </div>
          
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.8] mb-10 uppercase text-emerald-500">
            Safa <br /> Union
          </h1>
          
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-5 bg-white/5 backdrop-blur-xl p-2.5 pr-8 rounded-full border border-white/10 hover:bg-white/10 transition-all cursor-pointer group" onClick={() => navigate('/profile')}>
              <div className="relative">
                <img 
                  src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'Safa'}&background=random`} 
                  className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/50 group-hover:border-emerald-500 transition-all"
                  alt="Profile"
                />
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-1.5 rounded-full border-2 border-stone-900">
                  <Camera size={12} className="text-white" />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-0.5">Executive Access</p>
                <p className="text-lg font-bold tracking-tight">{profile?.displayName || 'Safa Executive'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Office Bearers Slider */}
      {officeBearers.length > 0 && (
        <section className="relative h-[300px] rounded-[40px] overflow-hidden bg-stone-100 border border-stone-200 shadow-sm">
          <div className="absolute inset-0 flex transition-transform duration-1000 ease-in-out" style={{ transform: `translateX(-${currentBearerIndex * 100}%)` }}>
            {officeBearers.map((bearer) => (
              <div key={bearer.id} className="min-w-full h-full flex items-center p-8 md:p-12 gap-8">
                <div className="w-1/3 h-full">
                  <img 
                    src={bearer.photoUrl || `https://ui-avatars.com/api/?name=${bearer.name}&background=random&size=300`} 
                    alt={bearer.name} 
                    className="w-full h-full object-cover rounded-[32px] shadow-xl border-4 border-white"
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px w-8 bg-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Safa Leadership</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-stone-900 tracking-tighter uppercase leading-none">
                    {bearer.name}
                  </h2>
                  <p className="text-lg font-bold text-stone-500 uppercase tracking-widest">{bearer.position}</p>
                  <div className="pt-4 flex gap-2">
                    {officeBearers.map((_, i) => (
                      <button 
                        key={i} 
                        onClick={() => setCurrentBearerIndex(i)}
                        className={`h-1.5 rounded-full transition-all ${i === currentBearerIndex ? 'w-8 bg-emerald-500' : 'w-2 bg-stone-300'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-6 right-8">
            <Award size={48} className="text-stone-200" />
          </div>
        </section>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-8 rounded-[32px] border border-stone-100 shadow-sm hover:shadow-md transition-all">
            <div className={`${stat.bg} ${stat.color} w-12 h-12 rounded-2xl flex items-center justify-center mb-6`}>
              <stat.icon size={24} />
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mb-1">{stat.label}</p>
            <p className="text-4xl font-black text-stone-900 tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Management Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-stone-900 text-white p-10 rounded-[40px] shadow-2xl shadow-stone-900/20">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500 mb-8">Management Hub</h3>
            <div className="space-y-3">
              {[
                { label: 'Safa Panel', desc: 'Core administration', icon: Users, path: '/safa', color: 'text-emerald-400' },
                { label: 'Treasurer Panel', desc: 'Finance & Reports', icon: Wallet, path: '/safa?tab=treasurer', color: 'text-emerald-400' },
                { label: 'Event Calendar', desc: 'Schedule & timeline', icon: Calendar, path: '/calendar', color: 'text-blue-400' },
                { label: 'Gallery Admin', desc: 'Media management', icon: ImageIcon, path: '/gallery', color: 'text-purple-400' },
                { label: 'Scoreboard', desc: 'Points & rankings', icon: TrendingUp, path: '/scoreboard', color: 'text-amber-400' },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center justify-between p-5 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group text-left"
                >
                  <div className="flex items-center gap-5">
                    <div className={`${action.color} p-3 rounded-2xl bg-white/5`}>
                      <action.icon size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-base">{action.label}</p>
                      <p className="text-xs text-stone-400 font-medium">{action.desc}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-stone-600 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
            
            <div className="mt-10 pt-10 border-t border-white/10">
              <Button 
                onClick={() => setShowEventForm(true)}
                className="w-full py-7 rounded-3xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/20"
              >
                <PlusCircle size={20} className="mr-3" /> Create New Event
              </Button>
            </div>
          </div>

          {/* Site Settings Card */}
          <div className="bg-white p-10 rounded-[40px] border border-stone-100 shadow-sm">
            <div className="bg-stone-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-8">
              <Layout size={28} className="text-stone-900" />
            </div>
            <h3 className="text-2xl font-black text-stone-900 mb-6 uppercase tracking-tight">Site Settings</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">Hijri Date Offset</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    value={siteContent.find(c => c.key === 'hijri_offset')?.value || '0'}
                    onChange={(e) => handleUpdateHijriOffset(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                  <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl">
                    <Clock size={20} />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 space-y-3">
                <button 
                  onClick={() => {
                    setEditingContent({ key: 'about_safa', value: siteContent.find(c => c.key === 'about_safa')?.value || '' });
                    setShowContentModal(true);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-stone-50 border border-stone-100 hover:bg-stone-100 transition-all text-left"
                >
                  <span className="text-sm font-bold text-stone-900">Edit Mission Statement</span>
                  <FileText size={16} className="text-stone-400" />
                </button>
                <button 
                  onClick={() => navigate('/safa')}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-stone-50 border border-stone-100 hover:bg-stone-100 transition-all text-left"
                >
                  <span className="text-sm font-bold text-stone-900">Manage Office Bearers</span>
                  <Users size={16} className="text-stone-400" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-10">
          {/* Recent Activity Section */}
          <div className="bg-white p-12 rounded-[48px] border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl font-black text-stone-900 uppercase tracking-tighter">Recent Programs</h2>
                <p className="text-stone-500 font-medium">Latest activities organized by Safa Union</p>
              </div>
              <Button variant="ghost" onClick={() => navigate('/safa')} className="text-emerald-600 font-black uppercase tracking-widest text-[10px] hover:bg-emerald-50 px-6 py-3 rounded-2xl">
                Manage All <ChevronRight size={16} className="ml-2" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {recentEvents.slice(0, 4).map((event) => (
                <div key={event.id} className="group p-8 rounded-[32px] border border-stone-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all bg-stone-50/30 relative">
                  <button 
                    onClick={() => handleDeleteEvent(event.id!)}
                    className="absolute top-4 right-4 p-2 text-stone-400 opacity-0 group-hover:opacity-100 hover:text-stone-900 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-white text-stone-400 p-4 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                      <Calendar size={28} />
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-1">{event.date}</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
                        {event.category || 'General'}
                      </span>
                    </div>
                  </div>
                  <h4 className="text-xl font-black text-stone-900 mb-3 tracking-tight group-hover:text-emerald-900 transition-colors">{event.title}</h4>
                  <p className="text-sm text-stone-500 leading-relaxed line-clamp-2 mb-8">{event.description}</p>
                  <div className="flex items-center gap-3 pt-6 border-t border-stone-100">
                    <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-500">
                      <Users size={14} />
                    </div>
                    <span className="text-xs font-bold text-stone-400">Public Event</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mission & Vision Card */}
          <div className="bg-emerald-900 text-white p-12 rounded-[48px] shadow-2xl shadow-emerald-900/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 transition-transform group-hover:scale-110 duration-700" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full -ml-32 -mb-32 blur-3xl" />
            
            <div className="relative z-10">
              <div className="bg-white/10 w-16 h-16 rounded-3xl flex items-center justify-center mb-8 backdrop-blur-md border border-white/10">
                <Target size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-4xl font-black mb-6 uppercase tracking-tighter">Mission & Vision</h3>
              <p className="text-emerald-100/80 text-lg leading-relaxed mb-10 max-w-2xl font-medium italic">
                "{siteContent.find(c => c.key === 'about_safa')?.value || 'Safa Union is dedicated to nurturing diverse talents and skills of students at Darul Huda Punganur.'}"
              </p>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setEditingContent({ key: 'about_safa', value: siteContent.find(c => c.key === 'about_safa')?.value || '' });
                  setShowContentModal(true);
                }}
                className="text-white border-white/20 hover:bg-white/10 rounded-2xl px-8 py-4 font-black uppercase tracking-widest text-[10px]"
              >
                Edit Mission Statement
              </Button>
            </div>
          </div>

          {/* Badge System Card */}
          <div className="bg-white p-12 rounded-[48px] border border-stone-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full -mr-32 -mt-32" />
            <div className="relative z-10">
              <div className="bg-amber-50 w-16 h-16 rounded-3xl flex items-center justify-center mb-8">
                <Award size={32} className="text-amber-600" />
              </div>
              <h3 className="text-3xl font-black text-stone-900 mb-8 uppercase tracking-tighter">Badge System</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { name: 'Emerald Club', points: '700+', color: 'bg-emerald-100 text-emerald-700', icon: '🟢' },
                  { name: 'Diamond Club', points: '1000+', color: 'bg-blue-100 text-blue-700', icon: '💎' },
                  { name: 'Platinum Club', points: '1500+', color: 'bg-purple-100 text-purple-700', icon: '✨' },
                ].map(badge => (
                  <div key={badge.name} className="p-6 rounded-3xl bg-stone-50 border border-stone-100 flex flex-col items-center text-center">
                    <span className="text-3xl mb-4">{badge.icon}</span>
                    <span className="text-sm font-bold text-stone-900 mb-2">{badge.name}</span>
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl ${badge.color}`}>{badge.points} PTS</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* About Darul Huda Punganur Section */}
          <div className="bg-white p-12 rounded-[48px] border border-stone-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-emerald-50 w-16 h-16 rounded-3xl flex items-center justify-center">
                  <Layout size={32} className="text-emerald-600" />
                </div>
                <h3 className="text-3xl font-black text-stone-900 uppercase tracking-tighter">Darul Huda Punganur</h3>
              </div>
              <div className="grid grid-cols-1 gap-10 items-center">
                <div>
                  <p className="text-stone-600 text-lg leading-relaxed mb-8">
                    {siteContent.find(c => c.key === 'about_college')?.value || siteContent.find(c => c.key === 'about_dhpc')?.value || 'Information about Darul Huda Punganur will appear here.'}
                  </p>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      const key = siteContent.find(c => c.key === 'about_college') ? 'about_college' : 'about_dhpc';
                      setEditingContent({ key, value: siteContent.find(c => c.key === key)?.value || '' });
                      setShowContentModal(true);
                    }}
                    className="bg-stone-100 text-stone-900 rounded-2xl px-8 py-4 font-black uppercase tracking-widest text-[10px] hover:bg-stone-200"
                  >
                    Edit About Content
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Club Leaderboard Section */}
          <div className="bg-stone-900 text-white p-12 rounded-[48px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-10 right-10 transform rotate-12">
                <Trophy size={300} />
              </div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-emerald-500">Club Leaderboard</h3>
                  <p className="text-stone-400 font-medium">Top performing skill clubs of Safa Union</p>
                </div>
                <Trophy className="text-emerald-500" size={48} />
              </div>

              <div className="space-y-4">
                {clubs.slice(0, 5).map((club, index) => (
                  <div key={club.id} className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${
                        index === 0 ? 'bg-emerald-500 text-stone-950' : 
                        index === 1 ? 'bg-stone-200 text-stone-950' : 
                        index === 2 ? 'bg-amber-600 text-white' : 'bg-white/10 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-4">
                        {club.logoUrl && (
                          <img src={club.logoUrl} alt={club.name} className="w-10 h-10 rounded-xl object-cover" />
                        )}
                        <div>
                          <p className="font-bold text-lg">{club.name}</p>
                          <p className="text-xs text-stone-400 uppercase tracking-widest font-black">Skill Club</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-emerald-500">{club.totalPoints || 0}</p>
                      <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Points</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Editor Modal */}
      {showContentModal && (
        <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl flex items-center justify-center p-4 z-[110]">
          <div className="bg-white w-full max-w-2xl rounded-[48px] p-12 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-3xl font-black text-stone-900 uppercase tracking-tighter">Edit Content</h3>
                <p className="text-stone-500 font-medium">Update the public mission statement</p>
              </div>
              <button onClick={() => setShowContentModal(false)} className="bg-stone-100 p-3 rounded-2xl text-stone-400 hover:text-stone-900 transition-all">
                <PlusCircle size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateContent} className="space-y-8">
              <div>
                <label className="block text-[11px] font-black text-stone-400 uppercase tracking-[0.2em] mb-4">Statement Content</label>
                <textarea 
                  value={editingContent.value}
                  onChange={(e) => setEditingContent({ ...editingContent, value: e.target.value })}
                  className="w-full p-8 rounded-3xl border border-stone-200 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 min-h-[200px] resize-none text-lg font-medium leading-relaxed"
                  placeholder="Enter the mission statement..."
                  required
                />
              </div>

              <div className="flex gap-4">
                <Button 
                  type="button"
                  variant="ghost"
                  onClick={() => setShowContentModal(false)}
                  className="flex-1 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] text-stone-400 hover:bg-stone-50"
                >
                  Discard Changes
                </Button>
                <Button 
                  type="submit"
                  className="flex-1 bg-emerald-500 text-stone-950 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-400 shadow-xl shadow-emerald-500/20"
                >
                  Update Statement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl flex items-center justify-center p-4 z-[110]">
          <div className="bg-white w-full max-w-2xl rounded-[48px] p-12 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-3xl font-black text-stone-900 uppercase tracking-tighter">Create New Event</h3>
                <p className="text-stone-500 font-medium">Publish a new program to the portal</p>
              </div>
              <button onClick={() => setShowEventForm(false)} className="bg-stone-100 p-3 rounded-2xl text-stone-400 hover:text-stone-900 transition-all">
                <PlusCircle size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="space-y-8">
              <div>
                <label className="block text-[11px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3">Event Title</label>
                <input 
                  type="text" 
                  value={eventData.title}
                  onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                  placeholder="e.g. Annual Debate Competition"
                  className="w-full p-5 rounded-3xl border border-stone-200 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-stone-900"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3">Date</label>
                  <input 
                    type="date" 
                    value={eventData.date}
                    onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                    className="w-full p-5 rounded-3xl border border-stone-200 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-stone-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3">Category</label>
                  <select 
                    value={eventData.category}
                    onChange={(e) => setEventData({ ...eventData, category: e.target.value })}
                    className="w-full p-5 rounded-3xl border border-stone-200 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-stone-900"
                    required
                  >
                    <option value="">Select...</option>
                    {SKILL_CLUB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3">Description</label>
                <textarea 
                  value={eventData.description}
                  onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                  placeholder="Tell us more about the event..."
                  className="w-full p-6 rounded-3xl border border-stone-200 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 min-h-[150px] resize-none font-medium text-stone-700"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <Button 
                  type="button"
                  variant="ghost"
                  onClick={() => setShowEventForm(false)}
                  className="flex-1 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] text-stone-400 hover:bg-stone-50"
                >
                  Discard
                </Button>
                <Button 
                  type="submit"
                  className="flex-1 bg-emerald-500 text-stone-950 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-400 shadow-xl shadow-emerald-500/20"
                >
                  Publish Event
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

