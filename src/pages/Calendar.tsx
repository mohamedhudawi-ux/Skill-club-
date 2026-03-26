import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Program } from '../types';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronRight } from 'lucide-react';
import { Card } from '../components/Card';

export default function Calendar() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'programs'), orderBy('date', 'asc'), limit(50));
        const snapshot = await getDocs(q);
        setPrograms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Program)));
      } catch (error) {
        console.error("Calendar fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPrograms();
  }, []);

  // Group programs by month
  const groupedPrograms = programs.reduce((acc, program) => {
    const month = new Date(program.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(program);
    return acc;
  }, {} as Record<string, Program[]>);

  if (loading) return <div className="animate-pulse space-y-8">
    {[1,2].map(i => (
      <div key={i} className="space-y-4">
        <div className="h-8 bg-stone-100 w-48 rounded-lg"></div>
        <div className="grid gap-4">
          {[1,2,3].map(j => <div key={j} className="h-24 bg-stone-50 rounded-2xl"></div>)}
        </div>
      </div>
    ))}
  </div>;

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-3xl font-black text-stone-900">Skill Club Calendar</h2>
        <p className="text-stone-500">Stay updated with the latest events and programs from Safa Union.</p>
      </div>

      {Object.keys(groupedPrograms).length > 0 ? Object.entries(groupedPrograms).map(([month, monthPrograms]) => (
        <div key={month} className="space-y-6">
          <h3 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
            <ChevronRight size={20} /> {month}
          </h3>
          <div className="grid gap-4">
            {(monthPrograms as Program[]).map((program) => (
              <Card key={program.id} className="p-6 flex flex-col sm:flex-row sm:items-center gap-6 hover:shadow-md transition-all group">
                <div className="bg-stone-50 text-stone-800 p-4 rounded-2xl text-center min-w-[100px] group-hover:bg-emerald-50 group-hover:text-emerald-800 transition-colors">
                  <p className="text-xs font-bold uppercase tracking-widest">{new Date(program.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                  <p className="text-3xl font-black">{new Date(program.date).getDate()}</p>
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-stone-900 mb-2">{program.title}</h4>
                  <p className="text-stone-500 text-sm mb-4 leading-relaxed">{program.description || 'Join us for this exciting program organized by Safa Union.'}</p>
                  <div className="flex flex-wrap gap-4 text-xs font-bold text-stone-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} /> <span>TBA</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} /> <span>College Campus</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )) : (
        <div className="bg-stone-50 border-2 border-dashed border-stone-200 rounded-3xl p-20 text-center">
          <CalendarIcon className="mx-auto text-stone-300 mb-4" size={48} />
          <p className="text-stone-500 font-medium">No programs scheduled at the moment.</p>
        </div>
      )}
    </div>
  );
}
