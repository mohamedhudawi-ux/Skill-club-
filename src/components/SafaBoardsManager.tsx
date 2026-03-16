import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { Board, BoardMember } from '../types';
import { Plus, Trash2, UserPlus, Users, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SafaBoardsManager: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [expandedBoardId, setExpandedBoardId] = useState<string | null>(null);
  
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPos, setNewMemberPos] = useState('');
  const [newMemberPhoto, setNewMemberPhoto] = useState('');

  useEffect(() => {
    const unsubBoards = onSnapshot(collection(db, 'boards'), (snapshot) => {
      setBoards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board)));
    });
    const unsubMembers = onSnapshot(collection(db, 'boardMembers'), (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BoardMember)));
    });
    return () => {
      unsubBoards();
      unsubMembers();
    };
  }, []);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName) return;
    await addDoc(collection(db, 'boards'), {
      name: newBoardName,
      description: newBoardDesc
    });
    setNewBoardName('');
    setNewBoardDesc('');
  };

  const handleDeleteBoard = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this board?')) {
      await deleteDoc(doc(db, 'boards', id));
      // Also delete members of this board
      const boardMembers = members.filter(m => m.boardId === id);
      for (const m of boardMembers) {
        await deleteDoc(doc(db, 'boardMembers', m.id));
      }
    }
  };

  const handleAddMember = async (boardId: string) => {
    if (!newMemberName || !newMemberPos) return;
    await addDoc(collection(db, 'boardMembers'), {
      boardId,
      name: newMemberName,
      position: newMemberPos,
      photoUrl: newMemberPhoto || 'https://picsum.photos/seed/user/200/200'
    });
    setNewMemberName('');
    setNewMemberPos('');
    setNewMemberPhoto('');
  };

  const handleDeleteMember = async (id: string) => {
    await deleteDoc(doc(db, 'boardMembers', id));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-emerald-600" />
          Create New Safa Board
        </h3>
        <form onSubmit={handleCreateBoard} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Board Name (e.g., Executive Board)"
            className="px-4 py-2 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Description"
            className="px-4 py-2 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={newBoardDesc}
            onChange={(e) => setNewBoardDesc(e.target.value)}
          />
          <button
            type="submit"
            className="md:col-span-2 bg-emerald-600 text-white py-2 rounded-xl font-medium hover:bg-emerald-700 transition-colors"
          >
            Add Board
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {boards.map(board => (
          <div key={board.id} className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-black/5 transition-colors"
              onClick={() => setExpandedBoardId(expandedBoardId === board.id ? null : board.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{board.name}</h4>
                  <p className="text-sm text-gray-500">{board.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteBoard(board.id); }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {expandedBoardId === board.id ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>
            </div>

            <AnimatePresence>
              {expandedBoardId === board.id && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="border-t border-black/5 bg-gray-50/50"
                >
                  <div className="p-6 space-y-6">
                    {/* Add Member Form */}
                    <div className="bg-white p-4 rounded-xl border border-black/5 shadow-sm">
                      <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-emerald-600" />
                        Add Member to {board.name}
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Name"
                          className="text-sm px-3 py-2 rounded-lg border border-black/10"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Position"
                          className="text-sm px-3 py-2 rounded-lg border border-black/10"
                          value={newMemberPos}
                          onChange={(e) => setNewMemberPos(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Photo URL (optional)"
                          className="text-sm px-3 py-2 rounded-lg border border-black/10"
                          value={newMemberPhoto}
                          onChange={(e) => setNewMemberPhoto(e.target.value)}
                        />
                        <button
                          onClick={() => handleAddMember(board.id)}
                          className="md:col-span-3 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
                        >
                          Add Member
                        </button>
                      </div>
                    </div>

                    {/* Members List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {members.filter(m => m.boardId === board.id).map(member => (
                        <div key={member.id} className="bg-white p-3 rounded-xl border border-black/5 flex items-center gap-3 shadow-sm">
                          <img 
                            src={member.photoUrl || 'https://picsum.photos/seed/user/200/200'} 
                            alt={member.name}
                            className="w-12 h-12 rounded-full object-cover border border-black/5"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <h6 className="font-medium text-gray-900 truncate">{member.name}</h6>
                            <p className="text-xs text-gray-500 truncate">{member.position}</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteMember(member.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};
