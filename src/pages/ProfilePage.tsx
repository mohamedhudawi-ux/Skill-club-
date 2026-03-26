import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ImageUpload } from '../components/ImageUpload';
import { User, Mail, Shield, Camera, CheckCircle2, AlertCircle, Settings, Phone, MapPin, Calendar, Users, BookOpen, Hash } from 'lucide-react';
import { CLASS_LIST } from '../constants';


export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  
  // Student & Staff specific fields
  const [studentClass, setStudentClass] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [dob, setDob] = useState(profile?.dob || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [admissionNumber, setAdmissionNumber] = useState(profile?.admissionNumber || '');

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (profile?.role === 'student' && profile?.admissionNumber) {
        try {
          const studentDoc = await getDoc(doc(db, 'students', profile.admissionNumber));
          if (studentDoc.exists()) {
            const data = studentDoc.data();
            setStudentClass(data.class || '');
            setFatherName(data.fatherName || '');
            setDob(data.dob || profile?.dob || '');
            setAddress(data.address || profile?.address || '');
            setPhone(data.phone || profile?.phone || '');
            setAdmissionNumber(data.admissionNumber || profile.admissionNumber);
            if (data.name) setDisplayName(data.name);
            if (data.photoURL) setPhotoURL(data.photoURL);
          }
        } catch (error) {
          console.error("Error fetching student data:", error);
        }
      }
    };

    fetchStudentData();
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setStatus(null);

    try {
      // Update Firebase Auth - only update photoURL if it's not a long base64 string
      // Firebase Auth photoURL has a limit of ~2048 characters
      const isBase64 = photoURL.startsWith('data:');
      const authUpdate: any = { displayName };
      if (!isBase64 || photoURL.length < 2000) {
        authUpdate.photoURL = photoURL;
      }

      await updateProfile(user, authUpdate);

      // Update Firestore - Firestore has a 1MB limit, so base64 is fine here
      const userRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userRef, {
          displayName,
          photoURL,
          phone,
          dob,
          address,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }

      // If student, also update the students collection
      if (profile?.role === 'student' && profile?.admissionNumber) {
        const studentRef = doc(db, 'students', profile.admissionNumber);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          try {
            await updateDoc(studentRef, {
              photoURL,
              name: displayName,
              class: studentClass,
              fatherName,
              dob,
              address,
              phone
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `students/${profile.admissionNumber}`);
          }
        }
      }

      setStatus({ type: 'success', msg: 'Profile updated successfully!' });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      let message = 'Failed to update profile. Please try again.';
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.error.includes('insufficient permissions')) {
          message = 'Permission denied. You are not allowed to update this profile.';
        }
      } catch (e) {
        // Not a JSON error
      }
      setStatus({ type: 'error', msg: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-stone-900 tracking-tight">My Profile</h1>
          <p className="text-stone-500 font-medium">Manage your personal information and account settings.</p>
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="font-bold text-sm">{status.msg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <Card className="lg:col-span-1 p-8 flex flex-col items-center text-center space-y-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-stone-100 bg-stone-50 flex items-center justify-center shadow-xl">
              {photoURL ? (
                <img src={photoURL} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={48} className="text-stone-300" />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 p-2 bg-emerald-600 text-white rounded-full shadow-lg">
              <Camera size={16} />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-stone-900">{profile?.displayName || 'User'}</h2>
            <p className="text-sm text-stone-500 font-medium flex items-center justify-center gap-1">
              <Mail size={14} /> {profile?.email}
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-[10px] font-black uppercase tracking-wider mt-2">
              <Shield size={10} /> {profile?.role}
            </div>
          </div>

          <div className="w-full pt-6 border-t border-stone-100 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Joined</p>
              <p className="text-sm font-bold text-stone-700">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Status</p>
              <p className="text-sm font-bold text-emerald-600">Active</p>
            </div>
          </div>
        </Card>

        {/* Edit Form */}
        <Card className="lg:col-span-2 p-8">
          <form onSubmit={handleUpdateProfile} className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                Edit Profile Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-stone-500 uppercase tracking-widest ml-1">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-stone-200 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-stone-50/50 font-bold transition-all"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-stone-500 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-stone-200 bg-stone-100 text-stone-400 font-bold cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-stone-400 ml-1 font-medium italic">Email cannot be changed as it is linked to your Google account.</p>
                </div>

                {profile?.role === 'student' && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-stone-500 uppercase tracking-widest ml-1">Admission Number</label>
                      <div className="relative">
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                        <input
                          type="text"
                          value={admissionNumber}
                          disabled
                          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-stone-200 bg-stone-100 text-stone-400 font-bold cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-black text-stone-500 uppercase tracking-widest ml-1">Class</label>
                      <div className="relative">
                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <select
                          value={studentClass}
                          onChange={(e) => setStudentClass(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-stone-200 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-stone-50/50 font-bold transition-all"
                        >
                          <option value="">Select Class</option>
                          {CLASS_LIST.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-black text-stone-500 uppercase tracking-widest ml-1">Father's Name</label>
                      <div className="relative">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <input
                          type="text"
                          value={fatherName}
                          onChange={(e) => setFatherName(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-stone-200 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-stone-50/50 font-bold transition-all"
                          placeholder="Father's Name"
                        />
                      </div>
                    </div>
                  </>
                )}

                {(profile?.role === 'student' || profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'safa' || profile?.role === 'academic') && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-stone-500 uppercase tracking-widest ml-1">Date of Birth</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-stone-200 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-stone-50/50 font-bold transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-black text-stone-500 uppercase tracking-widest ml-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-stone-200 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-stone-50/50 font-bold transition-all"
                          placeholder="Phone Number"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-xs font-black text-stone-500 uppercase tracking-widest ml-1">Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-4 text-stone-400" size={18} />
                        <textarea
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-stone-200 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-stone-50/50 font-bold transition-all min-h-[100px]"
                          placeholder="Full Address"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-stone-500 uppercase tracking-widest ml-1">Profile Picture</label>
                <ImageUpload
                  label="Upload Profile Photo"
                  onUpload={(base64) => setPhotoURL(base64)}
                  currentImageUrl={photoURL}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-stone-100 flex justify-end">
              <Button
                type="submit"
                loading={loading}
                className="px-8 py-4 rounded-2xl shadow-lg shadow-emerald-600/20"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
