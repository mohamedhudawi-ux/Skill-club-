import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Query as QueryType } from '../types';
import { Send, Mic, Square, MessageSquare, Clock, CheckCircle, Trash2 } from 'lucide-react';

export function QueryBox({ userProfile }: { userProfile: UserProfile }) {
  const [message, setMessage] = useState('');
  const [queries, setQueries] = useState<QueryType[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const fetchQueries = async () => {
      const q = query(
        collection(db, 'queries'),
        where('studentUid', '==', userProfile.uid)
      );

      try {
        const snapshot = await getDocs(q);
        const queryList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QueryType));
        queryList.sort((a, b) => {
          const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
          const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
          return timeB - timeA;
        });
        setQueries(queryList);
      } catch (error) {
        console.error('Error fetching queries:', error);
      }
    };

    fetchQueries();
  }, [userProfile.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await addDoc(collection(db, 'queries'), {
        studentUid: userProfile.uid,
        studentName: userProfile.displayName || 'Anonymous',
        message,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      setMessage('');
      setStatus({ type: 'success', msg: 'Query sent successfully!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Error sending query:', error);
      setStatus({ type: 'error', msg: 'Failed to send query.' });
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    clearInterval(timerRef.current);
    // In a real app, we would handle the audio blob here
    setStatus({ type: 'success', msg: 'Voice message recorded (Demo)' });
    setTimeout(() => setStatus(null), 3000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this query?')) {
      try {
        await deleteDoc(doc(db, 'queries', id));
        setStatus({ type: 'success', msg: 'Query deleted successfully!' });
        setTimeout(() => setStatus(null), 3000);
      } catch (error) {
        console.error('Error deleting query:', error);
        setStatus({ type: 'error', msg: 'Failed to delete query.' });
        setTimeout(() => setStatus(null), 3000);
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
        <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
          <MessageSquare className="text-emerald-600" /> Send a Query
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 min-h-[120px] resize-none"
              disabled={isRecording}
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="p-2 bg-stone-100 text-stone-600 rounded-full hover:bg-stone-200 transition-colors"
                  title="Record Voice Message"
                >
                  <Mic size={20} />
                </button>
              ) : (
                <div className="flex items-center gap-3 bg-red-50 text-red-600 px-4 py-2 rounded-full animate-pulse">
                  <span className="text-xs font-bold">{formatTime(recordingTime)}</span>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  >
                    <Square size={12} fill="currentColor" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {status && (
            <div className={`p-3 rounded-xl text-sm font-bold ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {status.msg}
            </div>
          )}

          <button
            type="submit"
            disabled={!message.trim() || isRecording}
            className="w-full bg-emerald-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
            Send Query
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
          <Clock className="text-stone-400" /> Previous Queries
        </h3>
        <div className="space-y-4">
          {queries.length > 0 ? queries.map((q) => (
            <div key={q.id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${q.status === 'replied' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {q.status}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400 font-bold">
                    {q.timestamp?.toDate().toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDelete(q.id!)}
                    className="text-stone-400 hover:text-red-600 transition-colors"
                    title="Delete Query"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-stone-800 mb-4">{q.message}</p>
              {q.reply && (
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 mt-4">
                  <p className="text-xs font-bold text-emerald-700 mb-1 flex items-center gap-1">
                    <CheckCircle size={12} /> Admin Reply:
                  </p>
                  <p className="text-sm text-stone-600 italic">{q.reply}</p>
                </div>
              )}
            </div>
          )) : (
            <div className="text-center py-12 text-stone-400 italic">
              No queries sent yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
