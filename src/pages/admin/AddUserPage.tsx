import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { UserRole } from '../../types';
import { Button } from '../../components/Button';
import { ImageUpload } from '../../components/ImageUpload';
import { Card } from '../../components/Card';
import { CLASS_LIST } from '../../constants';

export default function AddUserPage() {
  const [newUserPhoto, setNewUserPhoto] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const role = selectedRole;
    const displayName = formData.get('displayName') as string;

    try {
      // First, create the user in Firebase Auth via our server API
      const password = 'password123'; // Default password for new users
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName,
          role
        })
      });

      const result = await response.json();
      if (!response.ok) {
        let errorMsg = result.error || 'Failed to create user in Auth';
        if (errorMsg.includes('identitytoolkit.googleapis.com') || errorMsg.includes('Identity Toolkit API')) {
          errorMsg = `Firebase Authentication (Identity Toolkit API) is not enabled. 
          
1. Enable it: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=531260372208
2. Click "Get Started" in Firebase Auth: https://console.firebase.google.com/project/gen-lang-client-0615445747/authentication
3. Wait 3-5 minutes.`;
        }
        throw new Error(errorMsg);
      }

      const uid = result.uid;
      const newUserRef = doc(db, 'users', uid);

      await setDoc(newUserRef, {
        uid,
        email: email || '',
        role,
        displayName,
        photoURL: newUserPhoto,
        createdAt: new Date().toISOString()
      });
      setStatus({ type: 'success', message: `User added successfully! Default password: ${password}` });
      e.currentTarget.reset();
      setNewUserPhoto('');
    } catch (error: any) {
      console.error('Error adding user:', error);
      setStatus({ type: 'error', message: 'Error adding user: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-3xl font-black text-stone-900 mb-6">Add User</h2>
      <Card className="p-6 max-w-2xl">
        {status && (
          <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-bold ${status.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
            {status.message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <ImageUpload
            label="Profile Photo (Optional)"
            onUpload={setNewUserPhoto}
            currentImageUrl={newUserPhoto}
          />
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Display Name</label>
            <input name="displayName" type="text" required className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Email (Optional)</label>
            <input name="email" type="email" className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Role</label>
            <select 
              name="role" 
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            >
              <option value="student">Student</option>
              <option value="staff">Staff</option>
              <option value="safa">Safa</option>
              <option value="academic">Academic</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add User'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
