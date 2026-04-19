import React from 'react';
import { Club } from '../../types';
import { collection, getDocs, query, updateDoc, doc, increment, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../AuthContext';

export default function ClubPointsPage() {
  const { campusId } = useAuth();
  const [clubs, setClubs] = React.useState<Club[]>([]);
  const [status, setStatus] = React.useState<{ type: 'success' | 'error', msg: string } | null>(null);

  React.useEffect(() => {
    if (!campusId) return;
    const fetchClubs = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'clubs'), where('campusId', '==', campusId)));
        setClubs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club)));
      } catch (error) {
        console.error('Error fetching clubs:', error);
      }
    };
    fetchClubs();
  }, [campusId]);

  const handleUpdateClubPoints = async (clubId: string, points: number) => {
    try {
      await updateDoc(doc(db, 'clubs', clubId), {
        points: points
      });
      setStatus({ type: 'success', msg: 'Club points updated!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ type: 'error', msg: 'Failed to update club points.' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-stone-900">Club Points Management</h2>
        {status && (
          <div className={`px-4 py-2 rounded-xl text-sm font-bold ${
            status.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}>
            {status.msg}
          </div>
        )}
      </div>
      <p className="text-stone-500">View and adjust points for different clubs.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clubs.map(club => (
          <div key={club.id} className="p-4 border border-stone-100 rounded-2xl flex justify-between items-center bg-stone-50">
            <div className="flex items-center gap-3">
              {club.logoUrl && <img src={club.logoUrl} className="w-8 h-8 object-contain" alt="" />}
              <span className="font-bold">{club.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                className="w-20 px-2 py-1 border rounded-lg" 
                defaultValue={club.points || 0} 
                id={`pts-${club.id}`}
              />
              <button 
                onClick={() => {
                  const val = (document.getElementById(`pts-${club.id}`) as HTMLInputElement).value;
                  handleUpdateClubPoints(club.id, parseInt(val) || 0);
                }}
                className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-700"
              >
                Update
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
