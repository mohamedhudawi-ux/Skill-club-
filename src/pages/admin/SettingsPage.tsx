import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, writeBatch, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Moon } from 'lucide-react';
import { useSettings } from '../../SettingsContext';

export default function SettingsPage() {
  const { settings, siteContent, refreshContent } = useSettings();
  const [maintenance, setMaintenance] = useState(false);
  const [registration, setRegistration] = useState(true);
  const [publicScoreboardEnabled, setPublicScoreboardEnabled] = useState(true);
  const [graceMarksOpen, setGraceMarksOpen] = useState(false);
  const [workSubmissionsEnabled, setWorkSubmissionsEnabled] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ coll: string, id: string } | null>(null);
  const [content, setContent] = useState<any[]>([]);

  useEffect(() => {
    if (settings) {
      setMaintenance(settings.maintenanceMode || false);
      setRegistration(settings.registrationEnabled !== false);
      setPublicScoreboardEnabled(settings.publicScoreboardEnabled !== false);
      setGraceMarksOpen(settings.graceMarksOpen || false);
      setWorkSubmissionsEnabled(settings.workSubmissionsEnabled !== false);
    }
    if (siteContent.length > 0) {
      setContent(siteContent);
    }
  }, [settings, siteContent]);

  const handleUpdateSetting = async (key: string, value: any) => {
    try {
      await setDoc(doc(db, 'settings', 'system'), { [key]: value }, { merge: true });
      await refreshContent(true);
      
      setStatus({ type: 'success', msg: 'Setting updated successfully!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Error updating setting:', error);
      setStatus({ type: 'error', msg: 'Failed to update setting.' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleUpdateContent = async (key: string, value: string) => {
    try {
      const existing = content.find(c => c.key === key);
      if (existing) {
        await setDoc(doc(db, 'siteContent', existing.id), { value }, { merge: true });
      } else {
        await addDoc(collection(db, 'siteContent'), { key, value });
      }
      await refreshContent(true);
      setStatus({ type: 'success', msg: 'Content updated successfully!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Error updating content:', error);
      setStatus({ type: 'error', msg: 'Failed to update content.' });
    }
  };

  const handleResetPortal = async () => {
    try {
      const collections = ['users', 'students', 'staff', 'clubs', 'boards', 'siteContent', 'programs', 'gallery', 'skillClubEntries'];
      const batch = writeBatch(db);
      
      for (const coll of collections) {
        const snapshot = await getDocs(collection(db, coll));
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }
      
      await batch.commit();
      setStatus({ type: 'success', msg: 'Portal reset successfully!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to reset portal.' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-stone-900">System Settings</h2>
        {status && (
          <div className={`px-4 py-2 rounded-xl text-sm font-bold ${
            status.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}>
            {status.msg}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h4 className="font-bold text-stone-900 border-b border-stone-100 pb-2">Hijri Calendar Adjustment</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Hijri Date Offset (Days)</label>
              <div className="flex items-center gap-4">
                <select 
                  className="flex-1 px-4 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50 font-bold"
                  value={content.find(c => c.key === 'hijri_offset')?.value || '0'}
                  onChange={e => handleUpdateContent('hijri_offset', e.target.value)}
                >
                  <option value="-2">-2 Days</option>
                  <option value="-1">-1 Day</option>
                  <option value="0">No Offset (Default)</option>
                  <option value="1">+1 Day</option>
                  <option value="2">+2 Days</option>
                </select>
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-700">
                  <Moon size={20} />
                </div>
              </div>
              <p className="text-[10px] text-stone-400 mt-2 italic">Adjust this if the Hijri date is off by a day due to moon sighting.</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h4 className="font-bold text-stone-900 border-b border-stone-100 pb-2">Portal Access</h4>
          <div className="flex items-center justify-between p-4 border border-stone-100 rounded-2xl">
            <div>
              <p className="font-bold">Enable Registration</p>
              <p className="text-xs text-stone-500">Allow new students to register via Google Login.</p>
            </div>
            <Button 
              variant="ghost"
              onClick={() => {
                setRegistration(!registration);
                handleUpdateSetting('registrationEnabled', !registration);
              }}
              className={`w-12 h-6 rounded-full relative transition-colors p-0 ${registration ? 'bg-emerald-600' : 'bg-stone-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${registration ? 'right-1' : 'left-1'}`} />
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 border border-stone-100 rounded-2xl">
            <div>
              <p className="font-bold">Maintenance Mode</p>
              <p className="text-xs text-stone-500">Disable all user access except for Admins.</p>
            </div>
            <Button 
              variant="ghost"
              onClick={() => {
                setMaintenance(!maintenance);
                handleUpdateSetting('maintenanceMode', !maintenance);
              }}
              className={`w-12 h-6 rounded-full relative transition-colors p-0 ${maintenance ? 'bg-emerald-600' : 'bg-stone-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${maintenance ? 'right-1' : 'left-1'}`} />
            </Button>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h4 className="font-bold text-stone-900 border-b border-stone-100 pb-2">Feature Controls</h4>
          <div className="flex items-center justify-between p-4 border border-stone-100 rounded-2xl">
            <div>
              <p className="font-bold">Public Scoreboard</p>
              <p className="text-xs text-stone-500">Show scoreboard to all logged-in users.</p>
            </div>
            <Button 
              variant="ghost"
              onClick={() => {
                setPublicScoreboardEnabled(!publicScoreboardEnabled);
                handleUpdateSetting('publicScoreboardEnabled', !publicScoreboardEnabled);
              }}
              className={`w-12 h-6 rounded-full relative transition-colors p-0 ${publicScoreboardEnabled ? 'bg-emerald-600' : 'bg-stone-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${publicScoreboardEnabled ? 'right-1' : 'left-1'}`} />
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-stone-100 rounded-2xl">
            <div>
              <p className="font-bold">Student Work Submissions</p>
              <p className="text-xs text-stone-500">Allow students to submit work for SkillClub points.</p>
            </div>
            <Button 
              variant="ghost"
              onClick={() => {
                setWorkSubmissionsEnabled(!workSubmissionsEnabled);
                handleUpdateSetting('workSubmissionsEnabled', !workSubmissionsEnabled);
              }}
              className={`w-12 h-6 rounded-full relative transition-colors p-0 ${workSubmissionsEnabled ? 'bg-emerald-600' : 'bg-stone-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${workSubmissionsEnabled ? 'right-1' : 'left-1'}`} />
            </Button>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h4 className="font-bold text-stone-900 border-b border-stone-100 pb-2">Grace Marks Settings</h4>
          <div className="flex items-center justify-between p-4 border border-stone-100 rounded-2xl">
            <div>
              <p className="font-bold">Open Grace Marks Applications</p>
              <p className="text-xs text-stone-500">Allow students to apply for grace marks conversion.</p>
            </div>
            <Button 
              variant="ghost"
              onClick={() => {
                setGraceMarksOpen(!graceMarksOpen);
                handleUpdateSetting('graceMarksOpen', !graceMarksOpen);
              }}
              className={`w-12 h-6 rounded-full relative transition-colors p-0 ${graceMarksOpen ? 'bg-emerald-600' : 'bg-stone-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${graceMarksOpen ? 'right-1' : 'left-1'}`} />
            </Button>
          </div>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-xs font-bold text-amber-800 uppercase mb-2">Conversion Rule</p>
            <p className="text-sm text-amber-900 font-medium">
              100 reward points = 1 Grace Mark<br/>
              Maximum 500 points = 5 Grace Marks
            </p>
          </div>
        </Card>
      </div>

      <div className="pt-8 border-t border-stone-100">
        <div className="bg-red-50 p-8 rounded-[2rem] border border-red-100">
          <h3 className="text-red-800 font-black text-xl mb-2">Danger Zone</h3>
          <p className="text-red-600 text-sm mb-6 font-medium">Resetting the portal will permanently delete all users, clubs, boards, and content. This action is irreversible.</p>
          <Button 
            variant="danger"
            onClick={() => setConfirmDelete({
              coll: 'portal_reset',
              id: 'all',
            })}
          >
            Factory Reset Portal
          </Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Reset Portal"
        message="Are you absolutely sure you want to reset the portal? This will permanently delete all data and cannot be undone."
        onConfirm={() => {
          if (confirmDelete) {
            handleResetPortal();
            setConfirmDelete(null);
          }
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
