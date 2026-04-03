import React, { useState } from 'react';
import { collection, getDocs, query, where, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserProfile, UserRole } from '../../types';
import { CLASS_LIST } from '../../constants';
import { Trash2, Edit2, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ImageUpload } from '../../components/ImageUpload';
import { addStaffMembers } from '../../addStaff';

export default function StaffDirectoryPage() {
  const [staff, setStaff] = React.useState<UserProfile[]>([]);
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStaff = staff.filter(s => 
    s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setIsUpdating(true);
    try {
      const staffRef = doc(db, 'users', editingStaff.uid);
      await setDoc(staffRef, {
        displayName: editingStaff.displayName,
        photoURL: editingStaff.photoURL || null,
        phone: editingStaff.phone || null,
        dob: editingStaff.dob || null,
        address: editingStaff.address || null,
        role: editingStaff.role
      }, { merge: true });

      // Update Auth profile - only send photoURL if it's not a long base64 string
      const isBase64 = editingStaff.photoURL && editingStaff.photoURL.startsWith('data:');
      const authUpdate: any = {
        uid: editingStaff.uid,
        displayName: editingStaff.displayName
      };
      if (editingStaff.photoURL && (!isBase64 || editingStaff.photoURL.length < 2000)) {
        authUpdate.photoURL = editingStaff.photoURL;
      }

      const authResponse = await fetch('/api/admin/update-user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authUpdate)
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
      setDeleteConfirm(null);
      setStatus({ type: 'success', msg: 'Staff member deleted successfully.' });
    } catch (error: any) {
      console.error('Failed to delete staff:', error);
      setStatus({ type: 'error', msg: error.message || 'Failed to delete staff.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-stone-900">Staff Directory</h2>
      </div>
      
      {status && (
        <div className={`px-4 py-2 rounded-xl text-sm font-bold ${
          status.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
        }`}>
          {status.msg}
        </div>
      )}

      <input 
        placeholder="Search staff by name, email, or role..." 
        value={searchTerm} 
        onChange={e => setSearchTerm(e.target.value)} 
        className="w-full px-4 py-3 rounded-xl border" 
      />

      <Card className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-100">
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Staff Member</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Phone</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {filteredStaff.map((member) => (
              <tr key={member.uid} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={member.photoURL || `https://ui-avatars.com/api/?name=${member.displayName}&background=random`} className="w-8 h-8 rounded-full" alt="" />
                    <span className="font-bold text-stone-900">{member.displayName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-stone-500">{member.phone}</td>
                <td className="px-6 py-4 text-sm text-stone-500">{member.email}</td>
                <td className="px-6 py-4 text-sm text-stone-500 capitalize">{member.role}</td>
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
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Date of Birth</label>
                  <input 
                    type="date"
                    value={editingStaff.dob || ''}
                    onChange={e => setEditingStaff({ ...editingStaff, dob: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Address</label>
                  <textarea 
                    value={editingStaff.address || ''}
                    onChange={e => setEditingStaff({ ...editingStaff, address: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none min-h-[80px]"
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
