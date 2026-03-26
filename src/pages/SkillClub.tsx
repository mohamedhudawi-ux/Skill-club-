import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, writeBatch, getDocs, doc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Student, Club, ClubPointEntry, SkillClubEntry } from '../types';
import { Trophy, Medal, Award, Star, Search, Trash2, BookOpen } from 'lucide-react';
import { Card } from '../components/Card';
import { useAuth } from '../AuthContext';
import { Button } from '../components/Button';
import { SKILL_CLUB_CATEGORIES } from '../types';
import { safeToDate } from '../utils/date';

export default function SkillClub() {
  const [rankings, setRankings] = useState<Student[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubPointEntries, setClubPointEntries] = useState<ClubPointEntry[]>([]);
  const [skillClubEntries, setSkillClubEntries] = useState<SkillClubEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const { profile, isSafa } = useAuth();

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const q = query(collection(db, 'students'), orderBy('totalPoints', 'desc'), limit(100));
        const snapshot = await getDocs(q);
        setRankings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      } catch (error) {
        console.error("SkillClub students fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRankings();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const clubsSnap = await getDocs(query(collection(db, 'clubs'), limit(50)));
        setClubs(clubsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));

        const clubEntriesSnap = await getDocs(
          query(collection(db, 'clubPointEntries'), where('timestamp', '>=', startOfMonth), limit(500))
        );
        setClubPointEntries(clubEntriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubPointEntry)));

        const skillEntriesSnap = await getDocs(
          query(collection(db, 'skillClubEntries'), where('timestamp', '>=', startOfMonth), limit(500))
        );
        setSkillClubEntries(skillEntriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SkillClubEntry)));
      } catch (error) {
        console.error("SkillClub data fetch error:", error);
      }
    };
    fetchData();
  }, []);

  const handleClearAllPoints = async () => {
    try {
      setLoading(true);
      // Only fetch students who actually have points or badges to clear
      const studentsQuery = query(collection(db, 'students'), where('totalPoints', '>', 0));
      const studentsSnap = await getDocs(studentsQuery);
      
      // For skillClubEntries, fetch only what's necessary or in chunks
      // To avoid massive reads, we can limit this or only clear recent ones if that's acceptable,
      // but "Clear All" usually means everything. Let's fetch in a way that's as efficient as possible.
      const entriesSnap = await getDocs(query(collection(db, 'skillClubEntries'), limit(1000)));
      
      // Only fetch users who have points or badges
      const usersQuery = query(collection(db, 'users'), where('totalPoints', '>', 0));
      const usersSnap = await getDocs(usersQuery);
      
      const batches = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;
      
      studentsSnap.docs.forEach(docSnap => {
        currentBatch.update(docSnap.ref, { 
          totalPoints: 0,
          categoryPoints: {},
          badges: []
        });
        operationCount++;
        if (operationCount === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      });

      usersSnap.docs.forEach(docSnap => {
        currentBatch.update(docSnap.ref, { 
          totalPoints: 0,
          badges: []
        });
        operationCount++;
        if (operationCount === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      });

      entriesSnap.docs.forEach(docSnap => {
        currentBatch.delete(docSnap.ref);
        operationCount++;
        if (operationCount === 500) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      for (const batch of batches) {
        await batch.commit();
      }

      alert('All student points have been cleared.');
      setShowConfirm(false);
    } catch (error) {
      console.error('Error clearing points:', error);
      alert('Failed to clear points: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyClubPoints = clubPointEntries
    .filter(entry => {
      const date = safeToDate(entry.timestamp);
      return date?.getMonth() === currentMonth && date?.getFullYear() === currentYear;
    })
    .reduce((acc, entry) => {
      acc[entry.clubId] = (acc[entry.clubId] || 0) + entry.points;
      return acc;
    }, {} as Record<string, number>);

  const monthlyClubRankings = clubs
    .map(club => ({ ...club, monthlyPoints: monthlyClubPoints[club.id] || 0 }))
    .sort((a, b) => b.monthlyPoints - a.monthlyPoints);

  const monthlyStudentPoints = skillClubEntries
    .filter(entry => {
      const date = safeToDate(entry.timestamp);
      return date?.getMonth() === currentMonth && date?.getFullYear() === currentYear;
    })
    .reduce((acc, entry) => {
      acc[entry.studentAdmissionNumber] = (acc[entry.studentAdmissionNumber] || 0) + entry.points;
      return acc;
    }, {} as Record<string, number>);

  const monthlyStudentRankings = rankings
    .map(student => ({ ...student, monthlyPoints: monthlyStudentPoints[student.admissionNumber] || 0 }))
    .sort((a, b) => b.monthlyPoints - a.monthlyPoints);

  const sortedClubs = [...clubs].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

  // Class-wise
  const studentsByClass = rankings.reduce((acc, student) => {
    const className = student.class || 'Unassigned';
    if (!acc[className]) acc[className] = [];
    acc[className].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  Object.keys(studentsByClass).forEach(className => {
    studentsByClass[className].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  });

  // Category-wise
  const categoryToppers = SKILL_CLUB_CATEGORIES.map(category => {
    const topStudents = rankings
      .filter(s => (s.categoryPoints?.[category] || 0) > 0)
      .sort((a, b) => (b.categoryPoints?.[category] || 0) - (a.categoryPoints?.[category] || 0))
      .slice(0, 5);
    return { category, topStudents };
  }).filter(c => c.topStudents.length > 0);

  if (loading && rankings.length === 0) return <div className="animate-pulse space-y-4">
    {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-stone-100 rounded-2xl"></div>)}
  </div>;

  return (
    <div className="space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h2 className="text-4xl font-black text-stone-900 uppercase tracking-tight">SkillClub <span className="text-emerald-500">Scoreboard</span></h2>
        <p className="text-stone-500 font-medium">Celebrating excellence and active participation in college life.</p>
        {(isSafa || profile?.role === 'admin') && (
          <div className="pt-4">
            <Button 
              variant="danger" 
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 mx-auto"
            >
              <Trash2 size={18} /> Clear All Student Points
            </Button>
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold mb-4">Are you absolutely sure?</h3>
            <p className="text-stone-600 mb-8">This will permanently delete all student points, category points, badges, and skill club entries. This action cannot be undone.</p>
            <div className="flex gap-4">
              <Button variant="danger" onClick={handleClearAllPoints} disabled={loading} className="flex-1">
                {loading ? 'Clearing...' : 'Yes, Clear Everything'}
              </Button>
              <Button variant="ghost" onClick={() => setShowConfirm(false)} disabled={loading} className="flex-1">
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Overall Rankings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <Trophy className="text-yellow-500" /> Overall Rankings
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input 
                placeholder="Search students..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl border border-stone-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          
          <div className="space-y-3">
            {rankings
              .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.admissionNumber.includes(searchTerm))
              .map((student, idx) => (
              <Card key={student.id} className={`p-4 flex items-center gap-4 transition-all hover:shadow-md ${idx < 3 ? 'border-emerald-200 bg-emerald-50/30' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${
                  idx === 0 ? 'bg-yellow-400 text-white' : 
                  idx === 1 ? 'bg-stone-300 text-white' : 
                  idx === 2 ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-400'
                }`}>
                  {idx + 1}
                </div>
                {student.photoURL && <img src={student.photoURL} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />}
                <div className="flex-grow">
                  <h4 className="font-bold text-stone-900">{student.name}</h4>
                  <p className="text-xs text-stone-500">{student.admissionNumber} • {student.class}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-600">{student.totalPoints || 0}</p>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Points</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Side Panels */}
        <div className="space-y-8">
          {/* Monthly Toppers */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <Star className="text-emerald-500" /> Monthly Toppers
            </h3>
            <div className="space-y-3">
              {monthlyStudentRankings.slice(0, 5).map((student, idx) => (
                <Card key={student.id} className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center font-bold text-stone-500">
                    #{idx + 1}
                  </div>
                  <div className="flex-grow">
                    <p className="font-bold text-sm text-stone-900">{student.name}</p>
                    <p className="text-[10px] text-stone-500">{student.class}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-600">{student.monthlyPoints}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Club Rankings */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <Medal className="text-blue-500" /> Club Rankings
            </h3>
            <div className="space-y-3">
              {sortedClubs.map((club, idx) => (
                <Card key={club.id} className="p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center font-bold text-stone-500">
                    #{idx + 1}
                  </div>
                  {club.logoUrl && <img src={club.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />}
                  <div className="flex-grow">
                    <p className="font-bold text-stone-900">{club.name}</p>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Club</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-emerald-600">{club.totalPoints || 0}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Class-wise Rankings */}
      <section className="space-y-6">
        <h3 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <BookOpen className="text-purple-500" /> Class-wise Toppers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(studentsByClass).map(([className, students]) => (
            <Card key={className} className="p-6 space-y-4">
              <h4 className="text-lg font-black text-stone-900 border-b border-stone-100 pb-2">{className}</h4>
              <div className="space-y-3">
                {(students as Student[]).slice(0, 3).map((student, idx) => (
                  <div key={student.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-400">#{idx + 1}</span>
                      <span className="font-bold text-sm text-stone-700 truncate max-w-[120px]">{student.name}</span>
                    </div>
                    <span className="font-black text-emerald-600">{student.totalPoints || 0}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Category Toppers */}
      <section className="space-y-6">
        <h3 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <Award className="text-amber-500" /> Category Toppers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryToppers.map(({ category, topStudents }) => (
            <Card key={category} className="p-6 space-y-4">
              <h4 className="text-lg font-black text-stone-900 border-b border-stone-100 pb-2 uppercase tracking-wider text-sm">{category}</h4>
              <div className="space-y-3">
                {topStudents.map((student, idx) => (
                  <div key={student.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-400">#{idx + 1}</span>
                      <span className="font-bold text-sm text-stone-700">{student.name}</span>
                    </div>
                    <span className="font-black text-emerald-600">{student.categoryPoints?.[category] || 0}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
