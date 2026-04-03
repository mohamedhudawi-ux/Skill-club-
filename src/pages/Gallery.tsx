import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, limit, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { GalleryItem } from '../types';
import { useAuth } from '../AuthContext';
import { Upload, Plus, X, Image as ImageIcon, Maximize2, Trash2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { GalleryViewer } from '../components/GalleryViewer';

export default function Gallery() {
  const { profile } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'gallery'), orderBy('timestamp', 'desc'), limit(24));
        const snapshot = await getDocs(q);
        setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem)));
      } catch (error) {
        console.error("Gallery fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-stone-900">Gallery</h2>
          <p className="text-stone-500">Capturing moments from Safa Union activities.</p>
        </div>
        {items.length > 0 && (
          <Button 
            variant="ghost" 
            onClick={() => { setViewerIndex(0); setViewerOpen(true); }}
            className="flex items-center gap-2"
          >
            <ImageIcon size={20} /> Start Slideshow
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="aspect-square bg-stone-100 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item, idx) => (
            <div 
              key={item.id} 
              onClick={() => { setViewerIndex(idx); setViewerOpen(true); }}
              className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
            >
              <img src={item.url} alt={item.caption} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white scale-90 group-hover:scale-100 transition-transform">
                  <Maximize2 size={24} />
                </div>
              </div>
              {item.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <p className="text-white text-sm font-medium">{item.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Gallery Viewer */}
      <GalleryViewer 
        items={items}
        isOpen={viewerOpen}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}
