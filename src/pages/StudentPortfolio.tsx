import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Student, WorkSubmission, BADGES } from '../types';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { User, Award, FileText, Calendar, BookOpen, MapPin, ExternalLink, ArrowLeft } from 'lucide-react';
import { safeToDate } from '../utils/date';
import { useSettings } from '../SettingsContext';

export default function StudentPortfolio() {
  const { admissionNumber } = useParams<{ admissionNumber: string }>();
  const { siteContent } = useSettings();
  const [student, setStudent] = useState<Student | null>(null);
  const [submissions, setSubmissions] = useState<WorkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!admissionNumber) return;
    setLoading(true);
    const unsubscribers: (() => void)[] = [];

    const setupListeners = () => {
      // Student Data
      unsubscribers.push(onSnapshot(doc(db, 'students', admissionNumber), (snap) => {
        if (snap.exists()) {
          setStudent(snap.data() as Student);
          setError(null);
        } else {
          setError('Student not found');
        }
        setLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `students/${admissionNumber}`);
        setLoading(false);
      }));

      // Submissions
      const qSubmissions = query(
        collection(db, 'workSubmissions'),
        where('admissionNumber', '==', admissionNumber),
        where('status', '==', 'approved'),
        orderBy('timestamp', 'desc')
      );
      unsubscribers.push(onSnapshot(qSubmissions, (snap) => {
        setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkSubmission)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'workSubmissions')));
    };

    setupListeners();
    return () => unsubscribers.forEach(unsub => unsub());
  }, [admissionNumber]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100">
          <h2 className="text-2xl font-black mb-2">Oops!</h2>
          <p className="font-bold">{error || 'Student not found'}</p>
        </div>
        <Link to="/" className="inline-flex items-center gap-2 text-stone-600 font-bold hover:text-emerald-600 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>
    );
  }

  const collegeLogo = siteContent.find(c => c.key === 'college_logo')?.value;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {/* College Logo Header */}
      {collegeLogo && (
        <div className="flex justify-center mb-8">
          <img 
            src={collegeLogo} 
            alt="College Logo" 
            className="h-24 md:h-32 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[40px] bg-stone-900 text-white p-8 md:p-16">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-600/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="w-40 h-40 md:w-56 md:h-56 rounded-[40px] overflow-hidden border-8 border-white/10 bg-white/5 shadow-2xl">
            {student.photoURL ? (
              <img src={student.photoURL} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-stone-800">
                <User size={64} className="text-stone-600" />
              </div>
            )}
          </div>
          <div className="text-center md:text-left space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-black uppercase tracking-widest">
              <Award size={14} /> Student Portfolio
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">{student.name}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-stone-400 font-bold text-sm">
              <span className="flex items-center gap-1.5"><BookOpen size={16} /> {student.class}</span>
              <span className="flex items-center gap-1.5"><MapPin size={16} /> {student.address || 'Safa Union'}</span>
              <span className="flex items-center gap-1.5"><Calendar size={16} /> Joined {student.timestamp ? safeToDate(student.timestamp)?.toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Stats & Badges */}
        <div className="lg:col-span-1 space-y-12">
          <section className="space-y-6">
            <h2 className="text-2xl font-black text-stone-900 flex items-center gap-3">
              <Award className="text-emerald-600" /> Achievements
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6 bg-emerald-50 border-emerald-100 text-center">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Points</p>
                <p className="text-4xl font-black text-emerald-900">{student.totalPoints || 0}</p>
              </Card>
              <Card className="p-6 bg-stone-50 border-stone-100 text-center">
                <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">Submissions</p>
                <p className="text-4xl font-black text-stone-900">{submissions.length}</p>
              </Card>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {BADGES.map(b => (
                <Badge 
                  key={b.id} 
                  badge={b} 
                  earned={(student.badges || []).includes(b.id)} 
                  size="md"
                />
              ))}
            </div>
          </section>
        </div>

        {/* Work Showcase */}
        <div className="lg:col-span-2 space-y-12">
          <section className="space-y-6">
            <h2 className="text-2xl font-black text-stone-900 flex items-center gap-3">
              <FileText className="text-emerald-600" /> Work Showcase
            </h2>
            <div className="grid grid-cols-1 gap-6">
              {submissions.map(sub => (
                <Card key={sub.id} className="p-8 hover:shadow-2xl transition-all duration-500 group">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                          {sub.category}
                        </span>
                        <span className="text-stone-400 text-xs font-bold">
                          {safeToDate(sub.timestamp)?.toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-stone-900 group-hover:text-emerald-600 transition-colors">
                        {sub.title}
                      </h3>
                      <p className="text-stone-600 font-medium leading-relaxed">
                        {sub.description}
                      </p>
                    </div>
                    {sub.fileUrl && (
                      <div className="flex flex-col justify-end">
                        <a 
                          href={sub.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-2xl font-black text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-stone-900/10"
                        >
                          View Project <ExternalLink size={16} />
                        </a>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
              {submissions.length === 0 && (
                <div className="text-center py-20 bg-stone-50 rounded-[40px] border-2 border-dashed border-stone-200">
                  <FileText className="mx-auto text-stone-300 mb-4" size={48} />
                  <p className="text-stone-500 font-bold">No approved submissions to showcase yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
