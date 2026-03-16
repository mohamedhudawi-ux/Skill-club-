import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { WorkSubmission, UserProfile, SKILL_CLUB_CATEGORIES } from '../types';
import { Upload, CheckCircle, XCircle, Clock, FileText, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  userProfile: UserProfile;
}

export const WorkSubmissions: React.FC<Props> = ({ userProfile }) => {
  const [submissions, setSubmissions] = useState<WorkSubmission[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let q;
    if (userProfile.role === 'student') {
      q = query(collection(db, 'workSubmissions'), where('studentAdmissionNumber', '==', userProfile.admissionNumber));
    } else {
      q = collection(db, 'workSubmissions');
    }

    const unsub = onSnapshot(q, (snapshot) => {
      setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkSubmission)));
    });
    return unsub;
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !fileUrl || !userProfile.admissionNumber) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'workSubmissions'), {
        studentAdmissionNumber: userProfile.admissionNumber,
        title,
        description,
        fileUrl,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      setTitle('');
      setDescription('');
      setFileUrl('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (submissionId: string, status: 'approved' | 'rejected', points?: number) => {
    await updateDoc(doc(db, 'workSubmissions', submissionId), {
      status,
      pointsAwarded: points || 0,
      reviewedBy: userProfile.uid
    });

    if (status === 'approved' && points) {
      // If approved, we should also add a SkillClubEntry
      const sub = submissions.find(s => s.id === submissionId);
      if (sub) {
        await addDoc(collection(db, 'skillClubEntries'), {
          studentAdmissionNumber: sub.studentAdmissionNumber,
          category: 'Social Works', // Default category for submissions
          points,
          description: `Approved work: ${sub.title}`,
          addedBy: userProfile.uid,
          timestamp: serverTimestamp()
        });
      }
    }
  };

  return (
    <div className="space-y-8">
      {userProfile.role === 'student' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            Submit Your Work
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Title of Work"
                className="px-4 py-2 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="File URL (Google Drive, Dropbox, etc.)"
                className="px-4 py-2 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                required
              />
            </div>
            <textarea
              placeholder="Description"
              className="w-full px-4 py-2 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Work'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          {userProfile.role === 'student' ? 'My Submissions' : 'Work Submissions to Review'}
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {submissions.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-black/10">
              <p className="text-gray-500 italic">No submissions found.</p>
            </div>
          )}
          {submissions.map((sub) => (
            <div key={sub.id} className="bg-white p-5 rounded-2xl shadow-sm border border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{sub.title}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    sub.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    sub.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {sub.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-2">{sub.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {sub.timestamp?.toDate().toLocaleDateString()}
                  </span>
                  <a 
                    href={sub.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-indigo-600 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View File
                  </a>
                  {userProfile.role !== 'student' && (
                    <span className="font-medium text-gray-600">Student: {sub.studentAdmissionNumber}</span>
                  )}
                </div>
              </div>

              {userProfile.role !== 'student' && sub.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-black/5">
                    <input 
                      type="number" 
                      placeholder="Pts" 
                      className="w-16 px-2 py-1 text-sm rounded-lg border border-black/10"
                      id={`pts-${sub.id}`}
                    />
                    <button 
                      onClick={() => {
                        const pts = (document.getElementById(`pts-${sub.id}`) as HTMLInputElement).value;
                        handleReview(sub.id, 'approved', parseInt(pts) || 0);
                      }}
                      className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleReview(sub.id, 'rejected')}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {sub.status === 'approved' && (
                <div className="text-right">
                  <span className="text-emerald-600 font-bold text-lg">+{sub.pointsAwarded} Pts</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
