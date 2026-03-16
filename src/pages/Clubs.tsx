import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Club, ClubMember } from '../types';
import { motion } from 'motion/react';
import { Users, Info } from 'lucide-react';

export default function Clubs() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const clubsSnap = await getDocs(query(collection(db, 'clubs')));
        const membersSnap = await getDocs(query(collection(db, 'clubMembers')));
        
        setClubs(clubsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));
        setMembers(membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubMember)));
      } catch (error) {
        console.error('Error fetching clubs:', error);
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Student Clubs</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Explore our vibrant student communities and find your passion.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {clubs.map((club) => (
          <motion.div
            key={club.id}
            whileHover={{ y: -5 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                {club.logoUrl ? (
                  <img src={club.logoUrl} alt={club.name} className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Users size={32} />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{club.name}</h2>
                  <p className="text-sm text-emerald-600 font-medium">Active Club</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 line-clamp-3">{club.description}</p>
              
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Info size={16} />
                  Office Bearers
                </h3>
                <div className="flex flex-wrap gap-4">
                  {members.filter(m => m.clubId === club.id).map(member => (
                    <div key={member.id} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg flex-1 min-w-[140px]">
                      {member.photoUrl ? (
                        <img src={member.photoUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                          <Users size={16} />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-gray-900">{member.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase">{member.position}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
