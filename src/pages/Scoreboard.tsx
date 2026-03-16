import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Club } from '../types';
import { BarChart3, Trophy, Medal, Award } from 'lucide-react';

export default function Scoreboard() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'clubs'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Club[];
      // For now, we'll assume points are part of the club data or we'll mock them
      // In a real app, we might have a separate points collection
      setClubs(clubsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading Scoreboard...</div>;

  // Sort clubs by points (mocked for now as 0 if not present)
  const sortedClubs = [...clubs].sort((a, b) => (b.points || 0) - (a.points || 0));

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black text-stone-900 tracking-tight">Union Scoreboard</h2>
        <p className="text-stone-500 font-medium">Real-time performance tracking of all SkillClubs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sortedClubs.slice(0, 3).map((club, index) => (
          <div 
            key={club.id} 
            className={`relative p-8 rounded-3xl border-2 transition-all hover:scale-105 ${
              index === 0 ? 'bg-brand-gold/10 border-brand-gold' : 
              index === 1 ? 'bg-stone-100 border-stone-300' : 
              'bg-orange-50 border-orange-200'
            }`}
          >
            <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-brand-gold">
              {index === 0 ? <Trophy className="text-brand-gold" size={24} /> : 
               index === 1 ? <Medal className="text-stone-400" size={24} /> : 
               <Award className="text-orange-400" size={24} />}
            </div>
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 mx-auto bg-white rounded-2xl shadow-sm flex items-center justify-center overflow-hidden">
                {club.logoUrl ? (
                  <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
                ) : (
                  <BarChart3 className="text-stone-300" size={32} />
                )}
              </div>
              <div>
                <h3 className="text-xl font-black text-stone-900">{club.name}</h3>
                <p className="text-3xl font-black text-brand-green mt-2">{club.points || 0} pts</p>
              </div>
              <div className="pt-4">
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  index === 0 ? 'bg-brand-gold text-white' : 'bg-stone-200 text-stone-600'
                }`}>
                  {index === 0 ? 'Current Leader' : `Rank #${index + 1}`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="p-6 border-b border-stone-50 bg-stone-50/50">
          <h3 className="font-black text-stone-900 uppercase tracking-widest text-sm">Full Rankings</h3>
        </div>
        <div className="divide-y divide-stone-50">
          {sortedClubs.map((club, index) => (
            <div key={club.id} className="flex items-center justify-between p-6 hover:bg-stone-50 transition-colors">
              <div className="flex items-center gap-6">
                <span className="w-8 text-2xl font-black text-stone-300">{(index + 1).toString().padStart(2, '0')}</span>
                <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center overflow-hidden">
                  {club.logoUrl ? (
                    <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
                  ) : (
                    <BarChart3 className="text-stone-300" size={20} />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-stone-900">{club.name}</h4>
                  <p className="text-xs text-stone-500 uppercase font-bold tracking-tighter">SkillClub</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-brand-green">{club.points || 0}</p>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Points</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
