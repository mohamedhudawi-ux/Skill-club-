import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Student } from '../types';
import { Trophy, Medal, Award, Star } from 'lucide-react';

export default function SkillClub() {
  const [rankings, setRankings] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'students'), orderBy('totalPoints', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRankings(snapshot.docs.map(doc => doc.data() as Student));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div className="animate-pulse space-y-4">
    {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-stone-100 rounded-2xl"></div>)}
  </div>;

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-4xl font-black text-stone-900 mb-4">SkillClub Scoreboard</h2>
        <p className="text-stone-500">Celebrating excellence and active participation in college life. Here are our top performers.</p>
      </div>

      {/* Top 3 Podium */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-8 pb-8 border-b border-stone-100">
        {/* 2nd Place */}
        {rankings[1] && (
          <div className="flex flex-col items-center order-2 md:order-1">
            <div className="relative mb-4">
              <img src={rankings[1].photoURL || `https://ui-avatars.com/api/?name=${rankings[1].name}&background=random`} className="w-24 h-24 rounded-full border-4 border-stone-300 shadow-lg" alt="" />
              <div className="absolute -bottom-2 -right-2 bg-stone-300 text-stone-700 w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-white">2</div>
            </div>
            <p className="font-bold text-stone-800">{rankings[1].name}</p>
            <p className="text-emerald-700 font-black">{rankings[1].totalPoints} pts</p>
          </div>
        )}
        
        {/* 1st Place */}
        {rankings[0] && (
          <div className="flex flex-col items-center order-1 md:order-2">
            <Trophy className="text-amber-400 mb-2" size={40} />
            <div className="relative mb-4">
              <img src={rankings[0].photoURL || `https://ui-avatars.com/api/?name=${rankings[0].name}&background=random`} className="w-32 h-32 rounded-full border-4 border-amber-400 shadow-xl" alt="" />
              <div className="absolute -bottom-2 -right-2 bg-amber-400 text-amber-900 w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 border-white">1</div>
            </div>
            <p className="font-black text-xl text-stone-900">{rankings[0].name}</p>
            <p className="text-emerald-700 font-black text-lg">{rankings[0].totalPoints} pts</p>
          </div>
        )}

        {/* 3rd Place */}
        {rankings[2] && (
          <div className="flex flex-col items-center order-3">
            <div className="relative mb-4">
              <img src={rankings[2].photoURL || `https://ui-avatars.com/api/?name=${rankings[2].name}&background=random`} className="w-20 h-20 rounded-full border-4 border-orange-300 shadow-lg" alt="" />
              <div className="absolute -bottom-2 -right-2 bg-orange-300 text-orange-800 w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-white">3</div>
            </div>
            <p className="font-bold text-stone-800">{rankings[2].name}</p>
            <p className="text-emerald-700 font-black">{rankings[2].totalPoints} pts</p>
          </div>
        )}
      </div>

      {/* Rankings List */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-100">
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Student</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Admission No</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Total Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {rankings.slice(3).map((student, index) => (
              <tr key={student.admissionNumber} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4 font-bold text-stone-400">#{index + 4}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={student.photoURL || `https://ui-avatars.com/api/?name=${student.name}&background=random`} className="w-8 h-8 rounded-full" alt="" />
                    <span className="font-bold text-stone-900">{student.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-stone-500">{student.admissionNumber}</td>
                <td className="px-6 py-4 text-right">
                  <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-black">
                    {student.totalPoints}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
