import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { Student, GraceMarkApplication } from '../types';
import { CLASS_LIST } from '../constants';
import { Card } from './Card';
import { Button } from './Button';
import { FileText, Send, CheckCircle, AlertCircle, X, Award, Info, Lock } from 'lucide-react';

interface Props {
  student: Student;
  initialData?: GraceMarkApplication;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function GraceMarkApplicationForm({ student, initialData, onSuccess, onCancel }: Props) {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingTotal, setExistingTotal] = useState(0);
  const [formData, setFormData] = useState({
    marksObtained: initialData?.marksObtained?.toString() || '',
    marksToAdd: initialData?.marksToAdd?.toString() || '',
    subject: initialData?.subject || '',
    reason: initialData?.reason || '',
    class: initialData?.class || student.class || ''
  });

  const isOpen = settings?.graceMarksOpen === true;

  useEffect(() => {
    if (profile?.uid) {
      const fetchExisting = async () => {
        try {
          const q = query(
            collection(db, 'graceMarkApplications'),
            where('studentUid', '==', profile.uid),
            where('status', 'in', ['pending', 'approved'])
          );
          const snap = await getDocs(q);
          const total = snap.docs.reduce((acc, doc) => {
            // If editing, don't count the current application's marks in the total check
            if (initialData && doc.id === initialData.id) return acc;
            return acc + (doc.data().marksToAdd || 0);
          }, 0);
          setExistingTotal(total);
        } catch (error) {
          console.error('Error fetching existing grace marks:', error);
        }
      };
      fetchExisting();
    }
  }, [profile?.uid, initialData?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !isOpen) return;

    const marksToAdd = Number(formData.marksToAdd);
    const pointsRequired = marksToAdd * 100;

    if (student.totalPoints < pointsRequired) {
      alert(`Insufficient points. You need ${pointsRequired} points for ${marksToAdd} grace marks, but you only have ${student.totalPoints} points.`);
      return;
    }

    if (existingTotal + marksToAdd > 5) {
      alert(`Total grace marks cannot exceed 5. You have already applied for ${existingTotal} marks.`);
      return;
    }

    setLoading(true);
    try {
      const data = {
        studentUid: profile.uid,
        studentName: student.name,
        admissionNumber: student.admissionNumber,
        class: formData.class,
        subject: formData.subject,
        marksObtained: Number(formData.marksObtained),
        marksToAdd: marksToAdd,
        reason: formData.reason,
        status: initialData ? initialData.status : 'pending',
        timestamp: initialData ? initialData.timestamp : serverTimestamp()
      };

      if (initialData?.id) {
        await updateDoc(doc(db, 'graceMarkApplications', initialData.id), data);
      } else {
        await addDoc(collection(db, 'graceMarkApplications'), data);
      }

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error applying for grace marks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-stone-900">Application Submitted!</h3>
        <p className="text-stone-500 text-sm">Your request for grace marks has been sent to the academic department for review.</p>
        <Button onClick={() => setSubmitted(false)} variant="outline" className="mt-4">
          Apply Again
        </Button>
      </Card>
    );
  }

  if (isOpen === false) {
    return (
      <Card className="p-8 text-center space-y-4 border-amber-100 bg-amber-50/30">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <Lock size={32} />
        </div>
        <h3 className="text-xl font-bold text-stone-900 uppercase tracking-tight">Applications Closed</h3>
        <p className="text-stone-500 text-sm max-w-sm mx-auto">
          Grace marks applications are currently closed. Please check the academic calendar or contact the department for more information.
        </p>
      </Card>
    );
  }

  const maxPossibleMarks = Math.min(5 - existingTotal, Math.floor(student.totalPoints / 100));

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 bg-emerald-50 border-emerald-100">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-2xl text-emerald-600 shadow-sm">
              <Award size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Your Balance</p>
              <p className="text-2xl font-black text-emerald-900">{student.totalPoints} <span className="text-sm font-bold text-emerald-700/60">Points</span></p>
              <p className="text-xs text-emerald-700 font-medium mt-1">
                Eligible for up to <span className="font-bold">{Math.floor(student.totalPoints / 100)}</span> grace marks
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-blue-50 border-blue-100">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm">
              <Info size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">Application Status</p>
              <p className="text-2xl font-black text-blue-900">{existingTotal} / 5 <span className="text-sm font-bold text-blue-700/60">Marks</span></p>
              <p className="text-xs text-blue-700 font-medium mt-1">
                You can apply for <span className="font-bold">{Math.max(0, 5 - existingTotal)}</span> more marks
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-stone-100 text-stone-600 rounded-2xl">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-stone-900 uppercase tracking-tight">New Application</h3>
            <p className="text-xs text-stone-500 font-bold uppercase tracking-widest">Academic Year 2025-26</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Subject Name</label>
              <input
                type="text"
                required
                className="w-full px-5 py-3 rounded-[1.25rem] border-2 border-stone-100 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                placeholder="e.g. Arabic Literature"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Class / Semester</label>
              <select
                required
                className="w-full px-5 py-3 rounded-[1.25rem] border-2 border-stone-100 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              >
                <option value="">Select Class</option>
                {CLASS_LIST.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Current Marks Obtained</label>
              <input
                type="number"
                required
                min="0"
                max="100"
                className="w-full px-5 py-3 rounded-[1.25rem] border-2 border-stone-100 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                placeholder="0-100"
                value={formData.marksObtained}
                onChange={(e) => setFormData({ ...formData, marksObtained: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Grace Marks Requested</label>
              <input
                type="number"
                required
                min="1"
                max={maxPossibleMarks || 5}
                className="w-full px-5 py-3 rounded-[1.25rem] border-2 border-stone-100 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                placeholder={`Max ${maxPossibleMarks || 5}`}
                value={formData.marksToAdd}
                onChange={(e) => setFormData({ ...formData, marksToAdd: e.target.value })}
              />
              <p className="text-[10px] text-stone-400 font-medium ml-1">
                Will cost <span className="font-bold text-emerald-600">{Number(formData.marksToAdd) * 100 || 0}</span> reward points
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest ml-1">Reason for Application</label>
            <textarea
              required
              className="w-full px-5 py-4 rounded-[1.5rem] border-2 border-stone-100 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium min-h-[120px] resize-none"
              placeholder="Explain why you are requesting grace marks for this subject..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            />
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={loading || maxPossibleMarks <= 0} 
              className="w-full py-5 rounded-[1.5rem] flex items-center justify-center gap-3 text-lg font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
            >
              {loading ? 'Processing...' : <><Send size={20} /> Submit Application</>}
            </Button>
            {maxPossibleMarks <= 0 && (
              <p className="text-center text-red-500 text-xs font-bold mt-4 uppercase tracking-tight">
                You do not have enough points or have reached the limit.
              </p>
            )}
          </div>
        </form>
      </Card>

      {/* Rules Card */}
      <Card className="p-6 bg-stone-50 border-stone-100">
        <h4 className="text-xs font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Info size={14} className="text-emerald-600" /> Conversion Rules
        </h4>
        <ul className="space-y-2">
          <li className="text-xs text-stone-600 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            100 Reward Points = 1 Grace Mark
          </li>
          <li className="text-xs text-stone-600 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Maximum 5 Grace Marks allowed per academic year
          </li>
          <li className="text-xs text-stone-600 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Points will be deducted only after application approval
          </li>
        </ul>
      </Card>
    </div>
  );
}
