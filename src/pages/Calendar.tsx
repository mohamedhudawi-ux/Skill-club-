import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Program } from '../types';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronRight, ChevronLeft, Filter } from 'lucide-react';
import { Card } from '../components/Card';
import { useAuth } from '../AuthContext';
import { getHijriDate } from '../utils/hijri';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isSameDay, 
  addMonths, subMonths, isToday, isBefore, startOfDay,
  addDays
} from 'date-fns';

export default function Calendar() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Filter programs based on visibility rules
  const visiblePrograms = useMemo(() => {
    const now = startOfDay(new Date());
    return programs.filter(p => {
      if (isAdmin) return true;
      return !isBefore(new Date(p.date), now); // Future or today
    });
  }, [programs, isAdmin]);
  
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

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const programsForMonth = useMemo(() => {
    return visiblePrograms.filter(p => isSameMonth(new Date(p.date), currentDate));
  }, [visiblePrograms, currentDate]);

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="h-24 bg-stone-100 rounded-2xl"></div>
    <div className="h-64 bg-stone-50 rounded-2xl"></div>
  </div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-stone-900">Skill Club Calendar</h2>
          <p className="text-stone-500">Manage and view programs schedule.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-stone-100 p-2 rounded-2xl">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-xl"><ChevronLeft size={20}/></button>
          <span className="font-bold text-stone-800 min-w-[120px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-xl"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Grid Calendar */}
      <Card className="p-6">
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-xs font-black text-stone-400 uppercase tracking-widest py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            const dayPrograms = visiblePrograms.filter(p => isSameDay(new Date(p.date), day));
            return (
              <div 
                key={idx}
                className={`relative min-h-[80px] p-2 border rounded-xl ${!isSameMonth(day, monthStart) ? 'bg-stone-50 text-stone-300' : 'bg-white text-stone-900'} ${isToday(day) ? 'border-emerald-500' : 'border-stone-100'}`}
              >
                <div className={`text-sm font-bold ${isToday(day) ? 'text-emerald-600' : ''}`}>
                  {format(day, 'd')}
                </div>
                <div className="absolute bottom-1 right-2 text-[10px] text-emerald-600 font-arabic">
                  {getHijriDate(day, 0)}
                </div>
                {dayPrograms.slice(0, 2).map(p => (
                  <div key={p.id} className="text-[9px] truncate bg-emerald-100 text-emerald-800 p-0.5 rounded mt-1 font-bold">
                    {p.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Program List */}
      <h3 className="text-xl font-black text-stone-900 mt-8">Programs this Month</h3>
      <div className="grid gap-4">
        {programsForMonth.length > 0 ? programsForMonth.map((program) => (
          <Card key={program.id} className="p-6 flex flex-col sm:flex-row sm:items-center gap-6 hover:shadow-md transition-all">
            <div className="bg-stone-50 text-stone-800 p-4 rounded-2xl text-center min-w-[100px]">
              <p className="text-xs font-bold uppercase tracking-widest">{format(new Date(program.date), 'EEE')}</p>
              <p className="text-3xl font-black">{format(new Date(program.date), 'd')}</p>
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-stone-900">{program.title}</h4>
              <p className="text-stone-500 text-sm mt-1">{program.description || 'Join us for this exciting program.'}</p>
            </div>
          </Card>
        )) : (
          <div className="text-center py-10 text-stone-400 italic">No programs scheduled for this month.</div>
        )}
      </div>
    </div>
  );
}
