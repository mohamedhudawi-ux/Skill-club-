import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Club, ClubMember } from '../types';
import { Plus, Trash2, UserPlus, Shield, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ClubsManager: React.FC = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [newClubName, setNewClubName] = useState('');
  const [newClubDesc, setNewClubDesc] = useState('');
  const [newClubLogo, setNewClubLogo] = useState('');
  const [expandedClubId, setExpandedClubId] = useState<string | null>(null);
  
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPos, setNewMemberPos] = useState('');
  const [newMemberPhoto, setNewMemberPhoto] = useState('');

  useEffect(() => {
    const unsubClubs = onSnapshot(collection(db, 'clubs'), (snapshot) => {
      setClubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));
    });
    const unsubMembers = onSnapshot(collection(db, 'clubMembers'), (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubMember)));
    });
    return () => {
      unsubClubs();
      unsubMembers();
    };
  }, []);

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName) return;
    await addDoc(collection(db, 'clubs'), {
      name: newClubName,
      description: newClubDesc,
      logoUrl: newClubLogo || 'https://picsum.photos/seed/club/200/200'
    });
    setNewClubName('');
    setNewClubDesc('');
    setNewClubLogo('');
  };

  const handleDeleteClub = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this club?')) {
      await deleteDoc(doc(db, 'clubs', id));
      const clubMembers = members.filter(m => m.clubId === id);
      for (const m of clubMembers) {
        await deleteDoc(doc(db, 'clubMembers', m.id));
      }
    }
  };

  const handleAddMember = async (clubId: string) => {
    if (!newMemberName || !newMemberPos) return;
    await addDoc(collection(db, 'clubMembers'), {
      clubId,
      name: newMemberName,
      position: newMemberPos,
      photoUrl: newMemberPhoto || 'https://picsum.photos/seed/user/200/200'
    });
    setNewMemberName('');
    setNewMemberPos('');
    setNewMemberPhoto('');
  };

  const handleDeleteMember = async (id: string) => {
    await deleteDoc(doc(db, 'clubMembers', id));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-600" />
          Create New Club
        </h3>
        <form onSubmit={handleCreateClub} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Club Name"
            className="px-4 py-2 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={newClubName}
            onChange={(e) => setNewClubName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Logo URL"
            className="px-4 py-2 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={newClubLogo}
            onChange={(e) => setNewClubLogo(e.target.value)}
          />
          <input
            type="text"
            placeholder="Description"
            className="md:col-span-2 px-4 py-2 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={newClubDesc}
            onChange={(e) => setNewClubDesc(e.target.value)}
          />
          <button
            type="submit"
            className="md:col-span-2 bg-indigo-600 text-white py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Add Club
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {clubs.map(club => (
          <div key={club.id} className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-black/5 transition-colors"
              onClick={() => setExpandedClubId(expandedClubId === club.id ? null : club.id)}
            >
              <div className="flex items-center gap-3">
                <img 
                  src={club.logoUrl || 'https://picsum.photos/seed/club/200/200'} 
                  alt={club.name}
                  className="w-10 h-10 rounded-xl object-cover border border-black/5"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-semibold text-gray-900">{club.name}</h4>
                  <p className="text-sm text-gray-500">{club.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteClub(club.id); }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {expandedClubId === club.id ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>
            </div>

            <AnimatePresence>
              {expandedClubId === club.id && (
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
                        <UserPlus className="w-4 h-4 text-indigo-600" />
                        Add Member to {club.name}
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
                          placeholder="Photo URL"
                          className="text-sm px-3 py-2 rounded-lg border border-black/10"
                          value={newMemberPhoto}
                          onChange={(e) => setNewMemberPhoto(e.target.value)}
                        />
                        <button
                          onClick={() => handleAddMember(club.id)}
                          className="md:col-span-3 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                        >
                          Add Member
                        </button>
                      </div>
                    </div>

                    {/* Members List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {members.filter(m => m.clubId === club.id).map(member => (
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
