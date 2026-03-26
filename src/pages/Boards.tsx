import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Board, BoardMember } from '../types';
import { motion } from 'motion/react';
import { Shield, User } from 'lucide-react';

export default function Boards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const boardsSnap = await getDocs(query(collection(db, 'boards'), limit(50)));
        const membersSnap = await getDocs(query(collection(db, 'boardMembers'), limit(100)));
        
        setBoards(boardsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board)));
        setMembers(membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BoardMember)));
      } catch (error) {
        console.error('Error fetching boards:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl font-black text-emerald-700 mb-4">Safa Union Boards</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          The governing bodies and specialized boards of the Skill Club.
        </p>
      </motion.div>

      <div className="space-y-16">
        {boards.map((board) => (
          <div key={board.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Shield size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{board.name}</h2>
                <p className="text-lg text-gray-600 leading-relaxed">{board.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {members.filter(m => m.boardId === board.id).map(member => (
                <motion.div
                  key={member.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gray-50 rounded-2xl p-6 text-center"
                >
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt={member.name} className="w-full h-full rounded-full object-cover border-4 border-white shadow-sm" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-500 border-4 border-white shadow-sm">
                        <User size={40} />
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
                  <p className="text-sm text-emerald-600 font-medium uppercase tracking-wider mt-1">{member.position}</p>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
