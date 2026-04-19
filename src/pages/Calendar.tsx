import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Program, Club } from '../types';
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
  const { isAdmin, campusId } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Define colors for clubs
  const clubColors = ['bg-blue-200', 'bg-green-200', 'bg-red-200', 'bg-orange-200', 'bg-purple-200', 'bg-teal-200', 'bg-cyan-200', 'bg-lime-200'];
  const getClubColor = (clubId?: string) => {
    if (!clubId) return 'bg-pink-200';
    if (clubId === 'SRDB') return 'bg-amber-200';
    if (clubId === 'LB') return 'bg-indigo-200';
    if (clubId === 'SAB') return 'bg-rose-200';
    if (clubId === 'SAFA') return 'bg-emerald-200';
    const index = clubs.findIndex(c => c.id === clubId);
    return index !== -1 ? clubColors[index % clubColors.length] : 'bg-pink-200';
  };

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
    if (!campusId) return;
    const fetchPrograms = async () => {
      try {
        setLoading(true);
        const [programsSnap, clubsSnap] = await Promise.all([
          getDocs(query(collection(db, 'programs'), where('campusId', '==', campusId), orderBy('date', 'asc'))),
          getDocs(query(collection(db, 'clubs'), where('campusId', '==', campusId)))
        ]);
        setPrograms(programsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Program)));
        setClubs(clubsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));
      } catch (error) {
        console.error("Calendar fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPrograms();
  }, [campusId]);

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
                className={`relative min-h-[80px] p-2 border rounded-xl ${!isSameMonth(day, monthStart) ? 'bg-stone-50 text-stone-300' : isToday(day) ? 'bg-yellow-200 border-emerald-500' : dayPrograms.length > 0 ? `${getClubColor(dayPrograms[0].clubId)} border-transparent` : 'bg-white border-stone-100'}`}
              >
                <div className={`text-sm font-bold ${isToday(day) ? 'text-emerald-600' : ''}`}>
                  {format(day, 'd')}
                </div>
                <div className="absolute bottom-1 right-2 text-[10px] text-emerald-600 font-arabic">
                  {getHijriDate(day, 0)}
                </div>
                {dayPrograms.slice(0, 2).map(p => (
                  <div key={p.id} className="text-[9px] truncate bg-emerald-100 text-emerald-800 p-0.5 rounded mt-1 font-bold">
                    {p.title} {p.location && `(${p.location})`}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Program List */}
      <h3 className="text-xl font-black text-stone-900 mt-8">Upcoming Programs</h3>
      <div className="space-y-8">
        {clubs.map(club => {
          const clubPrograms = programsForMonth.filter(p => p.clubId === club.id);
          if (clubPrograms.length === 0) return null;
          
          return (
            <div key={club.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-1 h-6 rounded-full ${getClubColor(club.id)}`}></div>
                <h4 className="text-lg font-bold text-stone-800">{club.name}</h4>
                <span className="text-xs font-bold text-stone-400 px-2 py-0.5 bg-stone-100 rounded-full lowercase">
                  {clubPrograms.length} {clubPrograms.length === 1 ? 'program' : 'programs'}
                </span>
              </div>
              <div className="grid gap-4">
                {clubPrograms.map((program) => (
                  <Card key={program.id} className="p-6 flex flex-col sm:flex-row sm:items-center gap-6 hover:shadow-md transition-all border-l-4 border-l-stone-200" style={{ borderLeftColor: getClubColor(club.id).replace('bg-', '').replace('-200', '') }}>
                    <div className="bg-stone-50 text-stone-800 p-4 rounded-2xl text-center min-w-[100px]">
                      <p className="text-xs font-bold uppercase tracking-widest">{format(new Date(program.date), 'EEE')}</p>
                      <p className="text-3xl font-black">{format(new Date(program.date), 'd')}</p>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-stone-900">{program.title}</h4>
                      {program.location && <p className="text-emerald-700 text-xs font-bold mt-1">📍 {program.location}</p>}
                      <p className="text-stone-500 text-sm mt-1">{program.description || 'Join us for this exciting program.'}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {/* special Safa Boards Grouping */}
        {['SRDB', 'LB', 'SAB', 'SAFA'].map(boardId => {
          const boardPrograms = programsForMonth.filter(p => p.clubId === boardId);
          if (boardPrograms.length === 0) return null;
          
          return (
            <div key={boardId} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-1 h-6 rounded-full ${getClubColor(boardId)}`}></div>
                <h4 className="text-lg font-bold text-stone-800">{boardId}</h4>
                <span className="text-xs font-bold text-stone-400 px-2 py-0.5 bg-stone-100 rounded-full lowercase">
                  {boardPrograms.length} {boardPrograms.length === 1 ? 'program' : 'programs'}
                </span>
              </div>
              <div className="grid gap-4">
                {boardPrograms.map((program) => (
                  <Card key={program.id} className="p-6 flex flex-col sm:flex-row sm:items-center gap-6 hover:shadow-md transition-all border-l-4 border-l-stone-200" style={{ borderLeftColor: getClubColor(boardId).replace('bg-', '').replace('-200', '') }}>
                    <div className="bg-stone-50 text-stone-800 p-4 rounded-2xl text-center min-w-[100px]">
                      <p className="text-xs font-bold uppercase tracking-widest">{format(new Date(program.date), 'EEE')}</p>
                      <p className="text-3xl font-black">{format(new Date(program.date), 'd')}</p>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-stone-900">{program.title}</h4>
                      {program.location && <p className="text-emerald-700 text-xs font-bold mt-1">📍 {program.location}</p>}
                      <p className="text-stone-500 text-sm mt-1">{program.description || 'Join us for this exciting program.'}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {/* General Programs (No Club) */}
        {(() => {
          const generalPrograms = programsForMonth.filter(p => !p.clubId || (!clubs.find(c => c.id === p.clubId) && !['SRDB', 'LB', 'SAB', 'SAFA'].includes(p.clubId || '')));
          if (generalPrograms.length === 0) return null;
          
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 rounded-full bg-stone-300"></div>
                <h4 className="text-lg font-bold text-stone-800">General Programs</h4>
                <span className="text-xs font-bold text-stone-400 px-2 py-0.5 bg-stone-100 rounded-full lowercase">
                  {generalPrograms.length} {generalPrograms.length === 1 ? 'program' : 'programs'}
                </span>
              </div>
              <div className="grid gap-4">
                {generalPrograms.map((program) => (
                  <Card key={program.id} className="p-6 flex flex-col sm:flex-row sm:items-center gap-6 hover:shadow-md transition-all border-l-4 border-l-stone-300">
                    <div className="bg-stone-50 text-stone-800 p-4 rounded-2xl text-center min-w-[100px]">
                      <p className="text-xs font-bold uppercase tracking-widest">{format(new Date(program.date), 'EEE')}</p>
                      <p className="text-3xl font-black">{format(new Date(program.date), 'd')}</p>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-stone-900">{program.title}</h4>
                      {program.location && <p className="text-emerald-700 text-xs font-bold mt-1">📍 {program.location}</p>}
                      <p className="text-stone-500 text-sm mt-1">{program.description || 'Join us for this exciting program.'}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })()}

        {programsForMonth.length === 0 && (
          <div className="text-center py-10 text-stone-400 italic bg-stone-50 rounded-2xl">
            No programs scheduled for this month.
          </div>
        )}
      </div>
    </div>
  );
}
