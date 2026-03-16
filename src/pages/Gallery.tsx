import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { GalleryItem } from '../types';
import { useAuth } from '../AuthContext';
import { Upload, Plus, X, Image as ImageIcon } from 'lucide-react';

export default function Gallery() {
  const { isStaff, isSafa, isAdmin, profile } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newImage, setNewImage] = useState({ url: '', caption: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'gallery'), {
        ...newImage,
        uploadedBy: profile?.uid,
        timestamp: serverTimestamp()
      });
      setIsModalOpen(false);
      setNewImage({ url: '', caption: '' });
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const canUpload = isStaff || isSafa || isAdmin;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-stone-900">Gallery</h2>
          <p className="text-stone-500">Capturing moments from SAFA activities.</p>
        </div>
        {canUpload && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-900 transition-all shadow-lg shadow-emerald-900/20"
          >
            <Plus size={20} /> Upload Photo
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="aspect-square bg-stone-100 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.id} className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
              <img src={item.url} alt={item.caption} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              {item.caption && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <p className="text-white text-sm font-medium">{item.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <Upload className="text-emerald-600" /> Upload to Gallery
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Image URL</label>
                <input 
                  type="url" required
                  value={newImage.url}
                  onChange={e => setNewImage({...newImage, url: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Paste image URL here..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Caption (Optional)</label>
                <input 
                  type="text"
                  value={newImage.caption}
                  onChange={e => setNewImage({...newImage, caption: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="What's happening in this photo?"
                />
              </div>
              <div className="bg-stone-50 p-4 rounded-2xl border border-dashed border-stone-200 flex flex-col items-center justify-center min-h-[120px]">
                {newImage.url ? (
                  <img src={newImage.url} className="max-h-24 rounded-lg shadow-sm" alt="Preview" />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="text-stone-300 mx-auto mb-2" size={32} />
                    <p className="text-xs text-stone-400">Preview will appear here</p>
                  </div>
                )}
              </div>
              <button type="submit" className="w-full bg-emerald-800 text-white py-3 rounded-xl font-bold hover:bg-emerald-900 transition-colors mt-4">
                Confirm Upload
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
