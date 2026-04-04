import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Program } from '../types';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronRight, ChevronLeft, Filter } from 'lucide-react';
import { Card } from '../components/Card';

export default function Calendar() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [eventType, setEventType] = useState<string>('all');

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'programs'), orderBy('date', 'asc'));
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

  const eventTypes = useMemo(() => {
    const types = new Set(programs.map(p => p.type || 'General'));
    return ['all', ...Array.from(types)];
  }, [programs]);

  const filteredPrograms = useMemo(() => {
    return programs.filter(program => {
      const date = new Date(program.date);
      const matchesDate = date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
      const matchesType = eventType === 'all' || (program.type || 'General') === eventType;
      return matchesDate && matchesType;
    });
  }, [programs, selectedMonth, selectedYear, eventType]);

  const changeMonth = (delta: number) => {
    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    else if (newMonth < 0) { newMonth = 11; newYear--; }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="h-24 bg-stone-100 rounded-2xl"></div>
    <div className="h-64 bg-stone-50 rounded-2xl"></div>
  </div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-stone-900">Skill Club Calendar</h2>
          <p className="text-stone-500">Stay updated with the latest events and programs.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-stone-100 p-2 rounded-2xl">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-xl"><ChevronLeft size={20}/></button>
          <span className="font-bold text-stone-800 min-w-[120px] text-center">
            {new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-xl"><ChevronRight size={20}/></button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
        <Filter className="text-stone-400" size={20} />
        <select 
          value={eventType} 
          onChange={(e) => setEventType(e.target.value)}
          className="bg-stone-50 border-none rounded-xl p-2 text-sm font-bold text-stone-700 focus:ring-0"
        >
          {eventTypes.map(type => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
        </select>
      </div>

      {filteredPrograms.length > 0 ? (
        <div className="grid gap-4">
          {filteredPrograms.map((program) => (
            <Card key={program.id} className="p-6 flex flex-col sm:flex-row sm:items-center gap-6 hover:shadow-md transition-all group">
              <div className="bg-stone-50 text-stone-800 p-4 rounded-2xl text-center min-w-[100px] group-hover:bg-emerald-50 group-hover:text-emerald-800 transition-colors">
                <p className="text-xs font-bold uppercase tracking-widest">{new Date(program.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                <p className="text-3xl font-black">{new Date(program.date).getDate()}</p>
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold text-stone-900 mb-2">{program.title}</h4>
                <p className="text-stone-500 text-sm mb-4 leading-relaxed">{program.description || 'Join us for this exciting program.'}</p>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-stone-400 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} /> <span>{program.time || 'TBA'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} /> <span>{program.location || 'College Campus'}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-stone-50 border-2 border-dashed border-stone-200 rounded-3xl p-20 text-center">
          <CalendarIcon className="mx-auto text-stone-300 mb-4" size={48} />
          <p className="text-stone-500 font-medium">No programs scheduled for this selection.</p>
        </div>
      )}
    </div>
  );
}
