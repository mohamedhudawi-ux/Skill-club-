import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, runTransaction, addDoc, serverTimestamp, writeBatch, limit, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { WorkSubmission, Student, SKILL_CLUB_RULES } from '../types';
import { Card } from './Card';
import { Button } from './Button';
import { ConfirmModal } from './ConfirmModal';
import { CheckCircle, XCircle, Clock, ExternalLink, Edit2, Download } from 'lucide-react';
import { EditPointsModal } from './EditPointsModal';

export function AdminSubmissions() {
  const { profile, isStaff, isAdmin } = useAuth();
  const [submissions, setSubmissions] = useState<WorkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [pointsToAward, setPointsToAward] = useState<Record<string, number>>({});
  const [editingSubmission, setEditingSubmission] = useState<WorkSubmission | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'workSubmissions'), orderBy('timestamp', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkSubmission)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'workSubmissions');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAction = async (submission: WorkSubmission, action: 'approved' | 'rejected') => {
    if (!submission.id) return;
    
    const points = pointsToAward[submission.id] || 0;
    if (action === 'approved' && points <= 0) {
      setStatus({ type: 'error', msg: 'Please enter valid points to award before approving.' });
      return;
    }

    if (action === 'approved') {
      const rule = SKILL_CLUB_RULES.find(r => r.category === submission.category);
      if (rule) {
        const subRule = rule.subCategories.find(s => s.name === submission.subCategory);
        if (subRule && points > subRule.points) {
          setStatus({ type: 'error', msg: `Points awarded (${points}) exceed the rule limit (${subRule.points}) for ${submission.subCategory || submission.category}.` });
          return;
        }
      }
    }

    setProcessingId(submission.id);
    setStatus(null);
    try {
      await runTransaction(db, async (transaction) => {
        const subRef = doc(db, 'workSubmissions', submission.id);
        const subDoc = await transaction.get(subRef);
        if (!subDoc.exists()) throw new Error('Submission not found');

        const currentStatus = subDoc.data().status;
        if (currentStatus !== 'pending') throw new Error('Already processed');

        let studentDoc = null;
        let userRef = null;
        if (action === 'approved') {
          const studentRef = doc(db, 'students', submission.admissionNumber);
          studentDoc = await transaction.get(studentRef);
          userRef = doc(db, 'users', submission.studentUid);
        }

        // Update submission
        transaction.update(subRef, {
          status: action,
          pointsAwarded: action === 'approved' ? points : 0,
          reviewedAt: new Date(),
          reviewedBy: profile?.uid || 'admin',
        });

        // If approved, update student points and category points
        if (action === 'approved' && studentDoc && studentDoc.exists()) {
          const studentData = studentDoc.data() as Student;
          const currentTotal = studentData.totalPoints || 0;
          const currentCatPoints = studentData.categoryPoints?.[submission.category] || 0;
          
          const studentRef = doc(db, 'students', submission.admissionNumber);
          transaction.update(studentRef, {
            totalPoints: currentTotal + points,
            [`categoryPoints.${submission.category}`]: currentCatPoints + points
          });
          
          // Also update the users collection
          if (userRef) {
            transaction.update(userRef, {
              totalPoints: currentTotal + points
            });
          }
        }
      });

      // Add notification outside transaction
      await addDoc(collection(db, 'notifications'), {
        recipientUid: submission.studentUid,
        title: `Work Submission ${action === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your work submission "${submission.title}" has been ${action}${action === 'approved' ? ` and you earned ${points} points` : ''}.`,
        timestamp: serverTimestamp(),
        read: false
      });

      setStatus({ type: 'success', msg: `Submission ${action} successfully.` });
      
      // Update local state
      setSubmissions(prev => prev.map(sub => 
        sub.id === submission.id 
          ? { 
              ...sub, 
              status: action, 
              pointsAwarded: action === 'approved' ? points : 0,
              reviewedAt: new Date(),
              reviewedBy: profile?.uid || 'admin'
            } 
          : sub
      ));
    } catch (error) {
      console.error('Error processing submission:', error);
      setStatus({ type: 'error', msg: 'Failed to process submission.' });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-stone-500">Loading submissions...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-stone-900">Student Work Submissions</h3>
        {isStaff && <Button variant="danger" onClick={() => setShowClearConfirm(true)}>Clear All Submissions</Button>}
      </div>
      
      {status && (
        <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${
          status.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
        }`}>
          {status.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          {status.msg}
        </div>
      )}

      <div className="grid gap-4">
        {submissions.length === 0 ? (
          <div className="p-8 text-center text-stone-500 bg-stone-50 rounded-2xl border border-stone-100">
            No submissions found.
          </div>
        ) : (
          submissions.map((sub) => (
            <Card key={sub.id} className="p-6">
              <div className="flex flex-col md:flex-row gap-6 justify-between">
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-stone-900">{sub.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-emerald-700">{sub.category}</span>
                        {sub.subCategory && (
                          <>
                            <span className="text-stone-300">•</span>
                            <span className="text-sm font-bold text-blue-600">{sub.subCategory}</span>
                          </>
                        )}
                        {sub.language && (
                          <>
                            <span className="text-stone-300">•</span>
                            <span className="text-sm font-bold text-amber-600">Language: {sub.language}</span>
                          </>
                        )}
                        <span className="text-stone-300">•</span>
                        <span className="text-sm text-stone-500">{sub.studentName} ({sub.admissionNumber})</span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                      sub.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      sub.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {sub.status === 'approved' && <CheckCircle size={14} />}
                      {sub.status === 'rejected' && <XCircle size={14} />}
                      {sub.status === 'pending' && <Clock size={14} />}
                      {sub.status}
                    </div>
                  </div>
                  
                  <p className="text-stone-600 text-sm whitespace-pre-wrap">{sub.description}</p>
                  
                  {sub.fileUrl && (
                    <div className="flex items-center gap-4">
                      <a 
                        href={sub.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        <ExternalLink size={16} /> View Attached File
                      </a>
                      <a 
                        href={sub.fileUrl} 
                        download
                        className="inline-flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-stone-700"
                      >
                        <Download size={16} /> Download
                      </a>
                    </div>
                  )}
                  
                  <div className="text-xs text-stone-400">
                    Submitted on: {sub.timestamp?.toDate().toLocaleString()}
                  </div>
                </div>

                {sub.status === 'pending' && isAdmin && (
                  <div className="flex flex-col gap-3 min-w-[200px] bg-stone-50 p-4 rounded-xl border border-stone-100">
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Award Points</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full px-3 py-2 rounded-lg border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="e.g. 50"
                        value={pointsToAward[sub.id] || ''}
                        onChange={(e) => setPointsToAward({ ...pointsToAward, [sub.id]: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleAction(sub, 'approved')}
                        disabled={processingId === sub.id}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2"
                      >
                        Approve
                      </Button>
                      <Button 
                        onClick={() => handleAction(sub, 'rejected')}
                        disabled={processingId === sub.id}
                        variant="danger"
                        className="flex-1 py-2"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
                
                {sub.status === 'approved' && sub.pointsAwarded && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center min-w-[150px] bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="text-center p-4">
                        <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Points Awarded</div>
                        <div className="text-3xl font-black text-emerald-700">+{sub.pointsAwarded}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setEditingSubmission(sub)}
                      className="p-3 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {editingSubmission && (
        <EditPointsModal
          isOpen={!!editingSubmission}
          onClose={() => setEditingSubmission(null)}
          onConfirm={async (newPoints, newStatus) => {
            if (newPoints < 0) {
              setStatus({ type: 'error', msg: 'Points cannot be negative.' });
              return;
            }
            try {
              const subRef = doc(db, 'workSubmissions', editingSubmission.id);
              const studentRef = doc(db, 'students', editingSubmission.admissionNumber);
              const userRef = doc(db, 'users', editingSubmission.studentUid);
              
              const oldPoints = editingSubmission.pointsAwarded || 0;
              const diff = newStatus === 'approved' ? newPoints - (editingSubmission.status === 'approved' ? oldPoints : 0) : -(editingSubmission.status === 'approved' ? oldPoints : 0);
              
              await runTransaction(db, async (transaction) => {
                const subDoc = await transaction.get(subRef);
                const studentDoc = await transaction.get(studentRef);
                const userDoc = userRef ? await transaction.get(userRef) : null;
                
                if (!subDoc.exists()) throw new Error('Submission not found');

                transaction.update(subRef, { 
                  pointsAwarded: newStatus === 'approved' ? newPoints : 0,
                  status: newStatus 
                });
                
                if (studentDoc.exists()) {
                  const studentData = studentDoc.data() as Student;
                  transaction.update(studentRef, {
                    totalPoints: (studentData.totalPoints || 0) + diff,
                    [`categoryPoints.${editingSubmission.category}`]: (studentData.categoryPoints?.[editingSubmission.category] || 0) + diff
                  });
                }
                
                if (userRef && userDoc && userDoc.exists()) {
                  transaction.update(userRef, {
                    totalPoints: (userDoc.data()?.totalPoints || 0) + diff
                  });
                }
              });
              
              // Update local state
              setSubmissions(prev => prev.map(sub => 
                sub.id === editingSubmission.id 
                  ? { 
                      ...sub, 
                      status: newStatus, 
                      pointsAwarded: newStatus === 'approved' ? newPoints : 0 
                    } 
                  : sub
              ));

              setEditingSubmission(null);
              setStatus({ type: 'success', msg: 'Submission updated successfully.' });
              setTimeout(() => setStatus(null), 3000);
            } catch (error) {
              console.error('Error updating submission:', error);
              setStatus({ type: 'error', msg: 'Failed to update submission.' });
            }
          }}
          title="Edit Awarded Points"
          initialPoints={editingSubmission.pointsAwarded || 0}
          initialStatus={editingSubmission.status as 'approved' | 'rejected'}
          label="New Points"
        />
      )}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={async () => {
          try {
            const batch = writeBatch(db);
            submissions.forEach(sub => batch.delete(doc(db, 'workSubmissions', sub.id)));
            await batch.commit();
            
            // Update local state
            setSubmissions([]);

            setShowClearConfirm(false);
            setStatus({ type: 'success', msg: 'All submissions cleared.' });
            setTimeout(() => setStatus(null), 3000);
          } catch (error) {
            console.error('Error clearing submissions:', error);
            setStatus({ type: 'error', msg: 'Failed to clear submissions.' });
          }
        }}
        title="Clear All Submissions"
        message="Are you sure you want to clear all submissions? This action cannot be undone."
      />
    </div>
  );
}
