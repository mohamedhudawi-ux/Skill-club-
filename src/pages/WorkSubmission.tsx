import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { WorkSubmission as SubmissionType } from '../types';
import { motion } from 'motion/react';
import { Send, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function WorkSubmission() {
  const { user, profile } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fileUrl: ''
  });

  useEffect(() => {
    if (profile?.admissionNumber) {
      const fetchSubmissions = async () => {
        try {
          const q = query(
            collection(db, 'workSubmissions'),
            where('studentAdmissionNumber', '==', profile.admissionNumber),
            orderBy('timestamp', 'desc')
          );
          const snap = await getDocs(q);
          setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubmissionType)));
        } catch (error) {
          console.error('Error fetching submissions:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchSubmissions();
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.admissionNumber) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'workSubmissions'), {
        studentAdmissionNumber: profile.admissionNumber,
        title: formData.title,
        description: formData.description,
        fileUrl: formData.fileUrl,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      
      setFormData({ title: '', description: '', fileUrl: '' });
      // Refresh list
      const q = query(
        collection(db, 'workSubmissions'),
        where('studentAdmissionNumber', '==', profile.admissionNumber),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubmissionType)));
      
      alert('Work submitted successfully!');
    } catch (error) {
      console.error('Error submitting work:', error);
      alert('Failed to submit work.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Submission Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Send className="text-emerald-600" />
            Submit Your Work
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Arabic Calligraphy, IT Project"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                required
                rows={4}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Briefly describe your work..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File Link (Drive/Cloud)</label>
              <input
                type="url"
                required
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.fileUrl}
                onChange={e => setFormData({ ...formData, fileUrl: e.target.value })}
                placeholder="https://drive.google.com/..."
              />
              <p className="text-xs text-gray-500 mt-1">Provide a link to your work (PDF, Image, Video, etc.)</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Work'}
            </button>
          </form>
        </motion.div>

        {/* Previous Submissions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="text-emerald-600" />
            Your Submissions
          </h2>
          {submissions.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500">
              No submissions yet. Start by submitting your work!
            </div>
          ) : (
            submissions.map(sub => (
              <div key={sub.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900">{sub.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 ${
                    sub.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    sub.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {sub.status === 'approved' ? <CheckCircle size={12} /> :
                     sub.status === 'rejected' ? <XCircle size={12} /> :
                     <Clock size={12} />}
                    {sub.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{sub.description}</p>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-bold hover:underline">
                    View File
                  </a>
                  {sub.pointsAwarded && (
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-bold">
                      +{sub.pointsAwarded} Points
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}
