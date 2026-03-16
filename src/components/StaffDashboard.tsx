import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { SkillClubEntry, GalleryItem, Student } from '../types';
import { 
  CheckCircle, XCircle, ImageIcon, PlusCircle, 
  Search, Award, Users, Camera, Filter, TrendingUp
} from 'lucide-react';

export function StaffDashboard() {
  const { profile } = useAuth();
  const [pendingEntries, setPendingEntries] = useState<SkillClubEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState({ url: '', caption: '' });

  useEffect(() => {
    const q = query(
      collection(db, 'skillClubEntries'),
      where('status', '==', 'pending'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SkillClubEntry)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleVerify = async (entryId: string, status: 'verified' | 'rejected', points?: number) => {
    try {
      const entryRef = doc(db, 'skillClubEntries', entryId);
      await updateDoc(entryRef, {
        status,
        verifiedBy: profile?.uid,
        points: points || 0,
        remarks: status === 'verified' ? 'Verified by staff' : 'Rejected by staff'
      });

      // If verified, update student's total points
      if (status === 'verified' && points) {
        // This would ideally be a cloud function or a batch update
        // For now, we'll assume the student document needs to be updated manually or via another listener
      }
    } catch (error) {
      console.error('Error verifying entry:', error);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.url) return;

    try {
      await addDoc(collection(db, 'gallery'), {
        ...uploadData,
        uploadedBy: profile?.uid,
        timestamp: serverTimestamp()
      });
      setUploadData({ url: '', caption: '' });
      setShowUpload(false);
    } catch (error) {
      console.error('Error uploading to gallery:', error);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Staff Dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-stone-900">Staff Verification Portal</h2>
        <button 
          onClick={() => setShowUpload(true)}
          className="bg-emerald-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-800 transition-all shadow-lg shadow-emerald-900/20"
        >
          <Camera size={20} /> Upload to Gallery
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Verifications */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <CheckCircle className="text-emerald-600" /> Pending Verifications
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs">{pendingEntries.length}</span>
            </h3>
            <div className="flex gap-2">
              <button className="p-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors">
                <Filter size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {pendingEntries.length > 0 ? pendingEntries.map((entry) => (
              <div key={entry.id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex flex-col md:flex-row gap-6 items-start">
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex flex-col items-center justify-center min-w-[100px]">
                  <Award size={32} className="text-emerald-600 mb-2" />
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-tighter text-center">{entry.category}</p>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-bold text-stone-900">{entry.activityName || 'Unnamed Activity'}</h4>
                    <span className="text-[10px] text-stone-400 font-bold uppercase">{entry.timestamp?.toDate().toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-stone-600 mb-4">Student: <span className="font-bold text-stone-900">{entry.studentName || entry.studentAdmissionNumber}</span></p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleVerify(entry.id!, 'verified', 10)}
                      className="flex-1 bg-emerald-100 text-emerald-700 py-2 rounded-xl text-xs font-bold hover:bg-emerald-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={14} /> Verify (+10 pts)
                    </button>
                    <button 
                      onClick={() => handleVerify(entry.id!, 'rejected')}
                      className="flex-1 bg-red-50 text-red-700 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 bg-stone-50 rounded-3xl border border-dashed border-stone-200 text-stone-400 italic">
                No pending activities to verify.
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats / Tools */}
        <div className="space-y-8">
          <div className="bg-emerald-900 text-white p-8 rounded-3xl shadow-xl shadow-emerald-900/20">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users size={20} /> Staff Tools
            </h3>
            <div className="space-y-3">
              <button className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-2xl text-left transition-colors flex items-center justify-between group">
                <span className="text-sm font-bold">Search Students</span>
                <Search size={16} className="opacity-50 group-hover:opacity-100" />
              </button>
              <button className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-2xl text-left transition-colors flex items-center justify-between group">
                <span className="text-sm font-bold">Event Calendar</span>
                <PlusCircle size={16} className="opacity-50 group-hover:opacity-100" />
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-600" /> Performance Overview
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Monitor student participation levels across different skill categories. 
              Verified activities contribute to the overall college ranking.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl font-black text-stone-900 mb-6">Upload to Gallery</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Image URL</label>
                <input 
                  type="url" 
                  value={uploadData.url}
                  onChange={(e) => setUploadData({ ...uploadData, url: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Caption</label>
                <input 
                  type="text" 
                  value={uploadData.caption}
                  onChange={(e) => setUploadData({ ...uploadData, caption: e.target.value })}
                  placeholder="Event name or description"
                  className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-stone-500 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-emerald-900 text-white py-4 rounded-2xl font-bold hover:bg-emerald-800 transition-all"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
