import React, { useState, useEffect } from 'react';
import { doc, getDoc, getDocs, collection, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Student, GraceMarkApplication } from '../types';
import { GraceMarkApplicationForm } from '../components/GraceMarkApplicationForm';
import { Card } from '../components/Card';
import { Award, ChevronLeft, Edit2, Trash2, PlusCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import { safeToDate } from '../utils/date';

export default function GraceMarks() {
  const { profile } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [graceMarks, setGraceMarks] = useState<GraceMarkApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGraceMark, setEditingGraceMark] = useState<GraceMarkApplication | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

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

        const qGraceMarks = query(
          collection(db, 'graceMarkApplications'),
          where('studentUid', '==', profile.uid),
          orderBy('timestamp', 'desc')
        );
        const graceSnap = await getDocs(qGraceMarks);
        setGraceMarks(graceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GraceMarkApplication)));
      } catch (error) {
        console.error('Error fetching grace marks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    try {
      await deleteDoc(doc(db, 'graceMarkApplications', showDeleteConfirm));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting grace mark application:', error);
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
            <Award size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">My Applications</h1>
            <p className="text-stone-500">View and manage your grace mark applications</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowForm(true)} 
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
        >
          <PlusCircle size={18} /> New Application
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {graceMarks.length > 0 ? (
          graceMarks.map((gm) => (
            <Card key={gm.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h4 className="text-lg font-bold text-stone-900">{gm.subject}</h4>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    gm.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    gm.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {gm.status}
                  </span>
                </div>
                <p className="text-sm text-stone-500">Requested: <span className="font-bold text-stone-900">{gm.marksToAdd} Marks</span></p>
                <div className="flex flex-wrap gap-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                  <span>Obtained: {gm.marksObtained}</span>
                  <span>•</span>
                  <span>{safeToDate(gm.timestamp)?.toLocaleDateString()}</span>
                </div>
              </div>

              {gm.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setEditingGraceMark(gm)}
                    className="p-3 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(gm.id!)}
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
            No applications found. Click "New Application" to get started!
          </Card>
        )}
      </div>

      {/* Application Form Modal */}
      {(showForm || editingGraceMark) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-white rounded-[2.5rem] p-8 relative">
              <button 
                onClick={() => {
                  setShowForm(false);
                  setEditingGraceMark(null);
                }}
                className="absolute top-6 right-6 p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-black text-stone-900 mb-6">
                {editingGraceMark ? 'Edit Application' : 'New Application'}
              </h2>
              <GraceMarkApplicationForm 
                student={student} 
                initialData={editingGraceMark || undefined}
                onSuccess={() => {
                  setShowForm(false);
                  setEditingGraceMark(null);
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
        message="Are you sure you want to delete this application? This action cannot be undone."
      />
    </div>
  );
}
