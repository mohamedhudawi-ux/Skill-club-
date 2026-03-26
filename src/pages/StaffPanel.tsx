import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, addDoc, getDoc, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { Student } from '../types';
import { 
  BarChart3, 
  Users, 
  ClipboardList, 
  GraduationCap, 
  Image as ImageIcon, 
  Calendar as CalendarIcon, 
  User, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Camera,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import { ImageUpload } from '../components/ImageUpload';
import { StaffDashboard } from '../components/StaffDashboard';
import AcademicPanel from './AcademicPanel';
import StudentManagementPage from './admin/StudentManagementPage';

type Tab = 'dashboard' | 'directory' | 'academic' | 'students' | 'gallery' | 'calendar' | 'profile';

export default function StaffPanel() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  const [gallery, setGallery] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ coll: string, id: string, title: string, message: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'gallery') {
          const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'), limit(50));
          const snap = await getDocs(q);
          setGallery(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }

        if (activeTab === 'calendar') {
          const q = query(collection(db, 'calendar'), orderBy('date', 'desc'), limit(50));
          const snap = await getDocs(q);
          setCalendar(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }

        if (activeTab === 'directory') {
          const q = query(collection(db, 'students'), limit(100));
          const snap = await getDocs(q);
          setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
        }
      } catch (error) {
        console.error('Error fetching staff panel data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  const handleDelete = async (coll: string, id: string) => {
    try {
      await deleteDoc(doc(db, coll, id));
      setStatus({ type: 'success', msg: 'Deleted successfully!' });
      setConfirmDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      setStatus({ type: 'error', msg: 'Failed to delete.' });
    }
  };

  const menuGroups = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'profile', label: 'My Profile', icon: User },
      ]
    },
    {
      title: 'Academics',
      items: [
        { id: 'academic', label: 'Academic Panel', icon: GraduationCap },
        { id: 'directory', label: 'Student Directory', icon: Users },
        { id: 'students', label: 'Student Management', icon: ClipboardList },
      ]
    },
    {
      title: 'Content',
      items: [
        { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
        { id: 'gallery', label: 'Gallery', icon: ImageIcon },
      ]
    }
  ];

  const renderStudentDirectory = () => (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-stone-900">Student Directory</h3>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-100">
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Student</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Adm No</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Class</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {students.filter(s => !(s as any).deleted).map((student) => (
              <tr key={student.admissionNumber} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={student.photoURL || `https://ui-avatars.com/api/?name=${student.name}&background=random`} className="w-8 h-8 rounded-full" alt="" />
                    <span className="font-bold text-stone-900">{student.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-stone-500">{student.admissionNumber}</td>
                <td className="px-6 py-4 text-sm text-stone-500">{student.class}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );

  const renderGallery = () => (
    <div className="space-y-8">
      <div className="p-8 bg-stone-50 rounded-3xl border border-stone-100 shadow-inner">
        <h3 className="text-sm font-black uppercase tracking-widest text-stone-900 mb-6 flex items-center gap-2">
          <Plus size={16} className="text-emerald-600" /> Add Gallery Image
        </h3>
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const title = formData.get('title') as string;
            const url = formData.get('url') as string;
            try {
              setLoading(true);
              await addDoc(collection(db, 'gallery'), { title, url, createdAt: new Date().toISOString() });
              setStatus({ type: 'success', msg: 'Image added to gallery!' });
              (e.target as HTMLFormElement).reset();
            } catch (error) {
              setStatus({ type: 'error', msg: 'Failed to add image.' });
            } finally {
              setLoading(false);
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="space-y-4">
            <input name="title" placeholder="Image Title" className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500" required />
            <input name="url" id="galleryUrlInput" placeholder="Image URL" className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500" required />
          </div>
          <div className="p-6 bg-white rounded-2xl border-2 border-dashed border-stone-200 hover:border-emerald-300 transition-colors">
            <ImageUpload 
              label="Upload Image"
              onUpload={(url) => {
                const input = document.getElementById('galleryUrlInput') as HTMLInputElement;
                if (input) input.value = url;
              }} 
            />
          </div>
          <Button type="submit" className="md:col-span-2">Add to Gallery</Button>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {gallery.map(img => (
          <div key={img.id} className="relative group aspect-square rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
            <img src={img.url} alt={img.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
              <p className="text-white text-xs font-bold mb-2">{img.title}</p>
              <Button 
                variant="danger" 
                size="sm"
                onClick={() => setConfirmDelete({
                  coll: 'gallery',
                  id: img.id!,
                  title: 'Delete Image?',
                  message: 'Are you sure you want to delete this image?'
                })}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCalendar = () => (
    <div className="space-y-8">
      <div className="p-8 bg-stone-50 rounded-3xl border border-stone-100 shadow-inner">
        <h3 className="text-sm font-black uppercase tracking-widest text-stone-900 mb-6 flex items-center gap-2">
          <CalendarIcon size={16} className="text-emerald-600" /> Add Calendar Event
        </h3>
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const title = formData.get('title') as string;
            const date = formData.get('date') as string;
            const type = formData.get('type') as string;
            try {
              setLoading(true);
              await addDoc(collection(db, 'calendar'), { title, date, type, createdAt: new Date().toISOString() });
              setStatus({ type: 'success', msg: 'Event added to calendar!' });
              (e.target as HTMLFormElement).reset();
            } catch (error) {
              setStatus({ type: 'error', msg: 'Failed to add event.' });
            } finally {
              setLoading(false);
            }
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <input name="title" placeholder="Event Title" className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500" required />
          <input name="date" type="date" className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500" required />
          <select name="type" className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white" required>
            <option value="exam">Examination</option>
            <option value="holiday">Holiday</option>
            <option value="event">Event</option>
            <option value="other">Other</option>
          </select>
          <Button type="submit" className="md:col-span-3">Add Event</Button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {calendar.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(event => (
          <div key={event.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-stone-100 hover:shadow-md transition-all group">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              event.type === 'exam' ? 'bg-rose-100 text-rose-600' :
              event.type === 'holiday' ? 'bg-emerald-100 text-emerald-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              <CalendarIcon size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-stone-900 truncate">{event.title}</h4>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{new Date(event.date).toLocaleDateString()}</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{event.type}</p>
            </div>
            <Button 
              variant="danger" 
              size="sm"
              onClick={() => setConfirmDelete({
                coll: 'calendar',
                id: event.id!,
                title: 'Delete Event?',
                message: `Are you sure you want to delete ${event.title}?`
              })}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfile = () => {
    if (!profile) return null;
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-8">
        <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <User size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-900">My Profile Settings</h3>
              <p className="text-sm text-stone-500">Update your personal information and photo</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-6 mb-10">
            <div className="relative group">
              <img 
                src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName || 'User'}&background=random`} 
                className="w-32 h-32 rounded-full object-cover border-4 border-emerald-50 shadow-lg"
                alt="Profile"
              />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="text-white" size={24} />
              </div>
            </div>
            <div className="text-center">
              <h4 className="text-lg font-bold text-stone-900">{profile.displayName || 'Unnamed Staff'}</h4>
              <p className="text-sm text-stone-500">{profile.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                {profile.role}
              </span>
            </div>
          </div>

          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get('displayName') as string;
              const photo = formData.get('photoURL') as string;
              
              try {
                setLoading(true);
                await updateDoc(doc(db, 'users', profile.uid), {
                  displayName: name,
                  photoURL: photo
                });

                await fetch('/api/admin/update-user-profile', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    uid: profile.uid, 
                    displayName: name,
                    photoURL: photo
                  })
                });

                setStatus({ type: 'success', msg: 'Profile updated successfully!' });
              } catch (error) {
                setStatus({ type: 'error', msg: 'Failed to update profile.' });
              } finally {
                setLoading(false);
              }
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase ml-1">Display Name</label>
              <input 
                name="displayName"
                defaultValue={profile.displayName || ''}
                placeholder="Your Full Name" 
                className="w-full px-6 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-stone-50" 
                required 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500 uppercase ml-1">Profile Photo URL</label>
              <div className="space-y-4">
                <input 
                  name="photoURL"
                  id="profilePhotoInput"
                  defaultValue={profile.photoURL || ''}
                  placeholder="https://example.com/photo.jpg" 
                  className="w-full px-6 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-stone-50" 
                />
                <div className="p-6 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 hover:border-emerald-300 transition-colors">
                  <p className="text-[10px] text-stone-400 mb-4 uppercase font-black tracking-widest text-center">Or Upload New Photo</p>
                  <ImageUpload 
                    label="Upload Photo"
                    onUpload={(url) => {
                      const input = document.getElementById('profilePhotoInput') as HTMLInputElement;
                      if (input) input.value = url;
                    }} 
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full py-4 text-sm">Save Profile Changes</Button>
          </form>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 space-y-4">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-stone-500 font-bold animate-pulse">Loading Staff Dashboard...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-stone-200 flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-black text-stone-900 tracking-tight">Staff Portal</h2>
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Safa English School</p>
        </div>
        <nav className="px-4 pb-6 space-y-8">
          {menuGroups.map((group, idx) => (
            <div key={idx}>
              <h3 className="px-4 text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">{group.title}</h3>
              <div className="space-y-1">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as Tab)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                      activeTab === item.id 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                    }`}
                  >
                    <item.icon size={18} className={activeTab === item.id ? 'text-emerald-600' : 'text-stone-400'} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-3xl font-black text-stone-900 tracking-tight capitalize">
                {activeTab.replace('-', ' ')}
              </h1>
              <p className="text-sm font-medium text-stone-500 mt-1">
                Manage your {activeTab.replace('-', ' ')} settings and configurations.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-stone-900">{profile?.displayName || 'Staff'}</p>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{profile?.role}</p>
              </div>
              <img 
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}&background=random`} 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                alt=""
              />
              <Button variant="secondary" onClick={() => { signOut(auth); navigate('/login'); }} className="p-2 ml-2">
                <LogOut size={16} />
              </Button>
            </div>
          </div>

          {status && (
            <div className={`mb-8 flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold animate-in fade-in slide-in-from-top-4 ${
              status.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              {status.msg}
              <button onClick={() => setStatus(null)} className="ml-auto opacity-50 hover:opacity-100"><X size={16} /></button>
            </div>
          )}

          {/* Content */}
          {activeTab === 'dashboard' && <StaffDashboard />}
          {activeTab === 'directory' && renderStudentDirectory()}
          {activeTab === 'academic' && <AcademicPanel />}
          {activeTab === 'students' && <StudentManagementPage />}
          {activeTab === 'gallery' && renderGallery()}
          {activeTab === 'calendar' && renderCalendar()}
          {activeTab === 'profile' && renderProfile()}
        </div>
      </main>

      {confirmDelete && (
        <ConfirmModal
          isOpen={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete.coll, confirmDelete.id)}
          title={confirmDelete.title}
          message={confirmDelete.message}
        />
      )}
    </div>
  );
}
