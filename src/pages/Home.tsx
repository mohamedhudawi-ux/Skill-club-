import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useSettings } from '../SettingsContext';
import { Program, GalleryItem } from '../types';
import { Calendar, Image as ImageIcon, ArrowRight, Maximize2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { GalleryViewer } from '../components/GalleryViewer';

export default function Home() {
  const { siteContent } = useSettings();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const programsQ = query(collection(db, 'programs'), orderBy('date', 'asc'), limit(5));
        const programsSnap = await getDocs(programsQ);
        setPrograms(programsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Program)));

        const galleryQ = query(collection(db, 'gallery'), orderBy('timestamp', 'desc'), limit(4));
        const gallerySnap = await getDocs(galleryQ);
        setGallery(gallerySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem)));
      } catch (error) {
        console.error('Error fetching home data:', error);
      }
    };

    fetchHomeData();
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative h-[600px] rounded-[3rem] overflow-hidden shadow-2xl group">
        <img 
          src="https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80" 
          alt="College" 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent flex flex-col items-center justify-center text-center px-6">
          <div className="max-w-3xl text-white">
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter uppercase leading-none">
              Skill Club <span className="text-emerald-400">Portal</span>
            </h1>
            <p className="text-xl md:text-2xl text-stone-300 font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
              Empowering students of Darul Huda Punganur through Safa Union.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/dashboard">
                <Button className="px-10 py-4 text-lg shadow-xl shadow-emerald-900/20 flex items-center gap-2">
                  Go to Dashboard <ArrowRight size={24} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Programs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <Calendar className="text-emerald-600" /> Upcoming Programs
            </h3>
            <Link to="/calendar" className="text-sm font-semibold text-emerald-700 hover:underline">View All</Link>
          </div>
          <div className="grid gap-4">
            {programs.length > 0 ? programs.map((program) => (
              <Card key={program.id} className="p-5 flex items-center gap-6 hover:shadow-md transition-shadow">
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-center min-w-[80px]">
                  <p className="text-xs font-bold uppercase">{new Date(program.date).toLocaleDateString('en-US', { month: 'short' })}</p>
                  <p className="text-2xl font-black">{new Date(program.date).getDate()}</p>
                </div>
                <div>
                  <h4 className="font-bold text-lg text-stone-900">{program.title}</h4>
                  <p className="text-sm text-stone-500 line-clamp-1">{program.description || 'No description provided.'}</p>
                </div>
              </Card>
            )) : (
              <p className="text-stone-500 italic">No upcoming programs scheduled.</p>
            )}
          </div>
        </div>

        {/* Latest Gallery */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <ImageIcon className="text-emerald-600" /> Gallery
            </h3>
            <Link to="/gallery" className="text-sm font-semibold text-emerald-700 hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {gallery.length > 0 ? gallery.map((item, idx) => (
              <div 
                key={item.id} 
                onClick={() => { setViewerIndex(idx); setViewerOpen(true); }}
                className="group relative aspect-square rounded-xl overflow-hidden shadow-sm cursor-pointer"
              >
                <img src={item.url} alt={item.caption} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 size={20} className="text-white" />
                </div>
              </div>
            )) : (
              <div className="col-span-2 bg-stone-100 rounded-2xl h-40 flex items-center justify-center text-stone-400 italic">
                No photos yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Viewer */}
      <GalleryViewer 
        items={gallery}
        isOpen={viewerOpen}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}
