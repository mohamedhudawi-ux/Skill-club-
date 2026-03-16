import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Program, GalleryItem } from '../types';
import { Calendar, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'programs'), orderBy('date', 'asc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPrograms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Program)));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('timestamp', 'desc'), limit(4));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGallery(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem)));
    });
    return unsubscribe;
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative h-[400px] rounded-3xl overflow-hidden shadow-2xl">
        <img 
          src="https://picsum.photos/seed/college/1200/600" 
          alt="College" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/90 to-transparent flex items-center px-12">
          <div className="max-w-xl text-white">
            <h2 className="text-4xl font-bold mb-4 leading-tight">Empowering the Leaders of Tomorrow</h2>
            <p className="text-lg text-emerald-100 mb-8">
              SAFA Students Union is dedicated to fostering creativity, leadership, and excellence through diverse programs and activities.
            </p>
            <Link to="/skill-club" className="inline-flex items-center gap-2 bg-white text-emerald-900 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-all">
              Explore SkillClub <ArrowRight size={20} />
            </Link>
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
              <div key={program.id} className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-6 hover:shadow-md transition-shadow">
                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-center min-w-[80px]">
                  <p className="text-xs font-bold uppercase">{new Date(program.date).toLocaleDateString('en-US', { month: 'short' })}</p>
                  <p className="text-2xl font-black">{new Date(program.date).getDate()}</p>
                </div>
                <div>
                  <h4 className="font-bold text-lg text-stone-900">{program.title}</h4>
                  <p className="text-sm text-stone-500 line-clamp-1">{program.description || 'No description provided.'}</p>
                </div>
              </div>
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
            {gallery.length > 0 ? gallery.map((item) => (
              <div key={item.id} className="aspect-square rounded-xl overflow-hidden shadow-sm">
                <img src={item.url} alt={item.caption} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
              </div>
            )) : (
              <div className="col-span-2 bg-stone-100 rounded-2xl h-40 flex items-center justify-center text-stone-400 italic">
                No photos yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
