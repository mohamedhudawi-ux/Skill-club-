import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, runTransaction, serverTimestamp, where, getDocs, addDoc, writeBatch, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { GraceMarkApplication, Student } from '../types';
import { Card } from './Card';
import { Button } from './Button';
import { ConfirmModal } from './ConfirmModal';
import { CheckCircle, XCircle, Clock, FileText, Edit2 } from 'lucide-react';
import { EditPointsModal } from './EditPointsModal';
import { safeToDate } from '../utils/date';

export function AdminGraceMarks() {
  const { profile, isStaff } = useAuth();
  const [applications, setApplications] = useState<GraceMarkApplication[]>([]);
  const [studentPoints, setStudentPoints] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingApplication, setEditingApplication] = useState<GraceMarkApplication | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'graceMarkApplications'), orderBy('timestamp', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        const apps: GraceMarkApplication[] = [];
        const admissionNumbers = new Set<string>();
        
        snapshot.forEach((doc) => {
          const data = doc.data() as GraceMarkApplication;
          apps.push({ id: doc.id, ...data });
          admissionNumbers.add(data.admissionNumber);
        });
        
        setApplications(apps);
        
        // Fetch points for these students
        if (admissionNumbers.size > 0) {
          const pointsMap: Record<string, number> = {};
          const adms = Array.from(admissionNumbers);
          
          // Fetch in chunks of 30 due to Firestore 'in' query limit
          for (let i = 0; i < adms.length; i += 30) {
            const chunk = adms.slice(i, i + 30);
            const studentSnap = await getDocs(query(collection(db, 'students'), where('admissionNumber', 'in', chunk)));
            studentSnap.forEach(doc => {
              pointsMap[doc.data().admissionNumber] = doc.data().totalPoints || 0;
            });
          }
          setStudentPoints(pointsMap);
        }
      } catch (error) {
        console.error('Error fetching grace marks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAction = async (application: GraceMarkApplication, action: 'approved' | 'rejected') => {
    if (!application.id) return;
    
    if (action === 'approved' && application.marksToAdd < 0) {
      setStatus({ type: 'error', msg: 'Marks cannot be negative.' });
      return;
    }
    
    setProcessingId(application.id);
    setStatus(null);
    try {
      // Fetch user reference outside transaction
      const usersQuery = query(collection(db, 'users'), where('admissionNumber', '==', application.admissionNumber));
      const userDocs = await getDocs(usersQuery);
      const userRef = !userDocs.empty ? doc(db, 'users', userDocs.docs[0].id) : null;

      await runTransaction(db, async (transaction) => {
        const appRef = doc(db, 'graceMarkApplications', application.id!);
        const appDoc = await transaction.get(appRef);
        if (!appDoc.exists()) throw new Error('Application not found');
        if (appDoc.data().status !== 'pending') throw new Error('Already processed');

        let studentDoc = null;
        if (action === 'approved') {
          const studentRef = doc(db, 'students', application.admissionNumber);
          studentDoc = await transaction.get(studentRef);
          if (!studentDoc.exists()) throw new Error('Student not found');

          const studentData = studentDoc.data() as Student;
          const pointsNeeded = application.marksToAdd * 100;
          const currentPoints = studentData.totalPoints || 0;

          if (currentPoints < pointsNeeded) {
            throw new Error(`Insufficient points. Student has ${currentPoints} but needs ${pointsNeeded}.`);
          }

          // Deduct points
          transaction.update(studentRef, {
            totalPoints: currentPoints - pointsNeeded
          });

          // Update user profile if exists
          if (userRef) {
            transaction.update(userRef, {
              totalPoints: currentPoints - pointsNeeded
            });
          }
        }

        // Update application status
        transaction.update(appRef, {
          status: action,
          reviewedBy: profile?.uid || 'admin',
          reviewedAt: serverTimestamp()
        });
      });

      // Add notification outside transaction
      await addDoc(collection(db, 'notifications'), {
        recipientUid: application.studentUid,
        title: `Grace Marks ${action === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your application for ${application.marksToAdd} grace marks has been ${action}.`,
        timestamp: serverTimestamp(),
        read: false
      });

      setStatus({ type: 'success', msg: `Application ${action} successfully.` });
      
      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === application.id 
          ? { 
              ...app, 
              status: action, 
              reviewedAt: new Date(),
              reviewedBy: profile?.uid || 'admin'
            } 
          : app
      ));

      if (action === 'approved') {
        const pointsNeeded = application.marksToAdd * 100;
        setStudentPoints(prev => ({
          ...prev,
          [application.admissionNumber]: (prev[application.admissionNumber] || 0) - pointsNeeded
        }));
      }
    } catch (error: any) {
      console.error('Error processing application:', error);
      setStatus({ type: 'error', msg: error.message || 'Failed to process application.' });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-stone-500">Loading applications...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-stone-900">Grace Mark Applications</h3>
        {isStaff && <Button variant="danger" onClick={() => setShowClearConfirm(true)}>Clear All Applications</Button>}
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
        {applications.length === 0 ? (
          <div className="p-8 text-center text-stone-500 bg-stone-50 rounded-2xl border border-stone-100">
            No applications found.
          </div>
        ) : (
          applications.map((app) => (
            <Card key={app.id} className="p-6">
              <div className="flex flex-col md:flex-row gap-6 justify-between">
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-stone-900">{app.studentName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-emerald-700">{app.admissionNumber}</span>
                        <span className="text-stone-300">•</span>
                        <span className="text-sm text-stone-500">Class: {app.class}</span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                      app.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {app.status === 'approved' && <CheckCircle size={14} />}
                      {app.status === 'rejected' && <XCircle size={14} />}
                      {app.status === 'pending' && <Clock size={14} />}
                      {app.status}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-100">
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Subject</p>
                      <p className="text-lg font-black text-stone-900">{app.subject}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Marks Obtained</p>
                      <p className="text-lg font-black text-stone-900">{app.marksObtained}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Marks Needed</p>
                      <p className="text-lg font-black text-emerald-600">+{app.marksToAdd}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Current Points</p>
                      <p className="text-lg font-black text-blue-600">{studentPoints[app.admissionNumber] || 0}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Reason for Grace Marks</p>
                    <p className="text-stone-600 text-sm whitespace-pre-wrap italic">"{app.reason}"</p>
                  </div>
                  
                  <div className="text-xs text-stone-400">
                    Applied on: {safeToDate(app.timestamp)?.toLocaleString()}
                  </div>
                </div>

                {app.status === 'approved' && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditingApplication(app)}
                      className="p-3 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                )}
                {app.status === 'pending' && (
                  <div className="flex flex-col gap-3 min-w-[150px] justify-center">
                    <Button 
                      onClick={() => handleAction(app, 'approved')}
                      disabled={processingId === app.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white py-2"
                    >
                      Approve
                    </Button>
                    <Button 
                      onClick={() => handleAction(app, 'rejected')}
                      disabled={processingId === app.id}
                      variant="danger"
                      className="py-2"
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {editingApplication && (
        <EditPointsModal
          isOpen={!!editingApplication}
          onClose={() => setEditingApplication(null)}
          onConfirm={async (newMarks) => {
            if (newMarks < 0) {
              setStatus({ type: 'error', msg: 'Marks cannot be negative.' });
              return;
            }
            try {
              const appRef = doc(db, 'graceMarkApplications', editingApplication.id!);
              const studentRef = doc(db, 'students', editingApplication.admissionNumber);
              const usersQuery = query(collection(db, 'users'), where('admissionNumber', '==', editingApplication.admissionNumber));
              const userDocs = await getDocs(usersQuery);
              const userRef = !userDocs.empty ? doc(db, 'users', userDocs.docs[0].id) : null;
              
              const diff = (newMarks - editingApplication.marksToAdd) * 100;
              
              await runTransaction(db, async (transaction) => {
                const appDoc = await transaction.get(appRef);
                const studentDoc = await transaction.get(studentRef);
                const userDoc = userRef ? await transaction.get(userRef) : null;
                
                if (!appDoc.exists()) throw new Error('Application not found');

                transaction.update(appRef, { marksToAdd: newMarks });
                
                if (studentDoc.exists()) {
                  const studentData = studentDoc.data() as Student;
                  transaction.update(studentRef, {
                    totalPoints: (studentData.totalPoints || 0) - diff
                  });
                }
                
                if (userRef && userDoc && userDoc.exists()) {
                  transaction.update(userRef, {
                    totalPoints: (userDoc.data()?.totalPoints || 0) - diff
                  });
                }
              });
              
              // Update local state
              setApplications(prev => prev.map(app => 
                app.id === editingApplication.id 
                  ? { ...app, marksToAdd: newMarks } 
                  : app
              ));
              setStudentPoints(prev => ({
                ...prev,
                [editingApplication.admissionNumber]: (prev[editingApplication.admissionNumber] || 0) - diff
              }));

              setEditingApplication(null);
              setStatus({ type: 'success', msg: 'Grace marks updated successfully.' });
              setTimeout(() => setStatus(null), 3000);
            } catch (error) {
              console.error('Error updating grace marks:', error);
              setStatus({ type: 'error', msg: 'Failed to update grace marks.' });
            }
          }}
          title="Edit Grace Marks"
          initialPoints={editingApplication.marksToAdd}
          label="New Marks to Add"
        />
      )}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={async () => {
          try {
            const batch = writeBatch(db);
            applications.forEach(app => batch.delete(doc(db, 'graceMarkApplications', app.id!)));
            await batch.commit();
            
            // Update local state
            setApplications([]);

            setShowClearConfirm(false);
            setStatus({ type: 'success', msg: 'All applications cleared.' });
            setTimeout(() => setStatus(null), 3000);
          } catch (error) {
            console.error('Error clearing applications:', error);
            setStatus({ type: 'error', msg: 'Failed to clear applications.' });
          }
        }}
        title="Clear All Applications"
        message="Are you sure you want to clear all applications? This action cannot be undone."
      />
    </div>
  );
}
