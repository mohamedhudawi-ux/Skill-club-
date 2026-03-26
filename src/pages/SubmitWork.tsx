import React, { useState, useEffect } from 'react';
import { doc, getDoc, getDocs, collection, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { Student, WorkSubmission } from '../types';
import { WorkSubmissionForm } from '../components/WorkSubmissionForm';
import { Card } from '../components/Card';
import { FileText, Edit2, Trash2, PlusCircle, X } from 'lucide-react';
import { Button } from '../components/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import { safeToDate } from '../utils/date';

export default function SubmitWork() {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const [student, setStudent] = useState<Student | null>(null);
  const [submissions, setSubmissions] = useState<WorkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState<WorkSubmission | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const workSubmissionsEnabled = settings?.workSubmissionsEnabled !== false;

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.admissionNumber) {
        setLoading(false);
        return;
      }

      try {
        const studentDoc = await getDoc(doc(db, 'students', profile.admissionNumber));
        if (studentDoc.exists()) {
          setStudent({ admissionNumber: studentDoc.id, ...studentDoc.data() } as Student);
        }

        const qSubmissions = query(
          collection(db, 'workSubmissions'),
          where('studentUid', '==', profile.uid),
          orderBy('timestamp', 'desc')
        );
        const subSnap = await getDocs(qSubmissions);
        setSubmissions(subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkSubmission)));
      } catch (error) {
        console.error('Error fetching submissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    try {
      await deleteDoc(doc(db, 'workSubmissions', showDeleteConfirm));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting submission:', error);
    }
  };

  if (loading) return <div className="p-8 text-center text-stone-500">Loading...</div>;

  if (!student) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card className="p-8 text-center text-stone-500">
          Student profile not found.
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">My Submissions</h1>
            <p className="text-stone-500">View and manage your submitted work</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowForm(true)} 
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
          disabled={!workSubmissionsEnabled}
        >
          <PlusCircle size={18} /> {workSubmissionsEnabled ? 'New Submission' : 'Submission Closed'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {submissions.length > 0 ? (
          submissions.map((sub) => (
            <Card key={sub.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h4 className="text-lg font-bold text-stone-900">{sub.title}</h4>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    sub.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    sub.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {sub.status}
                  </span>
                </div>
                <p className="text-sm text-stone-500 line-clamp-2">{sub.description}</p>
                <div className="flex flex-wrap gap-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                  <span>{sub.category}</span>
                  <span>•</span>
                  <span>{safeToDate(sub.timestamp)?.toLocaleDateString()}</span>
                </div>
              </div>
              
              {sub.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setEditingSubmission(sub)}
                    className="p-3 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(sub.id)}
                    className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </Card>
          ))
        ) : (
          <Card className="p-12 text-center text-stone-400 italic">
            No submissions found. Click "New Submission" to get started!
          </Card>
        )}
      </div>

      {/* Submission Form Modal */}
      {(showForm || editingSubmission) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="bg-white rounded-[2.5rem] p-8 relative">
              <button 
                onClick={() => {
                  setShowForm(false);
                  setEditingSubmission(null);
                }}
                className="absolute top-6 right-6 p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-black text-stone-900 mb-6">
                {editingSubmission ? 'Edit Submission' : 'New Submission'}
              </h2>
              <WorkSubmissionForm 
                student={student} 
                initialData={editingSubmission || undefined}
                onSuccess={() => {
                  setShowForm(false);
                  setEditingSubmission(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Confirm Deletion"
        message="Are you sure you want to delete this submission? This action cannot be undone."
      />
    </div>
  );
}
