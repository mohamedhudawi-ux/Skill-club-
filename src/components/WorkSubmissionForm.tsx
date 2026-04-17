import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { Student, SKILL_CLUB_CATEGORIES, SkillClubCategory, SKILL_CLUB_RULES, WorkSubmission } from '../types';
import { Card } from './Card';
import { Button } from './Button';
import { FileText, Send, CheckCircle, Upload, Link as LinkIcon, AlertCircle, X } from 'lucide-react';
import { FileUpload } from './FileUpload';

interface Props {
  student: Student;
  initialData?: WorkSubmission;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function WorkSubmissionForm({ student, initialData, onSuccess, onCancel }: Props) {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    category: initialData?.category || SKILL_CLUB_CATEGORIES[0],
    subCategory: initialData?.subCategory || '',
    language: initialData?.language || '',
    description: initialData?.description || '',
    fileUrl: initialData?.fileUrl || '',
    link: initialData?.link || ''
  });

  const isEnabled = settings?.workSubmissionsEnabled !== false;
  const currentRules = SKILL_CLUB_RULES.find(r => r.category === formData.category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !isEnabled) return;

    setLoading(true);
    try {
      const data = {
        studentUid: profile.uid,
        studentName: student.name,
        admissionNumber: student.admissionNumber,
        category: formData.category,
        subCategory: formData.subCategory,
        title: formData.title,
        language: formData.language,
        description: formData.description,
        fileUrl: formData.fileUrl,
        link: formData.link,
        status: initialData ? initialData.status : 'pending',
        timestamp: initialData ? initialData.timestamp : serverTimestamp()
      };

      if (initialData?.id) {
        await updateDoc(doc(db, 'workSubmissions', initialData.id), data);
      } else {
        await addDoc(collection(db, 'workSubmissions'), data);
      }
      
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error submitting work:', error);
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
        <h3 className="text-xl font-bold text-stone-900">Work Submitted!</h3>
        <p className="text-stone-500 text-sm">Your work has been submitted for review. You will receive points once it's approved by the admin.</p>
        <Button onClick={() => setSubmitted(false)} variant="outline" className="mt-4">
          Submit More Work
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
          <Upload size={20} />
        </div>
        <h3 className="text-xl font-bold text-stone-900">Submit Your Work</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Title of Work</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Arabic Calligraphy Project"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Language (Optional)</label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Arabic, English, Urdu"
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Category</label>
            <select
              className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.category}
              onChange={(e) => {
                const newCat = e.target.value as SkillClubCategory;
                const rules = SKILL_CLUB_RULES.find(r => r.category === newCat);
                setFormData({ 
                  ...formData, 
                  category: newCat,
                  subCategory: rules ? rules.subCategories[0].name : ''
                });
              }}
            >
              {SKILL_CLUB_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Sub-Category</label>
            {currentRules ? (
              <select
                required
                className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                value={formData.subCategory}
                onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
              >
                <option value="">Select Sub-Category</option>
                {currentRules.subCategories.map(sub => (
                  <option key={sub.name} value={sub.name}>{sub.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Club Activity"
                value={formData.subCategory}
                onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Description</label>
          <textarea
            required
            className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px]"
            placeholder="Describe your work and why it deserves points..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Attach Proof (PDF/Image) - Optional</label>
            <FileUpload 
              label="Upload Proof (Optional)"
              onUpload={(url) => setFormData({ ...formData, fileUrl: url })}
              className="h-32"
              accept=".pdf,image/*"
              maxSizeMB={100}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">External Link (Optional)</label>
            <div className="relative">
              <LinkIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="url"
                className="w-full pl-12 pr-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="https://example.com/your-work"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full py-3 flex items-center justify-center gap-2">
          {loading ? 'Submitting...' : <><Send size={18} /> Submit Work</>}
        </Button>
      </form>
    </Card>
  );
}
