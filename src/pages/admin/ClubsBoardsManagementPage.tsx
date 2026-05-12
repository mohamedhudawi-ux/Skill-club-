import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { Club } from '../../types';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ImageUpload } from '../../components/ImageUpload';
import { Trash2, Plus, X, Globe, Users } from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';

export default function ClubsBoardsManagementPage() {
  const { campusId } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  
  const [newClub, setNewClub] = useState({ name: '', description: '', logoUrl: '' });
  const [newBoard, setNewBoard] = useState({ title: '', content: '', imageUrl: '' });
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'club' | 'board' } | null>(null);

  useEffect(() => {
    if (!campusId) return;
    fetchData();
  }, [campusId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const clubsSnap = await getDocs(query(collection(db, 'clubs'), where('campusId', '==', campusId)));
      const boardsSnap = await getDocs(query(collection(db, 'boards'), where('campusId', '==', campusId)));
      
      setClubs(clubsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));
      setBoards(boardsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusId) return;
    try {
      await addDoc(collection(db, 'clubs'), {
        ...newClub,
        campusId,
        points: 0,
        createdAt: new Date().toISOString()
      });
      setStatus({ type: 'success', msg: 'Club added successfully!' });
      setNewClub({ name: '', description: '', logoUrl: '' });
      fetchData();
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add club.' });
    }
  };

  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusId) return;
    try {
      await addDoc(collection(db, 'boards'), {
        ...newBoard,
        campusId,
        createdAt: new Date().toISOString()
      });
      setStatus({ type: 'success', msg: 'Board added successfully!' });
      setNewBoard({ title: '', content: '', imageUrl: '' });
      fetchData();
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to add board.' });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, deleteConfirm.type === 'club' ? 'clubs' : 'boards', deleteConfirm.id));
      setStatus({ type: 'success', msg: `${deleteConfirm.type === 'club' ? 'Club' : 'Board'} deleted successfully!` });
      setDeleteConfirm(null);
      fetchData();
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to delete item.' });
    }
  };

  return (
    <div className="p-8 space-y-12">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-stone-900 uppercase tracking-tight">Clubs & Boards Management</h2>
        {status && (
          <div className={`px-4 py-2 rounded-xl text-sm font-bold ${
            status.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}>
            {status.msg}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Clubs Section */}
        <div className="space-y-6">
          <h3 className="text-2xl font-black text-stone-900 flex items-center gap-3">
            <Users className="text-emerald-600" />
            Clubs
          </h3>
          
          <Card className="p-6 bg-stone-50 border-emerald-100">
            <form onSubmit={handleAddClub} className="space-y-4">
              <h4 className="font-bold text-stone-900">Add New Club</h4>
              <input 
                placeholder="Club Name" 
                value={newClub.name}
                onChange={e => setNewClub({ ...newClub, name: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <textarea 
                placeholder="Club Description" 
                value={newClub.description}
                onChange={e => setNewClub({ ...newClub, description: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px]"
                required
              />
              <ImageUpload 
                label="Club Logo" 
                onUpload={(url) => setNewClub({ ...newClub, logoUrl: url })} 
                currentImageUrl={newClub.logoUrl}
              />
              <Button type="submit" className="w-full">
                <Plus size={18} className="mr-2" /> Add Club
              </Button>
            </form>
          </Card>

          <div className="space-y-4">
            {clubs.map(club => (
              <Card key={club.id} className="p-4 flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  {club.logoUrl ? (
                    <img src={club.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center">
                      <Users size={20} className="text-stone-400" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-stone-900">{club.name}</h4>
                    <p className="text-xs text-stone-500 line-clamp-1">{club.description}</p>
                  </div>
                </div>
                <Button 
                  variant="danger" 
                  className="p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setDeleteConfirm({ id: club.id, type: 'club' })}
                >
                  <Trash2 size={16} />
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Boards Section */}
        <div className="space-y-6">
          <h3 className="text-2xl font-black text-stone-900 flex items-center gap-3">
            <Globe className="text-blue-600" />
            Electronic Boards
          </h3>
          
          <Card className="p-6 bg-stone-50 border-blue-100">
            <form onSubmit={handleAddBoard} className="space-y-4">
              <h4 className="font-bold text-stone-900">Add New Board</h4>
              <input 
                placeholder="Board Title" 
                value={newBoard.title}
                onChange={e => setNewBoard({ ...newBoard, title: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <textarea 
                placeholder="Board Content / Text" 
                value={newBoard.content}
                onChange={e => setNewBoard({ ...newBoard, content: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                required
              />
              <ImageUpload 
                label="Header Image (Optional)" 
                onUpload={(url) => setNewBoard({ ...newBoard, imageUrl: url })} 
                currentImageUrl={newBoard.imageUrl}
              />
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                <Plus size={18} className="mr-2" /> Add Board
              </Button>
            </form>
          </Card>

          <div className="space-y-4">
            {boards.map(board => (
              <Card key={board.id} className="p-4 flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  {board.imageUrl ? (
                    <img src={board.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center">
                      <Globe size={20} className="text-stone-400" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-stone-900">{board.title}</h4>
                    <p className="text-xs text-stone-500 line-clamp-1">{board.content}</p>
                  </div>
                </div>
                <Button 
                  variant="danger" 
                  className="p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setDeleteConfirm({ id: board.id, type: 'board' })}
                >
                  <Trash2 size={16} />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Confirmation"
        message={`Are you sure you want to delete this ${deleteConfirm?.type}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
