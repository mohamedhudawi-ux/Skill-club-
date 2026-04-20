import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, orderBy, getDocs, limit, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { Student, SkillClubEntry, SKILL_CLUB_CATEGORIES, Query, Notification, BADGES } from '../types';
import { 
  User, Mail, Phone, MapPin, Calendar, Award, TrendingUp, 
  FileText, Users, CheckCircle, MessageSquare, Bell, 
  BarChart3, PlusCircle, Image as ImageIcon, Search,
  Globe, Facebook, Instagram, MessageCircle, ShieldCheck, Send,
  Trash2, Edit2, Plus, X, BookOpen
} from 'lucide-react';
import { BrandingHeader } from '../components/BrandingHeader';
import { QueryBox } from '../components/QueryBox';
import { StaffDashboard } from '../components/StaffDashboard';
import { SafaDashboard } from '../components/SafaDashboard';
import { AdminDashboard } from '../components/AdminDashboard';
import { CCEMarksStudent } from '../components/CCEMarksStudent';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { safeToDate } from '../utils/date';
import { motion, AnimatePresence } from 'motion/react';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, isAdmin, isStaff, isSafa, isStudent, isAcademic, campusId } = useAuth();
  const { settings, siteContent: content } = useSettings();
  const [student, setStudent] = useState<Student | null>(null);
  const [entries, setEntries] = useState<SkillClubEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessAllowed, setAccessAllowed] = useState(true);
  const [showAnimation, setShowAnimation] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowAnimation(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isStudent && profile?.uid) {
      import('../lib/portalAccess').then(({ checkPortalAccess }) => {
        checkPortalAccess(profile.uid).then(allowed => {
          setAccessAllowed(allowed);
        });
      });
    }
  }, [isStudent, profile?.uid]);

  const queryParams = new URLSearchParams(location.search);
  const tabFromUrl = queryParams.get('tab') as any;
  const [activeTab, setActiveTab] = useState<'overview' | 'scoreboard' | 'rules' | 'queries' | 'notifications' | 'staff-directory' | 'marks'>(tabFromUrl || 'overview');
  const [topStudents, setTopStudents] = useState<Student[]>([]);
  const [topMonthly, setTopMonthly] = useState<{name: string, points: number, admissionNumber: string, photoURL?: string}[]>([]);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  const getBadge = (points: number) => {
    return [...BADGES].reverse().find(b => points >= b.minPoints);
  };

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Scoreboard fetch
  useEffect(() => {
    if (activeTab === 'scoreboard' && isStudent && campusId) {
      const fetchScoreboard = async () => {
        const qTop = query(collection(db, 'students'), where('campusId', '==', campusId), orderBy('totalPoints', 'desc'), limit(10));
        const topSnap = await getDocs(qTop);
        setTopStudents(topSnap.docs.map(doc => doc.data() as Student));

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const qMonthly = query(
          collection(db, 'skillClubEntries'),
          where('campusId', '==', campusId),
          where('timestamp', '>=', startOfMonth),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
        const monthlySnap = await getDocs(qMonthly);
        const monthlyEntries = monthlySnap.docs.map(doc => doc.data() as SkillClubEntry);
        const aggregation: Record<string, {name: string, points: number, photoURL?: string}> = {};
        monthlyEntries.forEach(entry => {
          if (!aggregation[entry.studentAdmissionNumber]) {
            aggregation[entry.studentAdmissionNumber] = { name: 'Unknown Student', points: 0 };
          }
          aggregation[entry.studentAdmissionNumber].points += entry.points;
        });
        const sorted = Object.entries(aggregation)
          .map(([admissionNumber, data]) => ({ admissionNumber, ...data }))
          .sort((a, b) => b.points - a.points)
          .slice(0, 3);
        setTopMonthly(sorted);

        if (student?.class) {
          const qClass = query(collection(db, 'students'), where('campusId', '==', campusId), where('class', '==', student.class), limit(50));
          const classSnap = await getDocs(qClass);
          const students = classSnap.docs.map(d => d.data() as Student);
          students.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
          setClassStudents(students);
        }
      };
      fetchScoreboard();
    }
  }, [activeTab, isStudent, student?.class]);

  // Entries and Programs fetch
  useEffect(() => {
    if (activeTab === 'overview' && isStudent && profile?.admissionNumber && campusId) {
      const fetchOverview = async () => {
        const qEntries = query(
          collection(db, 'skillClubEntries'),
          where('campusId', '==', campusId),
          where('studentAdmissionNumber', '==', profile.admissionNumber),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        const entriesSnap = await getDocs(qEntries);
        setEntries(entriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SkillClubEntry)));

        const qPrograms = query(collection(db, 'programs'), where('campusId', '==', campusId), where('date', '>=', new Date().toISOString().split('T')[0]), orderBy('date', 'asc'), limit(5));
        const programsSnap = await getDocs(qPrograms);
        setPrograms(programsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      };
      fetchOverview();
    }
  }, [activeTab, isStudent, profile?.admissionNumber]);

  // Staff Directory fetch
  useEffect(() => {
    if (activeTab === 'staff-directory' && isStudent && campusId) {
      const fetchStaff = async () => {
        const qStaff = query(collection(db, 'users'), where('campusId', '==', campusId), where('role', 'in', ['staff', 'academic', 'safa']));
        const staffSnap = await getDocs(qStaff);
        setStaffList(staffSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      };
      fetchStaff();
    }
  }, [activeTab, isStudent]);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    // If Admin/Staff/Safa, we don't need the student-specific listeners here
    // as they are handled in their respective dashboard components.
    if (isAdmin || isStaff || isSafa) {
      setLoading(false);
      return;
    }

    // --- STUDENT SPECIFIC DATA FETCHING ---
    const fetchBaseData = async () => {
      if (!isStudent || !profile?.admissionNumber || !campusId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch Student Profile
        const studentDoc = await getDoc(doc(db, 'students', profile.admissionNumber));
        if (studentDoc.exists()) {
          const studentData = studentDoc.data() as Student;
          // Verify campus matches
          if (studentData.campusId === campusId) {
            setStudent(studentData);
          } else {
            console.error('Student campus mismatch');
          }
        }

        // Fetch Notifications
        const qNotify = query(
          collection(db, 'notifications'),
          where('campusId', '==', campusId),
          where('recipientUid', '==', profile.uid),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const notifySnap = await getDocs(qNotify);
        setNotifications(notifySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));

      } catch (error: any) {
        console.error('Error fetching dashboard base data:', error);
        // Log more details to help debugging
        if (error.code === 'permission-denied') {
          console.error('Permission denied details:', {
            uid: profile?.uid,
            admissionNumber: profile?.admissionNumber,
            isStudent
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBaseData();
  }, [profile, isStudent, isAdmin, isStaff, isSafa]);

  if (loading) return (
    <div className="animate-pulse space-y-8">
      <div className="h-40 bg-stone-200 rounded-3xl"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="h-60 bg-stone-200 rounded-3xl"></div>
        <div className="h-60 bg-stone-200 rounded-3xl col-span-2"></div>
      </div>
    </div>
  );

  if (isStudent && !accessAllowed) return <div className="p-8 text-center text-red-600 font-bold text-2xl">You have reached your daily limit of 7 portal visits. Please try again tomorrow.</div>;


  if (isAdmin) return <AdminDashboard />;
  if (isStaff || isAcademic) return <StaffDashboard />;
  if (isSafa) return <SafaDashboard />;

  if (isStudent && !profile?.admissionNumber) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-8 rounded-3xl text-center">
        <h2 className="text-2xl font-bold text-amber-900 mb-2">Profile Not Linked</h2>
        <p className="text-amber-700 mb-4">
          Your account (<strong>{profile?.email}</strong>) is not yet linked to a student record.
        </p>
        <p className="text-amber-700">
          Please contact the staff or admin to add your email address to your student profile in the Admin Panel. Once they add it, try logging out and logging back in.
        </p>
      </div>
    );
  }

  if (isStudent && !student) return <div className="text-center py-20 text-stone-500">Student record not found.</div>;

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {showAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed inset-0 z-[100] bg-stone-900 flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-5xl md:text-7xl font-black text-emerald-400 mb-4"
            >
              Skill Club
            </motion.h1>
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="text-2xl md:text-4xl font-bold text-white"
            >
              Darul Huda Punganur
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>
      <BrandingHeader />

      {/* Student Info Header */}
      {isStudent && student && (
        <Card className="p-6 flex items-center gap-6">
          <img 
            src={student.photoURL || `https://ui-avatars.com/api/?name=${student.name}&background=random`} 
            alt={student.name} 
            className="w-20 h-20 rounded-2xl object-cover shadow-md"
            referrerPolicy="no-referrer"
          />
          <div>
            <h2 className="text-2xl font-black text-stone-900">{student.name}</h2>
            <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">{student.admissionNumber}</p>
          </div>
        </Card>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-stone-900">
            Dashboard
          </h2>
          <p className="text-stone-500 font-medium">Skill Club & Academic Hub.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Button onClick={() => navigate('/admin')} variant="outline" className="flex items-center gap-2 bg-white">
              <ShieldCheck size={16} className="text-stone-900" /> Admin Panel
            </Button>
          )}
          {isStaff && (
            <Button onClick={() => navigate('/staff')} variant="outline" className="flex items-center gap-2 bg-white">
              <Users size={16} className="text-blue-600" /> Staff Panel
            </Button>
          )}
          {isSafa && (
            <Button onClick={() => navigate('/safa')} variant="outline" className="flex items-center gap-2 bg-white">
              <Award size={16} className="text-amber-600" /> Safa Panel
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-stone-200 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3, public: false, enabled: true },
          { id: 'scoreboard', label: 'Scoreboard', icon: Award, public: false, enabled: true },
          { id: 'marks', label: 'CCE Marks', icon: BookOpen, public: false, enabled: isStudent },
          { id: 'rules', label: 'Rules & Badges', icon: ShieldCheck, public: true, enabled: true },
          { id: 'queries', label: 'Queries', icon: MessageSquare, public: false, enabled: true },
          { id: 'notifications', label: 'Notifications', icon: Bell, public: false, enabled: true },
          { id: 'staff-directory', label: 'Staff Directory', icon: Users, public: false, enabled: isStudent }
        ].filter(tab => (tab.public || profile) && tab.enabled).map(tab => (
          <Button 
            key={tab.id}
            variant="ghost"
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap rounded-none ${activeTab === tab.id ? 'border-emerald-600 text-emerald-900' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
          >
            <tab.icon size={16} />
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="mt-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {student && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Badge Progress Card */}
                <Card className="p-6">
                  <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
                    <ShieldCheck className="text-emerald-600" /> Badge Progress
                  </h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-600 text-white rounded-xl">
                          <TrendingUp size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Total Reward Points</p>
                          <p className="text-2xl font-black text-emerald-950">{student.totalPoints || 0}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {BADGES.map((badge, index) => {
                        const earned = (student.badges || []).includes(badge.id);
                        const prevBadgePoints = index === 0 ? 0 : BADGES[index - 1].minPoints;
                        const pointsNeeded = badge.minPoints - prevBadgePoints;
                        const currentPointsInTier = Math.max(0, (student.totalPoints || 0) - prevBadgePoints);
                        const progress = Math.min(100, (currentPointsInTier / pointsNeeded) * 100);
                        
                        return (
                          <div 
                            key={badge.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              earned 
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
                                : 'bg-stone-50 border-stone-100'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <ShieldCheck size={20} className={earned ? 'text-emerald-100' : 'text-stone-300'} />
                                <span className={`text-sm font-bold uppercase tracking-widest ${earned ? 'text-white' : 'text-stone-600'}`}>
                                  {badge.name}
                                </span>
                              </div>
                              {earned && <CheckCircle size={16} className="text-emerald-200" />}
                            </div>
                            {!earned && (
                              <div className="space-y-1.5">
                                <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
                                </div>
                                <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">
                                  {badge.minPoints - (student.totalPoints || 0)} pts to go
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>

                <Card className="lg:col-span-2 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                      <Calendar className="text-emerald-600" /> Calendar
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {programs.length > 0 ? programs.map((program) => {
                      const isNew = program.timestamp && (new Date().getTime() - program.timestamp.toDate().getTime()) < 24 * 60 * 60 * 1000;
                      return (
                      <div key={program.id} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-100">
                        <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg">
                          <Calendar size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-stone-900 flex items-center gap-2">
                              {program.title}
                              {isNew && <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">New</span>}
                            </h4>
                            <span className="text-emerald-700 font-black text-xs">{program.date}</span>
                          </div>
                          <p className="text-sm text-stone-500 mt-1">{program.description}</p>
                          <p className="text-[10px] text-stone-400 mt-2 font-medium uppercase tracking-wider">
                            Category: {program.category}
                          </p>
                        </div>
                      </div>
                    )}) : (
                      <div className="text-center py-12 text-stone-400 italic">
                        No upcoming programs scheduled.
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* About Sections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  {content.find(c => c.key === 'college_logo')?.value && (
                    <img src={content.find(c => c.key === 'college_logo')?.value} alt="Darul Huda Punganur Logo" className="w-16 h-16 object-contain" />
                  )}
                  <h3 className="text-xl font-bold text-stone-900">Darul Huda Punganur</h3>
                </div>
                <p className="text-stone-600 whitespace-pre-wrap leading-relaxed">
                  {content.find(c => c.key === 'about_college')?.value || 'Information about Darul Huda Punganur will appear here.'}
                </p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  {content.find(c => c.key === 'safa_logo')?.value && (
                    <img src={content.find(c => c.key === 'safa_logo')?.value} alt="Safa Union Logo" className="w-16 h-16 object-contain" />
                  )}
                  <h3 className="text-xl font-black text-emerald-700">Safa Union</h3>
                </div>
                <p className="text-stone-600 whitespace-pre-wrap leading-relaxed">
                  {content.find(c => c.key === 'about_safa')?.value || 'Information about Safa Union will appear here.'}
                </p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  {content.find(c => c.key === 'skillclub_logo')?.value && (
                    <motion.img 
                      whileHover={{ scale: 1.2 }}
                      src={content.find(c => c.key === 'skillclub_logo')?.value} 
                      alt="Skill Club Logo" 
                      className="w-16 h-16 object-contain" 
                    />
                  )}
                  <h3 className="text-xl font-bold text-stone-900">Skill Club</h3>
                </div>
                <p className="text-stone-600 whitespace-pre-wrap leading-relaxed">
                  {content.find(c => c.key === 'about_skillclub')?.value || 'Information about Skill Club will appear here.'}
                </p>
              </Card>
            </div>

            {/* Social Media Links */}
            <Card className="p-8 bg-white shadow-xl rounded-[2rem] border-none">
              <h3 className="text-2xl font-black text-stone-900 mb-8 flex items-center gap-3">
                <Globe className="text-emerald-600" /> Contact Us
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                {[
                  { key: 'social_facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                  { key: 'social_instagram', label: 'Instagram', icon: Instagram, color: 'bg-pink-50 text-pink-700 hover:bg-pink-100' },
                  { key: 'social_telegram', label: 'Telegram', icon: Send, color: 'bg-sky-50 text-sky-700 hover:bg-sky-100' },
                  { key: 'social_whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                  { key: 'social_phone', label: 'Call', icon: Phone, color: 'bg-stone-100 text-stone-700 hover:bg-stone-200', prefix: 'tel:' },
                  { key: 'social_gmail', label: 'Gmail', icon: Mail, color: 'bg-red-50 text-red-700 hover:bg-red-100', prefix: 'mailto:' },
                ].map((social) => {
                  const link = content.find(c => c.key === social.key)?.value;
                  
                  const formatLink = (linkContent: string) => {
                    if (!linkContent) return '#';
                    const trimmed = linkContent.trim();
                    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
                      return trimmed;
                    }
                    if (social.key === 'social_whatsapp') {
                      const phone = trimmed.replace(/\D/g, '');
                      return `https://wa.me/${phone}`;
                    }
                    if (social.key === 'social_instagram' && !trimmed.includes('/')) {
                      const handle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
                      return `https://instagram.com/${handle}`;
                    }
                    return `https://${trimmed}`;
                  };

                  const href = link ? (social.prefix ? `${social.prefix}${link.trim()}` : formatLink(link)) : '#';
                  
                  return (
                    <a 
                      key={social.key}
                      href={href}
                      target={link && !social.prefix ? "_blank" : undefined} 
                      rel="noopener noreferrer" 
                      className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] font-black transition-all duration-300 group ${social.color} ${!link ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={(e) => !link && e.preventDefault()}
                    >
                      <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                        <social.icon size={28} className="text-inherit" />
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.2em]">{social.label}</span>
                    </a>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

      {activeTab === 'scoreboard' && (
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Monthly Top 3 */}
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-black text-stone-900 flex items-center justify-center gap-2">
                  <Award className="text-amber-500" /> Top 3 Students of the Month
                </h3>
                <p className="text-stone-500 text-sm mt-1">Performance for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {topMonthly.length > 0 ? topMonthly.map((s, idx) => (
                  <Card key={s.admissionNumber} className={`p-6 text-center relative overflow-hidden ${
                    idx === 0 ? 'border-amber-200 bg-amber-50/30' : 
                    idx === 1 ? 'border-stone-200 bg-stone-50/30' : 
                    'border-orange-200 bg-orange-50/30'
                  }`}>
                    <div className={`absolute top-0 right-0 px-4 py-1 font-black text-xs uppercase tracking-widest ${
                      idx === 0 ? 'bg-amber-500 text-white' : 
                      idx === 1 ? 'bg-stone-400 text-white' : 
                      'bg-orange-500 text-white'
                    }`}>
                      #{idx + 1}
                    </div>
                    <img 
                      src={s.photoURL || `https://ui-avatars.com/api/?name=${s.name}&background=random`} 
                      className="w-20 h-20 rounded-2xl mx-auto mb-4 object-cover border-4 border-white shadow-md"
                      alt={s.name}
                    />
                    <h4 className="font-bold text-stone-900 truncate">{s.name}</h4>
                    <p className="text-[10px] text-stone-400 uppercase font-black tracking-widest mb-3">{s.admissionNumber}</p>
                    <div className="inline-block px-4 py-1 bg-white rounded-full border border-stone-100 shadow-sm">
                      <span className="text-xl font-black text-emerald-600">{s.points}</span>
                      <span className="text-[10px] font-bold text-stone-400 uppercase ml-1">pts</span>
                    </div>
                  </Card>
                )) : (
                  <div className="col-span-3 text-center py-12 text-stone-400 italic bg-stone-50 rounded-3xl border border-dashed border-stone-200">
                    No entries recorded for this month yet.
                  </div>
                )}
              </div>
            </div>

            {/* Class Leaderboard (Students Only) */}
            {isStudent && student?.class && classStudents.length > 0 && (
              <Card className="p-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                  <h3 className="text-2xl font-black text-stone-900 flex items-center gap-2">
                    <Users className="text-emerald-600" /> Class {student.class} Scoreboard
                  </h3>
                </div>
                <div className="space-y-4">
                  {classStudents.map((s, idx) => (
                    <div 
                      key={s.admissionNumber} 
                      className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${
                        s.admissionNumber === student?.admissionNumber 
                          ? 'bg-emerald-50 border-emerald-200 shadow-sm scale-[1.02]' 
                          : 'bg-white border-stone-100 hover:border-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg ${
                          idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                          idx === 1 ? 'bg-stone-100 text-stone-600' :
                          idx === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-stone-50 text-stone-400'
                        }`}>
                          {idx + 1}
                        </div>
                        <img 
                          src={s.photoURL || `https://ui-avatars.com/api/?name=${s.name}&background=random`} 
                          alt={s.name} 
                          className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm"
                        />
                        <div>
                          <p className="font-bold text-stone-900 flex items-center gap-2">
                            {s.name}
                            {s.admissionNumber === student?.admissionNumber && (
                              <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">You</span>
                            )}
                            {getBadge(s.totalPoints || 0) && (
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter flex items-center gap-1 ${
                                getBadge(s.totalPoints || 0)?.club === 'Silver' ? 'bg-stone-100 text-stone-600' :
                                getBadge(s.totalPoints || 0)?.club === 'Gold' ? 'bg-amber-100 text-amber-600' :
                                getBadge(s.totalPoints || 0)?.club === 'Emerald' ? 'bg-emerald-100 text-emerald-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                <Award size={10} />
                                {getBadge(s.totalPoints || 0)?.name}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-stone-500">{s.admissionNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-emerald-600">{s.totalPoints || 0}</p>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Points</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Overall Leaderboard */}
            <Card className="p-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <h3 className="text-2xl font-black text-stone-900 flex items-center gap-2">
                  <TrendingUp className="text-emerald-600" /> Overall Skill Club Toppers
                </h3>
                {topStudents.length > 0 && (
                  <div className="bg-emerald-900 text-white px-6 py-2 rounded-2xl flex items-center gap-3 shadow-lg shadow-emerald-900/20">
                    <Award className="text-amber-400" size={20} />
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-70">Overall Topper</p>
                      <p className="text-sm font-bold">{topStudents[0].name}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {topStudents.map((s, idx) => (
                  <div 
                    key={s.admissionNumber} 
                    className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${
                      s.admissionNumber === student?.admissionNumber 
                        ? 'bg-emerald-50 border-emerald-200 shadow-sm scale-[1.02]' 
                        : 'bg-white border-stone-100 hover:border-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                        idx === 1 ? 'bg-stone-100 text-stone-600' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-stone-50 text-stone-400'
                      }`}>
                        {idx + 1}
                      </div>
                      <img 
                        src={s.photoURL || `https://ui-avatars.com/api/?name=${s.name}&background=random`} 
                        alt={s.name} 
                        className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm"
                      />
                      <div>
                        <p className="font-bold text-stone-900 flex items-center gap-2">
                          {s.name}
                          {s.admissionNumber === student?.admissionNumber && (
                            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">You</span>
                          )}
                          {getBadge(s.totalPoints || 0) && (
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter flex items-center gap-1 ${
                              getBadge(s.totalPoints || 0)?.club === 'Silver' ? 'bg-stone-100 text-stone-600' :
                              getBadge(s.totalPoints || 0)?.club === 'Gold' ? 'bg-amber-100 text-amber-600' :
                              getBadge(s.totalPoints || 0)?.club === 'Emerald' ? 'bg-emerald-100 text-emerald-600' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              <Award size={10} />
                              {getBadge(s.totalPoints || 0)?.name}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-stone-500">Class: {s.class} | {s.admissionNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-emerald-600">{s.totalPoints || 0}</p>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Points</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-8">
            <Card className="p-8">
              <h3 className="text-2xl font-black text-stone-900 mb-6 flex items-center gap-2">
                <ShieldCheck className="text-emerald-600" /> Skill Club Rules & Badges
              </h3>
              
              <div className="space-y-8">
                <div className="bg-stone-50 p-6 rounded-3xl border border-stone-100">
                  <h4 className="text-lg font-bold text-stone-900 mb-4 uppercase tracking-wider text-xs">Badge Progression</h4>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="bg-stone-200 text-stone-600 p-2 rounded-xl mt-1"><Award size={16} /></div>
                      <div>
                        <p className="font-bold text-stone-900">Champion Badge (Silver Club)</p>
                        <p className="text-sm text-stone-600">Achieve 300 reward points. Upon acquiring, your name will be displayed on the Campus Leader Board.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="bg-amber-100 text-amber-600 p-2 rounded-xl mt-1"><Award size={16} /></div>
                      <div>
                        <p className="font-bold text-stone-900">Star Badge (Gold Club)</p>
                        <p className="text-sm text-stone-600">Achieve 500 reward points.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl mt-1"><Award size={16} /></div>
                      <div>
                        <p className="font-bold text-stone-900">Master Badge (Emerald Club)</p>
                        <p className="text-sm text-stone-600">Achieve 700 reward points. Eligible for welfare cell's scholarship scheme and Dinner with Mentor scheme. If there are more than 6 badge earners, a one-day outing will be given.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="bg-blue-100 text-blue-600 p-2 rounded-xl mt-1"><Award size={16} /></div>
                      <div>
                        <p className="font-bold text-stone-900">Legendary Badge (Diamond Club)</p>
                        <p className="text-sm text-stone-600">Achieve 1000 reward points. Eligible for special awards and cash awards given by the Institution.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="bg-purple-100 text-purple-600 p-2 rounded-xl mt-1"><Award size={16} /></div>
                      <div>
                        <p className="font-bold text-stone-900">Topper Badge (Student of The Year)</p>
                        <p className="text-sm text-stone-600">Awarded to the student who collects the most reward points. Eligible for a special award and cash award given by the institution.</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
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
                    {safeToDate(n.timestamp)?.toLocaleDateString()}
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

        {activeTab === 'staff-directory' && (
          <div className="space-y-8">
            <h3 className="text-2xl font-black text-stone-900 flex items-center gap-2">
              <Users className="text-emerald-600" /> Staff Directory
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {staffList.map((staff) => (
                <Card key={staff.id} className="p-6 flex flex-col items-center text-center hover:shadow-xl transition-all duration-300">
                  <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-stone-50 shadow-inner bg-stone-100 flex items-center justify-center">
                    {staff.photoURL ? (
                      <img src={staff.photoURL} alt={staff.displayName || 'Staff'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={32} className="text-stone-300" />
                    )}
                  </div>
                  <h4 className="text-lg font-black text-stone-900 mb-1">{staff.displayName || 'Unnamed Staff'}</h4>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4">
                    {staff.role}
                  </span>
                  
                  <div className="w-full space-y-3 text-left bg-stone-50 p-4 rounded-2xl">
                    {staff.email && !isStudent && (
                      <div className="flex items-center gap-3 text-sm">
                        <Mail size={16} className="text-stone-400 shrink-0" />
                        <span className="text-stone-600 truncate font-medium">{staff.email}</span>
                      </div>
                    )}
                    {staff.phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone size={16} className="text-stone-400 shrink-0" />
                        <span className="text-stone-600 font-medium">{staff.phone}</span>
                      </div>
                    )}
                    {!staff.email && !staff.phone && (
                      <div className="text-center text-stone-400 text-xs italic py-2">
                        No contact info available
                      </div>
                    )}
                  </div>
                </Card>
              ))}
              {staffList.length === 0 && (
                <div className="col-span-full text-center py-20 text-stone-400 italic">
                  No staff members found.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'marks' && student && (
          <div className="max-w-4xl mx-auto">
            <CCEMarksStudent student={student} />
          </div>
        )}
      </div>
    </div>
  );
}
