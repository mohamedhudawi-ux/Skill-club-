import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useSettings } from '../SettingsContext';
import { Program, GalleryItem } from '../types';
import { Calendar, Image as ImageIcon, ArrowRight, Maximize2, BookOpen } from 'lucide-react';
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

  const aboutCollege = siteContent.find(c => c.key === 'about_college')?.value;
  const aboutSafa = siteContent.find(c => c.key === 'about_safa')?.value;
  const aboutSkillClub = siteContent.find(c => c.key === 'about_skillclub')?.value;
  const collegeLogo = siteContent.find(c => c.key === 'college_logo')?.value;
  const safaLogo = siteContent.find(c => c.key === 'safa_logo')?.value;
  const skillclubLogo = siteContent.find(c => c.key === 'skillclub_logo')?.value;
  const collegePhoto = siteContent.find(c => c.key === 'college_photo')?.value;

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative h-[600px] rounded-[3rem] overflow-hidden shadow-2xl group">
        <img 
          src={collegePhoto || "https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&q=80"} 
          alt="College" 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          referrerPolicy="no-referrer"
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

      {/* About Darul Huda Punganur */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black uppercase tracking-widest">
              <BookOpen size={14} /> Our Institution
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-stone-900 tracking-tight leading-none">
              Darul Huda <span className="text-emerald-600">Punganur</span>
            </h2>
            <p className="text-lg text-stone-600 leading-relaxed">
              {aboutCollege || "Darul Huda Punganur is a premier educational institution dedicated to providing holistic education and fostering skill development among students."}
            </p>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
              <img 
                src={collegeLogo || "https://images.unsplash.com/photo-1523050335102-c3250908b30f?auto=format&fit=crop&q=80"} 
                alt="College Logo" 
                className="w-full h-full object-contain p-12 bg-white"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Safa Union & Skill Club */}
      <section className="bg-stone-900 py-24 -mx-8 px-8 rounded-[4rem]">
        <div className="max-w-6xl mx-auto space-y-20">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase">
              Our <span className="text-emerald-400">Ecosystem</span>
            </h2>
            <p className="text-stone-400 text-lg max-w-2xl mx-auto">
              A collaborative environment where Safa Union and Skill Club work together for student excellence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-10 bg-white/5 border-white/10 text-white space-y-6 hover:bg-white/10 transition-colors">
              <img src={safaLogo || "https://ui-avatars.com/api/?name=Safa+Union&background=random"} alt="Safa Union" className="h-16 w-16 object-contain" />
              <h3 className="text-3xl font-black tracking-tight">Safa Union</h3>
              <p className="text-stone-400 leading-relaxed">
                {aboutSafa || "Safa Union is the executive student body that manages programs, events, and student welfare at Darul Huda Punganur."}
              </p>
            </Card>

            <Card className="p-10 bg-white/5 border-white/10 text-white space-y-6 hover:bg-white/10 transition-colors">
              <img src={skillclubLogo || "https://ui-avatars.com/api/?name=Skill+Club&background=random"} alt="Skill Club" className="h-16 w-16 object-contain" />
              <h3 className="text-3xl font-black tracking-tight">Skill Club</h3>
              <p className="text-stone-400 leading-relaxed">
                {aboutSkillClub || "Skill Club is a platform designed to identify, nurture, and reward the diverse talents of our students through various activities."}
              </p>
            </Card>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto px-6">
        {/* Upcoming Programs */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black text-stone-900 flex items-center gap-3">
              <Calendar className="text-emerald-600" /> Upcoming Programs
            </h3>
            <Link to="/calendar" className="text-sm font-bold text-emerald-700 hover:underline px-4 py-2 bg-emerald-50 rounded-xl">View All</Link>
          </div>
          <div className="grid gap-6">
            {programs.length > 0 ? programs.map((program) => (
              <Card key={program.id} className="p-6 flex items-center gap-8 hover:shadow-xl transition-all border-stone-100 group">
                <div className="bg-emerald-600 text-white p-4 rounded-2xl text-center min-w-[100px] shadow-lg shadow-emerald-900/20 group-hover:scale-105 transition-transform">
                  <p className="text-xs font-black uppercase tracking-widest opacity-80">{new Date(program.date).toLocaleDateString('en-US', { month: 'short' })}</p>
                  <p className="text-3xl font-black">{new Date(program.date).getDate()}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-xl text-stone-900 group-hover:text-emerald-600 transition-colors">{program.title}</h4>
                  <p className="text-stone-500 leading-relaxed line-clamp-2">{program.description || 'No description provided.'}</p>
                </div>
              </Card>
            )) : (
              <div className="p-12 text-center bg-stone-50 rounded-[2rem] border-2 border-dashed border-stone-200">
                <p className="text-stone-400 font-bold italic">No upcoming programs scheduled.</p>
              </div>
            )}
          </div>
        </div>

        {/* Latest Gallery */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black text-stone-900 flex items-center gap-3">
              <ImageIcon className="text-emerald-600" /> Gallery
            </h3>
            <Link to="/gallery" className="text-sm font-bold text-emerald-700 hover:underline px-4 py-2 bg-emerald-50 rounded-xl">View All</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {gallery.length > 0 ? gallery.map((item, idx) => (
              <div 
                key={item.id} 
                onClick={() => { setViewerIndex(idx); setViewerOpen(true); }}
                className="group relative aspect-square rounded-[2rem] overflow-hidden shadow-md cursor-pointer"
              >
                <img src={item.url} alt={item.caption} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-emerald-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 size={24} className="text-white" />
                </div>
              </div>
            )) : (
              <div className="col-span-2 bg-stone-100 rounded-[2rem] h-60 flex items-center justify-center text-stone-400 italic border-2 border-dashed border-stone-200">
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
