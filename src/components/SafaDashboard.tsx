import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Program, SKILL_CLUB_CATEGORIES } from '../types';
import { 
  PlusCircle, Calendar, Users, FileText, 
  MapPin, Clock, Award, CheckCircle
} from 'lucide-react';

export function SafaDashboard() {
  const { profile } = useAuth();
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventData, setEventData] = useState({ title: '', date: '', description: '', category: '' });
  const [recentEvents, setRecentEvents] = useState<Program[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'programs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecentEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Program)));
    });
    return () => unsubscribe();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'programs'), {
        ...eventData,
        addedBy: profile?.uid,
        timestamp: serverTimestamp()
      });
      setEventData({ title: '', date: '', description: '', category: '' });
      setShowEventForm(false);
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-stone-900">Union (Safa) Dashboard</h2>
        <button 
          onClick={() => setShowEventForm(true)}
          className="bg-emerald-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-900/20"
        >
          <PlusCircle size={20} /> Create New Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Events List */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Calendar className="text-emerald-600" /> Recent Union Events
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentEvents.map((event) => (
              <div key={event.id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-emerald-50 text-emerald-700 p-3 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Calendar size={24} />
                  </div>
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{event.date}</span>
                </div>
                <h4 className="text-lg font-bold text-stone-900 mb-2">{event.title}</h4>
                <p className="text-sm text-stone-500 line-clamp-2 mb-6">{event.description}</p>
                <div className="flex items-center justify-between pt-4 border-t border-stone-50">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                    {event.category || 'General'}
                  </span>
                  <button className="text-xs font-bold text-stone-400 hover:text-emerald-600 transition-colors flex items-center gap-1">
                    Record Participation <PlusCircle size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Union Stats / Quick Actions */}
        <div className="space-y-8">
          <div className="bg-stone-900 text-white p-8 rounded-3xl shadow-xl shadow-stone-900/20">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Award size={20} className="text-emerald-400" /> Union Tasks
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold">Participation Reports</p>
                  <p className="text-[10px] text-white/50">Track student engagement</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold">Activity Logs</p>
                  <p className="text-[10px] text-white/50">Submit event summaries</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <h3 className="text-lg font-bold text-stone-900 mb-4">Union Goal</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-stone-500">Event Target</span>
                  <span className="text-emerald-700">80%</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 w-[80%] rounded-full" />
                </div>
              </div>
              <p className="text-[10px] text-stone-400 leading-relaxed">
                Aim to organize at least 5 events per month to maintain active student engagement.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl font-black text-stone-900 mb-6">Create New Event</h3>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Event Title</label>
                <input 
                  type="text" 
                  value={eventData.title}
                  onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                  placeholder="e.g. Annual Debate Competition"
                  className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Date</label>
                  <input 
                    type="date" 
                    value={eventData.date}
                    onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                    className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Category</label>
                  <select 
                    value={eventData.category}
                    onChange={(e) => setEventData({ ...eventData, category: e.target.value })}
                    className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Select...</option>
                    {SKILL_CLUB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Description</label>
                <textarea 
                  value={eventData.description}
                  onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                  placeholder="Tell us more about the event..."
                  className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px] resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-stone-500 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-emerald-900 text-white py-4 rounded-2xl font-bold hover:bg-emerald-800 transition-all"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
