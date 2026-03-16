import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, onSnapshot, orderBy, limit, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Student, SkillClubEntry, Query, UserProfile, SKILL_CLUB_CATEGORIES } from '../types';
import { 
  Users, Award, TrendingUp, MessageSquare, 
  CheckCircle, XCircle, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, Search
} from 'lucide-react';

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalActivities: 0,
    pendingQueries: 0,
    topStudents: [] as Student[]
  });
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const studentsSnap = await getDocs(collection(db, 'students'));
        const activitiesSnap = await getDocs(collection(db, 'skillClubEntries'));
        const queriesSnap = await getDocs(collection(db, 'queries'));

        const top = studentsSnap.docs
          .map(doc => doc.data() as Student)
          .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
          .slice(0, 5);

        setStats({
          totalStudents: studentsSnap.size,
          totalActivities: activitiesSnap.size,
          pendingQueries: queriesSnap.docs.filter(d => d.data().status === 'pending').length,
          topStudents: top
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        setLoading(false);
      }
    };

    fetchData();

    const qQueries = query(collection(db, 'queries'), orderBy('timestamp', 'desc'), limit(10));
    const unsubQueries = onSnapshot(qQueries, (snapshot) => {
      setQueries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Query)));
    });

    return () => unsubQueries();
  }, []);

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

  if (loading) return <div className="p-8 text-center">Loading Admin Dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-stone-900">Admin Command Center</h2>
        <div className="flex gap-2">
          <button className="bg-emerald-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
            <BarChart3 size={16} /> Reports
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Total Activities', value: stats.totalActivities, icon: Award, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Pending Queries', value: stats.pendingQueries, icon: MessageSquare, color: 'bg-amber-50 text-amber-600' },
          { label: 'Avg Points', value: (stats.totalActivities > 0 ? (stats.totalActivities / stats.totalStudents).toFixed(1) : 0), icon: TrendingUp, color: 'bg-purple-50 text-purple-600' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon size={24} />
            </div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">{stat.label}</p>
            <p className="text-3xl font-black text-stone-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Performing Students */}
        <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
          <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
            <TrendingUp className="text-emerald-600" /> Top Performing Students
          </h3>
          <div className="space-y-4">
            {stats.topStudents.map((s, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-100">
                <div className="w-10 h-10 rounded-full bg-emerald-900 text-white flex items-center justify-center font-black text-sm">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-stone-900">{s.name}</p>
                  <p className="text-xs text-stone-500">Adm No: {s.admissionNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-emerald-700">{s.totalPoints}</p>
                  <p className="text-[10px] text-stone-400 font-bold uppercase">Points</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Queries */}
        <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
          <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
            <MessageSquare className="text-amber-600" /> Recent Queries
          </h3>
          <div className="space-y-4">
            {queries.map((q) => (
              <div key={q.id} className="p-4 rounded-2xl border border-stone-100 hover:bg-stone-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-stone-900">{q.studentName}</p>
                    <p className="text-[10px] text-stone-400 font-bold uppercase">{q.timestamp?.toDate().toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${q.status === 'replied' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {q.status}
                  </span>
                </div>
                <p className="text-sm text-stone-600 line-clamp-2">{q.message}</p>
                {q.status === 'pending' && (
                  <div className="mt-4 flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Type reply..." 
                      className="flex-1 text-xs p-2 rounded-lg border border-stone-200 outline-none focus:ring-1 focus:ring-emerald-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleReply(q.id!, (e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <button className="p-2 bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 transition-colors">
                      <CheckCircle size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
