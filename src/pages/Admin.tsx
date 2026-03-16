import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, UserRole, Club, Board, OfficeBearer, SiteContent } from '../types';
import { 
  Shield, 
  User, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Layout, 
  UserCircle, 
  Globe,
  Plus,
  Save,
  X,
  FileText,
  Edit2,
  Award,
  Send,
  Settings,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { WorkSubmissions } from '../components/WorkSubmissions';
import { ClubMember, BoardMember } from '../types';

type Tab = 'users' | 'clubs' | 'boards' | 'bearers' | 'content' | 'submissions' | 'club-points' | 'bulk' | 'grace' | 'students' | 'settings' | 'logos';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [bearers, setBearers] = useState<OfficeBearer[]>([]);
  const [content, setContent] = useState<SiteContent[]>([]);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Form states
  const [newClub, setNewClub] = useState({ name: '', description: '', logoUrl: '' });
  const [newBoard, setNewBoard] = useState({ name: '', description: '' });
  const [newBearer, setNewBearer] = useState({ name: '', position: '', photoUrl: '' });
  
  // Member management states
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [newMember, setNewMember] = useState({ name: '', position: '', photoUrl: '' });

  // Edit states
  const [editingEntity, setEditingEntity] = useState<{ type: 'club' | 'board' | 'bearer', id: string, data: any } | null>(null);

  useEffect(() => {
    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
      setUsers(snap.docs.map(doc => doc.data() as UserProfile));
    });
    const unsubClubs = onSnapshot(query(collection(db, 'clubs')), (snap) => {
      setClubs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));
    });
    const unsubBoards = onSnapshot(query(collection(db, 'boards')), (snap) => {
      setBoards(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board)));
    });
    const unsubBearers = onSnapshot(query(collection(db, 'officeBearers')), (snap) => {
      setBearers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OfficeBearer)));
    });
    const unsubContent = onSnapshot(query(collection(db, 'siteContent')), (snap) => {
      setContent(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SiteContent)));
    });
    const unsubClubMembers = onSnapshot(query(collection(db, 'clubMembers')), (snap) => {
      setClubMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubMember)));
    });
    const unsubBoardMembers = onSnapshot(query(collection(db, 'boardMembers')), (snap) => {
      setBoardMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BoardMember)));
      setLoading(false);
    });

    // Handle tab from URL
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') as Tab;
    if (tab) setActiveTab(tab);

    return () => {
      unsubUsers();
      unsubClubs();
      unsubBoards();
      unsubBearers();
      unsubContent();
      unsubClubMembers();
      unsubBoardMembers();
    };
  }, []);

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setStatus({ type: 'success', msg: 'User role updated!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to update role.' });
    }
  };

  const handleDelete = async (coll: string, id: string) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await deleteDoc(doc(db, coll, id));
      setStatus({ type: 'success', msg: 'Item deleted!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to delete.' });
    }
  };

  const handleAddClub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'clubs'), newClub);
      setNewClub({ name: '', description: '', logoUrl: '' });
      setStatus({ type: 'success', msg: 'Club added!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add club.' });
    }
  };

  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'boards'), newBoard);
      setNewBoard({ name: '', description: '' });
      setStatus({ type: 'success', msg: 'Board added!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add board.' });
    }
  };

  const handleAddBearer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'officeBearers'), newBearer);
      setNewBearer({ name: '', position: '', photoUrl: '' });
      setStatus({ type: 'success', msg: 'Office bearer added!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add office bearer.' });
    }
  };

  const handleUpdateContent = async (id: string, value: string) => {
    try {
      await updateDoc(doc(db, 'siteContent', id), { value });
      setStatus({ type: 'success', msg: 'Content updated!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to update content.' });
    }
  };

  const handleAddMember = async (e: React.FormEvent, type: 'club' | 'board') => {
    e.preventDefault();
    const parentId = type === 'club' ? selectedClub : selectedBoard;
    if (!parentId) return;

    try {
      const coll = type === 'club' ? 'clubMembers' : 'boardMembers';
      await addDoc(collection(db, coll), {
        ...newMember,
        [type === 'club' ? 'clubId' : 'boardId']: parentId
      });
      setNewMember({ name: '', position: '', photoUrl: '' });
      setStatus({ type: 'success', msg: 'Member added!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add member.' });
    }
  };

  const handleUpdateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntity) return;

    try {
      const coll = editingEntity.type === 'club' ? 'clubs' : 
                   editingEntity.type === 'board' ? 'boards' : 'officeBearers';
      await updateDoc(doc(db, coll, editingEntity.id), editingEntity.data);
      setEditingEntity(null);
      setStatus({ type: 'success', msg: 'Updated successfully!' });
    } catch (error) {
      setStatus({ type: 'error', msg: 'Update failed.' });
    }
  };

  const handleResetPortal = async () => {
    if (!window.confirm('WARNING: This will delete ALL data (users, clubs, boards, etc.) and reset the portal. This cannot be undone. Are you absolutely sure?')) return;
    if (!window.confirm('FINAL WARNING: Are you REALLY sure? Only your current admin account will be preserved.')) return;

    setLoading(true);
    try {
      const collectionsToClear = [
        'users', 'clubs', 'boards', 'officeBearers', 'clubMembers', 
        'boardMembers', 'siteContent', 'submissions', 'clubPoints', 'graceMarks'
      ];

      for (const collName of collectionsToClear) {
        const snap = await getDocs(collection(db, collName));
        for (const docSnap of snap.docs) {
          // Don't delete the current user
          if (collName === 'users' && docSnap.id === profile?.uid) continue;
          await deleteDoc(doc(db, collName, docSnap.id));
        }
      }

      setStatus({ type: 'success', msg: 'Portal reset successfully!' });
    } catch (error) {
      console.error('Reset failed:', error);
      setStatus({ type: 'error', msg: 'Failed to reset portal.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddContent = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = (e.target as any).key.value;
    const value = (e.target as any).value.value;
    try {
      await addDoc(collection(db, 'siteContent'), { key, value });
      setStatus({ type: 'success', msg: 'Content key added!' });
      (e.target as any).reset();
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add content key.' });
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Admin Panel...</div>;

  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-stone-900">Admin Panel</h2>
          <p className="text-stone-500">System-wide management and configuration.</p>
        </div>
        {status && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-4 ${
            status.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}>
            {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {status.msg}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-px">
        {[
          { id: 'users', name: 'Users', icon: User },
          { id: 'clubs', name: 'Clubs', icon: Users },
          { id: 'boards', name: 'Boards', icon: Layout },
          { id: 'bearers', name: 'Office Bearers', icon: UserCircle },
          { id: 'content', name: 'Site Content', icon: Globe },
          { id: 'submissions', name: 'Submissions', icon: FileText },
          { id: 'club-points', name: 'Club Points', icon: Award },
          { id: 'bulk', name: 'Bulk Upload', icon: Send },
          { id: 'grace', name: 'Grace Marks', icon: Plus },
          { id: 'students', name: 'Manage Students', icon: Users },
          { id: 'logos', name: 'Manage Logos', icon: ImageIcon },
          { id: 'settings', name: 'Settings', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-t-xl transition-all ${
              activeTab === tab.id 
                ? 'bg-white border-x border-t border-stone-200 text-emerald-700 -mb-px' 
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <tab.icon size={16} />
            {tab.name}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        {activeTab === 'users' && (
          <div className="space-y-8">
            {/* Add User Form */}
            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
              <h3 className="text-sm font-black uppercase tracking-widest text-stone-900 mb-4">Add New User</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const email = (e.target as any).email.value;
                const role = (e.target as any).role.value;
                const name = (e.target as any).name.value;
                try {
                  // Since we can't create Auth accounts for others easily, 
                  // we'll add to a 'pendingUsers' collection or just create the profile.
                  // If they sign up with this email, they'll get this role.
                  await setDoc(doc(db, 'users', `manual_${Date.now()}`), {
                    email,
                    role,
                    displayName: name,
                    uid: `manual_${Date.now()}`,
                    createdAt: new Date().toISOString()
                  });
                  setStatus({ type: 'success', msg: 'User added to database!' });
                  (e.target as any).reset();
                } catch (err) {
                  setStatus({ type: 'error', msg: 'Failed to add user.' });
                }
              }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input name="name" placeholder="Full Name" className="px-4 py-2 rounded-xl border border-stone-200" required />
                <input name="email" type="email" placeholder="Email Address" className="px-4 py-2 rounded-xl border border-stone-200" required />
                <select name="role" className="px-4 py-2 rounded-xl border border-stone-200 bg-white">
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="safa">Safa</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="submit" className="bg-brand-green text-white px-6 py-2 rounded-xl font-bold">Add User</button>
              </form>
              <p className="text-[10px] text-stone-400 mt-2 italic">* Users added here must still register with the same email to log in.</p>
            </div>

            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">User</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {users.map((user) => (
                  <tr key={user.uid} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`} className="w-8 h-8 rounded-full" alt="" />
                        <span className="font-bold text-stone-900">{user.displayName || 'Unnamed User'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-500">{user.email}</td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                        className="bg-stone-100 border-none text-xs font-bold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none capitalize"
                      >
                        <option value="student">Student</option>
                        <option value="staff">Staff</option>
                        <option value="safa">Safa</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete('users', user.uid)} className="text-red-400 hover:text-red-600 p-2">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

        {activeTab === 'clubs' && (
          <div className="space-y-8">
            <form onSubmit={handleAddClub} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-stone-50 p-6 rounded-2xl border border-stone-100">
              <input 
                placeholder="Club Name" 
                className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                value={newClub.name}
                onChange={e => setNewClub({...newClub, name: e.target.value})}
                required
              />
              <input 
                placeholder="Logo URL" 
                className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                value={newClub.logoUrl}
                onChange={e => setNewClub({...newClub, logoUrl: e.target.value})}
              />
              <textarea 
                placeholder="Description" 
                className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 md:col-span-2"
                value={newClub.description}
                onChange={e => setNewClub({...newClub, description: e.target.value})}
                required
              />
              <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700">
                <Plus size={18} /> Add Club
              </button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clubs.map(club => (
                <div key={club.id} className="flex flex-col p-4 border border-stone-100 rounded-2xl hover:bg-stone-50 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 overflow-hidden">
                        {club.logoUrl ? <img src={club.logoUrl} alt="" className="w-full h-full object-cover" /> : <Users size={24} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-900">{club.name}</h3>
                        <p className="text-xs text-stone-500 line-clamp-1">{club.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setEditingEntity({ type: 'club', id: club.id, data: { name: club.name, description: club.description, logoUrl: club.logoUrl } })}
                        className="text-stone-400 hover:text-emerald-600 p-2"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete('clubs', club.id!)} className="text-red-400 hover:text-red-600 p-2">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedClub(selectedClub === club.id ? null : club.id)}
                    className="text-xs font-bold text-emerald-600 hover:underline text-left"
                  >
                    {selectedClub === club.id ? 'Hide Members' : 'Manage Members'}
                  </button>

                  {selectedClub === club.id && (
                    <div className="mt-4 pt-4 border-t border-stone-100 space-y-4">
                      <div className="grid grid-cols-1 gap-2">
                        {clubMembers.filter(m => m.clubId === club.id).map(member => (
                          <div key={member.id} className="flex items-center justify-between bg-white p-2 rounded-xl border border-stone-100">
                            <div className="flex items-center gap-2">
                              <img src={member.photoUrl || `https://ui-avatars.com/api/?name=${member.name}&background=random`} className="w-6 h-6 rounded-full" alt="" />
                              <span className="text-sm font-medium">{member.name} ({member.position})</span>
                            </div>
                            <button onClick={() => handleDelete('clubMembers', member.id)} className="text-red-400 hover:text-red-600">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={(e) => handleAddMember(e, 'club')} className="flex gap-2">
                        <input 
                          placeholder="Member Name" 
                          className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-stone-200 outline-none"
                          value={newMember.name}
                          onChange={e => setNewMember({...newMember, name: e.target.value})}
                          required
                        />
                        <input 
                          placeholder="Position" 
                          className="w-24 text-xs px-3 py-1.5 rounded-lg border border-stone-200 outline-none"
                          value={newMember.position}
                          onChange={e => setNewMember({...newMember, position: e.target.value})}
                          required
                        />
                        <button type="submit" className="bg-emerald-600 text-white p-1.5 rounded-lg hover:bg-emerald-700">
                          <Plus size={14} />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'boards' && (
          <div className="space-y-8">
            <form onSubmit={handleAddBoard} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-6 rounded-2xl border border-stone-100">
              <input 
                placeholder="Board Name" 
                className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                value={newBoard.name}
                onChange={e => setNewBoard({...newBoard, name: e.target.value})}
                required
              />
              <textarea 
                placeholder="Description" 
                className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                value={newBoard.description}
                onChange={e => setNewBoard({...newBoard, description: e.target.value})}
                required
              />
              <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 md:col-span-2">
                <Plus size={18} /> Add Board
              </button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {boards.map(board => (
                <div key={board.id} className="flex flex-col p-4 border border-stone-100 rounded-2xl hover:bg-stone-50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <Layout size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-900">{board.name}</h3>
                        <p className="text-xs text-stone-500 line-clamp-1">{board.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setEditingEntity({ type: 'board', id: board.id, data: { name: board.name, description: board.description } })}
                        className="text-stone-400 hover:text-emerald-600 p-2"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete('boards', board.id!)} className="text-red-400 hover:text-red-600 p-2">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedBoard(selectedBoard === board.id ? null : board.id)}
                    className="text-xs font-bold text-emerald-600 hover:underline text-left"
                  >
                    {selectedBoard === board.id ? 'Hide Members' : 'Manage Members'}
                  </button>

                  {selectedBoard === board.id && (
                    <div className="mt-4 pt-4 border-t border-stone-100 space-y-4">
                      <div className="grid grid-cols-1 gap-2">
                        {boardMembers.filter(m => m.boardId === board.id).map(member => (
                          <div key={member.id} className="flex items-center justify-between bg-white p-2 rounded-xl border border-stone-100">
                            <div className="flex items-center gap-2">
                              <img src={member.photoUrl || `https://ui-avatars.com/api/?name=${member.name}&background=random`} className="w-6 h-6 rounded-full" alt="" />
                              <span className="text-sm font-medium">{member.name} ({member.position})</span>
                            </div>
                            <button onClick={() => handleDelete('boardMembers', member.id)} className="text-red-400 hover:text-red-600">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={(e) => handleAddMember(e, 'board')} className="flex gap-2">
                        <input 
                          placeholder="Member Name" 
                          className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-stone-200 outline-none"
                          value={newMember.name}
                          onChange={e => setNewMember({...newMember, name: e.target.value})}
                          required
                        />
                        <input 
                          placeholder="Position" 
                          className="w-24 text-xs px-3 py-1.5 rounded-lg border border-stone-200 outline-none"
                          value={newMember.position}
                          onChange={e => setNewMember({...newMember, position: e.target.value})}
                          required
                        />
                        <button type="submit" className="bg-emerald-600 text-white p-1.5 rounded-lg hover:bg-emerald-700">
                          <Plus size={14} />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'bearers' && (
          <div className="space-y-8">
            <form onSubmit={handleAddBearer} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-stone-50 p-6 rounded-2xl border border-stone-100">
              <input 
                placeholder="Name" 
                className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                value={newBearer.name}
                onChange={e => setNewBearer({...newBearer, name: e.target.value})}
                required
              />
              <input 
                placeholder="Position" 
                className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                value={newBearer.position}
                onChange={e => setNewBearer({...newBearer, position: e.target.value})}
                required
              />
              <input 
                placeholder="Photo URL" 
                className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                value={newBearer.photoUrl}
                onChange={e => setNewBearer({...newBearer, photoUrl: e.target.value})}
              />
              <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 md:col-span-3">
                <Plus size={18} /> Add Office Bearer
              </button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {bearers.map(bearer => (
                <div key={bearer.id} className="flex flex-col items-center p-6 border border-stone-100 rounded-2xl hover:bg-stone-50 text-center relative group">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setEditingEntity({ type: 'bearer', id: bearer.id, data: { name: bearer.name, position: bearer.position, photoUrl: bearer.photoUrl } })}
                      className="text-stone-400 hover:text-emerald-600 p-1"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete('officeBearers', bearer.id!)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <img src={bearer.photoUrl || `https://ui-avatars.com/api/?name=${bearer.name}&background=random`} alt="" className="w-20 h-20 rounded-full object-cover mb-4 border-2 border-emerald-100" />
                  <h3 className="font-bold text-stone-900">{bearer.name}</h3>
                  <p className="text-xs text-emerald-600 font-bold uppercase">{bearer.position}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-6">
            <form onSubmit={handleAddContent} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-stone-50 p-6 rounded-2xl border border-stone-100 mb-8">
              <input 
                name="key"
                placeholder="Content Key (e.g. about_college)" 
                className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <input 
                name="value"
                placeholder="Initial Value" 
                className="px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700">
                <Plus size={18} /> Add Key
              </button>
            </form>
            {content.map(item => (
              <div key={item.id} className="space-y-2 p-6 border border-stone-100 rounded-2xl bg-stone-50">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{item.key.replace(/_/g, ' ')}</label>
                  <button 
                    onClick={() => handleUpdateContent(item.id!, item.value)}
                    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold text-xs"
                  >
                    <Save size={14} /> Save Changes
                  </button>
                </div>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px]"
                  value={item.value}
                  onChange={e => {
                    const newContent = content.map(c => c.id === item.id ? {...c, value: e.target.value} : c);
                    setContent(newContent);
                  }}
                />
              </div>
            ))}
            {content.length === 0 && (
              <div className="text-center py-12 text-stone-500 italic">
                No site content entries found.
              </div>
            )}
          </div>
        )}

        {activeTab === 'submissions' && profile && (
          <WorkSubmissions userProfile={profile} />
        )}

        {activeTab === 'club-points' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-stone-900">Club Points Management</h3>
            <p className="text-stone-500">View and adjust points for different clubs.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clubs.map(club => (
                <div key={club.id} className="p-4 border border-stone-100 rounded-2xl flex justify-between items-center">
                  <span className="font-bold">{club.name}</span>
                  <div className="flex items-center gap-2">
                    <input type="number" className="w-20 px-2 py-1 border rounded-lg" defaultValue={0} />
                    <button className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold">Update</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'bulk' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-stone-900">Bulk Data Upload</h3>
            <div className="p-12 border-2 border-dashed border-stone-200 rounded-3xl text-center">
              <Send className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500 mb-4">Drag and drop CSV or Excel files here to bulk upload students or staff.</p>
              <button className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold">Select File</button>
            </div>
          </div>
        )}

        {activeTab === 'grace' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-stone-900">Grace Marks Admin</h3>
            <p className="text-stone-500">Award grace marks to students based on their SkillClub performance.</p>
            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
              <div className="flex gap-4">
                <input placeholder="Student Admission Number" className="flex-1 px-4 py-2 rounded-xl border border-stone-200" />
                <input type="number" placeholder="Marks" className="w-24 px-4 py-2 rounded-xl border border-stone-200" />
                <button className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold">Award Marks</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-stone-900">Student Management</h3>
              <div className="flex gap-2">
                <input placeholder="Search students..." className="px-4 py-2 border rounded-xl text-sm" />
                <button className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold">Search</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-100">
                    <th className="py-4 px-4 text-xs font-black uppercase text-stone-400">Name</th>
                    <th className="py-4 px-4 text-xs font-black uppercase text-stone-400">Admission No</th>
                    <th className="py-4 px-4 text-xs font-black uppercase text-stone-400">Class</th>
                    <th className="py-4 px-4 text-xs font-black uppercase text-stone-400">Status</th>
                    <th className="py-4 px-4 text-xs font-black uppercase text-stone-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'student').map(user => (
                    <tr key={user.uid} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                      <td className="py-4 px-4 font-bold text-stone-900">{user.displayName}</td>
                      <td className="py-4 px-4 text-stone-600">ADM-{user.uid.slice(0, 6).toUpperCase()}</td>
                      <td className="py-4 px-4 text-stone-600">B.Sc CS</td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-tighter">Active</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button className="text-emerald-600 font-bold text-xs hover:underline">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'logos' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-stone-900">Manage Logos & Assets</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: 'Union Logo', key: 'union_logo' },
                { name: 'College Logo', key: 'college_logo' },
                { name: 'Safa Logo', key: 'safa_logo' }
              ].map(logo => (
                <div key={logo.key} className="p-6 border border-stone-100 rounded-3xl space-y-4">
                  <p className="font-bold text-stone-900">{logo.name}</p>
                  <div className="aspect-square bg-stone-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-stone-200">
                    <ImageIcon className="text-stone-300" size={32} />
                  </div>
                  <button className="w-full bg-stone-900 text-white py-2 rounded-xl text-xs font-bold">Upload New</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-stone-900">System Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-stone-100 rounded-2xl">
                  <div>
                    <p className="font-bold">Enable Registration</p>
                    <p className="text-xs text-stone-500">Allow new students to register via Google Login.</p>
                  </div>
                  <div className="w-12 h-6 bg-emerald-600 rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border border-stone-100 rounded-2xl">
                  <div>
                    <p className="font-bold">Maintenance Mode</p>
                    <p className="text-xs text-stone-500">Disable all user access except for Admins.</p>
                  </div>
                  <div className="w-12 h-6 bg-stone-200 rounded-full relative">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-stone-100">
              <div className="bg-red-50 p-8 rounded-[2rem] border border-red-100">
                <h3 className="text-red-800 font-black text-xl mb-2">Danger Zone</h3>
                <p className="text-red-600 text-sm mb-6 font-medium">Resetting the portal will permanently delete all users, clubs, boards, and content. This action is irreversible.</p>
                <button 
                  onClick={handleResetPortal}
                  className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-900/20 active:scale-[0.98]"
                >
                  Reset Portal Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingEntity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-stone-900 capitalize">Edit {editingEntity.type}</h3>
              <button onClick={() => setEditingEntity(null)} className="text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateEntity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Name</label>
                <input 
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={editingEntity.data.name}
                  onChange={e => setEditingEntity({...editingEntity, data: {...editingEntity.data, name: e.target.value}})}
                  required
                />
              </div>
              {editingEntity.type !== 'bearer' && (
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Description</label>
                  <textarea 
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 h-24"
                    value={editingEntity.data.description}
                    onChange={e => setEditingEntity({...editingEntity, data: {...editingEntity.data, description: e.target.value}})}
                    required
                  />
                </div>
              )}
              {editingEntity.type === 'bearer' && (
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Position</label>
                  <input 
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editingEntity.data.position}
                    onChange={e => setEditingEntity({...editingEntity, data: {...editingEntity.data, position: e.target.value}})}
                    required
                  />
                </div>
              )}
              {(editingEntity.type === 'club' || editingEntity.type === 'bearer') && (
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">{editingEntity.type === 'club' ? 'Logo URL' : 'Photo URL'}</label>
                  <input 
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editingEntity.type === 'club' ? editingEntity.data.logoUrl : editingEntity.data.photoUrl}
                    onChange={e => setEditingEntity({
                      ...editingEntity, 
                      data: {
                        ...editingEntity.data, 
                        [editingEntity.type === 'club' ? 'logoUrl' : 'photoUrl']: e.target.value
                      }
                    })}
                  />
                </div>
              )}
              <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors mt-4">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
