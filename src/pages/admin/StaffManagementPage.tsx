import React, { useState } from 'react';
import { collection, getDocs, query, where, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserProfile, UserRole } from '../../types';
import { CLASS_LIST } from '../../constants';
import { Trash2, Edit2, Plus, Lock, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ImageUpload } from '../../components/ImageUpload';

export default function StaffManagementPage() {
  const [staff, setStaff] = React.useState<UserProfile[]>([]);
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
  const [newStaffData, setNewStaffData] = useState({ name: '', email: '', photoURL: '', phone: '' });
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  React.useEffect(() => {
    const fetchStaff = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['staff', 'academic', 'safa'])));
        setStaff(snap.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile)));
      } catch (error) {
        console.error('Error fetching staff:', error);
      }
    };
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setStatus(null);
    try {
      const password = 'password123'; // Default password
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newStaffData.email,
          password,
          name: newStaffData.name,
          role: 'staff'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create staff in Auth');
      }

      const uid = result.uid;
      const newStaffRef = doc(db, 'users', uid);
      
      await setDoc(newStaffRef, {
        uid,
        email: newStaffData.email,
        displayName: newStaffData.name,
        photoURL: newStaffData.photoURL,
        phone: newStaffData.phone,
        role: 'staff',
        createdAt: new Date().toISOString()
      });
      
      setStatus({ type: 'success', msg: `Staff ${newStaffData.name} created successfully! Default password: password123` });
      setNewStaffData({ name: '', email: '', photoURL: '', phone: '' });
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Failed to create staff.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setIsUpdating(true);
    try {
      const staffRef = doc(db, 'users', editingStaff.uid);
      await setDoc(staffRef, {
        displayName: editingStaff.displayName,
        photoURL: editingStaff.photoURL,
        phone: editingStaff.phone,
        role: editingStaff.role
      }, { merge: true });

      // Update Auth profile
      const authResponse = await fetch('/api/admin/update-user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: editingStaff.uid,
          displayName: editingStaff.displayName,
          photoURL: editingStaff.photoURL
        })
      });

      if (!authResponse.ok) {
        const result = await authResponse.json();
        let errorMsg = result.error || 'Failed to update Auth profile';
        if (errorMsg.includes('identitytoolkit.googleapis.com') || errorMsg.includes('Identity Toolkit API')) {
          errorMsg = `Firebase Authentication (Identity Toolkit API) is not enabled. 
          
1. Enable it: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=531260372208
2. Click "Get Started" in Firebase Auth: https://console.firebase.google.com/project/gen-lang-client-0615445747/authentication
3. Wait 3-5 minutes.`;
        }
        throw new Error(errorMsg);
      }

      setStatus({ type: 'success', msg: `Staff ${editingStaff.displayName} updated successfully!` });
      setEditingStaff(null);
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message || 'Failed to update staff.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: deleteConfirm })
      });

      if (!response.ok) {
        const result = await response.json();
        let errorMsg = result.error || 'Failed to delete user from Auth';
        if (errorMsg.includes('identitytoolkit.googleapis.com') || errorMsg.includes('Identity Toolkit API')) {
          errorMsg = `Firebase Authentication (Identity Toolkit API) is not enabled. 
          
1. Enable it: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=531260372208
2. Click "Get Started" in Firebase Auth: https://console.firebase.google.com/project/gen-lang-client-0615445747/authentication
3. Wait 3-5 minutes.`;
        }
        throw new Error(errorMsg);
      }

      await deleteDoc(doc(db, 'users', deleteConfirm));
      setStatus({ type: 'success', msg: 'Staff member deleted successfully.' });
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('Failed to delete staff:', error);
      setStatus({ type: 'error', msg: error.message || 'Failed to delete staff.' });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-stone-900">Manage Staff</h2>
      
      {status && (
        <div className={`p-4 rounded-xl text-sm font-bold ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {status.msg}
        </div>
      )}

      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Add New Staff</h3>
        <form onSubmit={handleCreateStaff} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input placeholder="Name" value={newStaffData.name} onChange={e => setNewStaffData({...newStaffData, name: e.target.value})} className="px-4 py-2 rounded-xl border" required />
          <input type="email" placeholder="Email" value={newStaffData.email} onChange={e => setNewStaffData({...newStaffData, email: e.target.value})} className="px-4 py-2 rounded-xl border" required />
          <input placeholder="Phone" value={newStaffData.phone} onChange={e => setNewStaffData({...newStaffData, phone: e.target.value})} className="px-4 py-2 rounded-xl border" />
          <ImageUpload
            label="Staff Photo"
            onUpload={(base64) => setNewStaffData({...newStaffData, photoURL: base64})}
            currentImageUrl={newStaffData.photoURL}
          />
          <Button type="submit" disabled={isCreating} className="md:col-span-5">
            {isCreating ? 'Creating...' : <><Plus size={18} /> Add Staff</>}
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-100">
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Staff Member</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Phone</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {staff.map((member) => (
              <tr key={member.uid} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={member.photoURL || `https://ui-avatars.com/api/?name=${member.displayName}&background=random`} className="w-8 h-8 rounded-full" alt="" />
                    <span className="font-bold text-stone-900">{member.displayName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-stone-500">{member.phone}</td>
                <td className="px-6 py-4 text-sm text-stone-500">{member.email}</td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <Button 
                    variant="secondary" 
                    className="p-2"
                    onClick={() => setEditingStaff(member)}
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button variant="danger" className="p-2" onClick={() => setDeleteConfirm(member.uid)}>
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {editingStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="p-8 max-w-md w-full shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <h3 className="text-2xl font-bold text-stone-900">Edit Staff Member</h3>
              <Button variant="ghost" onClick={() => setEditingStaff(null)} className="p-2 hover:bg-stone-100 rounded-full">
                <X size={24} />
              </Button>
            </div>
            <div className="overflow-y-auto pr-2 custom-scrollbar">
              <form onSubmit={handleUpdateStaff} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Display Name</label>
                  <input 
                    type="text"
                    value={editingStaff.displayName || ''}
                    onChange={e => setEditingStaff({ ...editingStaff, displayName: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Phone</label>
                  <input 
                    type="text"
                    value={editingStaff.phone || ''}
                    onChange={e => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Role</label>
                  <select 
                    value={editingStaff.role}
                    onChange={e => setEditingStaff({ ...editingStaff, role: e.target.value as UserRole })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="staff">Staff</option>
                    <option value="academic">Academic</option>
                    <option value="safa">Safa</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <ImageUpload
                    label="Update Photo"
                    onUpload={(base64) => setEditingStaff({ ...editingStaff, photoURL: base64 })}
                    currentImageUrl={editingStaff.photoURL}
                  />
                </div>
                <Button type="submit" disabled={isUpdating} className="w-full">
                  {isUpdating ? 'Updating...' : 'Save Changes'}
                </Button>
              </form>
            </div>
          </Card>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Staff Member"
        message="Are you sure you want to delete this staff member? This action cannot be undone."
        confirmText="Delete Staff"
        variant="danger"
      />
    </div>
  );
}
