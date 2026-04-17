import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Trophy, 
  Image as ImageIcon, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  FileText,
  Award,
  MessageCircle,
  BookOpen,
  Facebook,
  Instagram,
  Mail,
  Send,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { auth } from '../firebase';
import { getFullHijriDate } from '../utils/hijri';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin, isStaff, isSafa, isAcademic } = useAuth();
  const { siteContent } = useSettings();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const [dates, setDates] = useState({ gregorian: '', hijri: '' });

  const collegeLogo = siteContent.find(c => c.key === 'college_logo')?.value;
  const skillclubLogo = siteContent.find(c => c.key === 'skillclub_logo')?.value;
  const whatsappLink = siteContent.find(c => c.key === 'whatsapp_link')?.value;

  useEffect(() => {
    const updateDates = () => {
      const now = new Date();
      const offsetStr = siteContent.find(c => c.key === 'hijri_offset')?.value;
      const offset = offsetStr ? parseInt(offsetStr) : undefined;
      
      setDates({
        gregorian: new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(now),
        hijri: getFullHijriDate(offset) + ' AH'
      });
    };
    updateDates();
    const timer = setInterval(updateDates, 60000);
    return () => clearInterval(timer);
  }, [siteContent]);

  let navigation: any[] = [];

  if (profile?.role === 'safa') {
    navigation = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Main' },
      { name: 'My Profile', href: '/profile', icon: Users, group: 'Main' },
      { name: 'Safa Panel', href: '/safa', icon: Bell, group: 'Media' },
      { name: 'Gallery', href: '/gallery', icon: ImageIcon, group: 'Media' }
    ];
  } else {
    navigation = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Main' },
      { name: 'My Profile', href: '/profile', icon: Users, group: 'Main' },
    ];

    if (profile?.role === 'student') {
      navigation.push(
        { name: 'My Submission', href: '/submit-work', icon: FileText, group: 'Main' },
        { name: 'My Application', href: '/grace-marks', icon: Award, group: 'Main' }
      );
    }

    navigation.push(
      { name: 'Gallery', href: '/gallery', icon: ImageIcon, group: 'Media' },
      { name: 'Resource Library', href: '/resources', icon: BookOpen, group: 'Media' },
    );

    if (profile?.role !== 'student') {
      navigation.push({ name: 'Scoreboard', href: '/scoreboard', icon: Award, group: 'Media' });
    }

    if (isSafa || isAdmin) {
      navigation.push(
        { name: 'Safa Panel', href: '/safa', icon: Bell, group: 'Media' }
      );
    }
    if (isStaff || isAdmin) {
      navigation.push(
        { name: 'Academic Panel', href: '/academic', icon: FileText, group: 'Portal' },
        { name: 'Student Management', href: '/admin/students', icon: Users, group: 'Portal' }
      );
    }
    
    if (isAdmin) {
      navigation.push(
        { name: 'Staff Management', href: '/admin/staff', icon: Users, group: 'Portal' },
        { name: 'Staff Directory', href: '/admin/staff-directory', icon: Users, group: 'Portal' },
        { name: 'Manage About', href: '/admin/content', icon: Settings, group: 'Settings' },
        { name: 'System Settings', href: '/admin/settings', icon: Settings, group: 'Settings' }
      );
    }
  }

  const groupedNavigation = navigation.reduce((acc, item) => {
    const group = item.group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, typeof navigation>);

  const publicPaths = ['/', '/gallery', '/calendar'];
  const isPublicPage = publicPaths.includes(location.pathname);
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  const formatLink = (link: string | undefined) => {
    if (!link) return '#';
    if (link.startsWith('http://') || link.startsWith('https://') || link.startsWith('mailto:') || link.startsWith('tel:')) {
      return link;
    }
    return `https://${link}`;
  };

  // Website Navbar for Public Pages
  if (isPublicPage) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="bg-white/80 backdrop-blur-md border-b border-stone-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3">
              {skillclubLogo ? (
                <img src={skillclubLogo} alt="Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 bg-emerald-600 rounded-xl" />
              )}
              <div className="hidden sm:block">
                <h1 className="text-xl font-black text-stone-900 tracking-tight leading-none">SKILL CLUB</h1>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Darul Huda Punganur</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link to="/" className={`text-sm font-bold transition-colors ${location.pathname === '/' ? 'text-emerald-600' : 'text-stone-600 hover:text-emerald-600'}`}>Home</Link>
              <Link to="/gallery" className={`text-sm font-bold transition-colors ${location.pathname === '/gallery' ? 'text-emerald-600' : 'text-stone-600 hover:text-emerald-600'}`}>Gallery</Link>
              <Link to="/calendar" className={`text-sm font-bold transition-colors ${location.pathname === '/calendar' ? 'text-emerald-600' : 'text-stone-600 hover:text-emerald-600'}`}>Calendar</Link>
              {profile ? (
                <Link to="/dashboard" className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transition-all hover:scale-105">
                  Dashboard
                </Link>
              ) : (
                <Link to="/login" className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transition-all hover:scale-105">
                  Login
                </Link>
              )}
            </nav>

            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-stone-100"
            >
              <Menu size={24} />
            </button>
          </div>
        </header>

        {/* Mobile Nav for Public Pages */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-[60] bg-white p-8 space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black">Menu</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2"><X size={24} /></button>
            </div>
            <nav className="flex flex-col gap-6">
              <Link to="/" onClick={() => setIsSidebarOpen(false)} className="text-2xl font-black">Home</Link>
              <Link to="/gallery" onClick={() => setIsSidebarOpen(false)} className="text-2xl font-black">Gallery</Link>
              <Link to="/calendar" onClick={() => setIsSidebarOpen(false)} className="text-2xl font-black">Calendar</Link>
              {profile ? (
                <Link to="/dashboard" onClick={() => setIsSidebarOpen(false)} className="text-2xl font-black text-emerald-600">Dashboard</Link>
              ) : (
                <Link to="/login" onClick={() => setIsSidebarOpen(false)} className="text-2xl font-black text-emerald-600">Login</Link>
              )}
            </nav>
          </div>
        )}

        <main className="flex-1">
          {children}
        </main>

        {/* Public Footer */}
        <footer className="max-w-7xl mx-auto w-full px-8 border-t border-stone-100 py-12 mt-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                {skillclubLogo && <img src={skillclubLogo} alt="Skill Club" className="h-10 w-auto" />}
                <h4 className="text-2xl font-black text-stone-900 tracking-tight">SKILL CLUB PORTAL</h4>
              </div>
              <p className="text-stone-500 max-w-md leading-relaxed">
                Official student management and skill development portal for Darul Huda Punganur. 
                Managed by Safa Union for the betterment of our student community.
              </p>
            </div>
            
            <div className="space-y-4">
              <h5 className="font-black text-stone-900 uppercase tracking-widest text-xs">Quick Links</h5>
              <ul className="space-y-2 text-stone-500 font-medium">
                <li><Link to="/gallery" className="hover:text-emerald-600 transition-colors">Gallery</Link></li>
                <li><Link to="/calendar" className="hover:text-emerald-600 transition-colors">Calendar</Link></li>
                <li><Link to="/login" className="hover:text-emerald-600 transition-colors">Login</Link></li>
                <li><Link to="/dashboard" className="hover:text-emerald-600 transition-colors">Dashboard</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h5 className="font-black text-stone-900 uppercase tracking-widest text-xs">Contact Us</h5>
              <p className="text-stone-500 font-medium">Darul Huda Punganur<br />Chittoor Dist, AP</p>
              <div className="flex items-center gap-4 pt-2">
                {siteContent.find(c => c.key === 'social_facebook')?.value && (
                  <a href={formatLink(siteContent.find(c => c.key === 'social_facebook')?.value)} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-blue-600 transition-colors">
                    <Facebook size={18} />
                  </a>
                )}
                {siteContent.find(c => c.key === 'social_instagram')?.value && (
                  <a href={formatLink(siteContent.find(c => c.key === 'social_instagram')?.value)} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-pink-600 transition-colors">
                    <Instagram size={18} />
                  </a>
                )}
                {siteContent.find(c => c.key === 'social_gmail')?.value && (
                  <a href={`mailto:${siteContent.find(c => c.key === 'social_gmail')?.value}`} className="text-stone-400 hover:text-red-600 transition-colors">
                    <Mail size={18} />
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-stone-100 text-center">
            <p className="text-stone-400 text-xs font-bold uppercase tracking-[0.2em]">
              © {new Date().getFullYear()} Darul Huda Punganur • Skill Club Portal
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-100 p-6 flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            {skillclubLogo ? (
              <img src={skillclubLogo} alt="Logo" className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 bg-emerald-600 rounded-lg" />
            )}
            <h1 className="text-xl font-black text-stone-900 tracking-tight">SKILL CLUB</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="p-2 hover:bg-stone-100 rounded-lg"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 space-y-8 overflow-y-auto">
          {Object.entries(groupedNavigation).map(([group, items]) => (
            <div key={group}>
              <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-4 mb-2">{group}</h3>
              <div className="space-y-1">
                {(items as any[]).map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                      location.pathname === item.href
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                    }`}
                  >
                    <item.icon size={18} />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {profile && (
          <button
            onClick={() => {
              auth.signOut();
              setIsSidebarOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-all duration-200"
          >
            <LogOut size={18} />
            Logout
          </button>
        )}
      </aside>

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-stone-100 p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-10">
          {skillclubLogo ? (
            <img src={skillclubLogo} alt="Logo" className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 bg-emerald-600 rounded-lg" />
          )}
          <h1 className="text-xl font-black text-stone-900 tracking-tight">SKILL CLUB</h1>
        </div>
        
        <nav className="flex-1 space-y-8 overflow-y-auto">
          {Object.entries(groupedNavigation).map(([group, items]) => (
            <div key={group}>
              <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-4 mb-2">{group}</h3>
              <div className="space-y-1">
                {(items as any[]).map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                      location.pathname === item.href
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                    }`}
                  >
                    <item.icon size={18} />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {profile && (
          <button
            onClick={() => auth.signOut()}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-all duration-200"
          >
            <LogOut size={18} />
            Logout
          </button>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-stone-100 sticky top-0 z-40">
          <div className="px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="lg:hidden">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 rounded-md hover:bg-stone-100"
                  aria-label="Toggle sidebar"
                  aria-expanded={isSidebarOpen}
                >
                  <Menu size={20} />
                </button>
              </div>
            </div>
            
            <div className="text-stone-500 text-sm font-medium">
              {dates.gregorian} • <span className="text-emerald-600 font-bold">{dates.hijri}</span>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-3 border-r border-stone-100 pr-6">
                {siteContent.find(c => c.key === 'social_facebook')?.value && (
                  <a href={formatLink(siteContent.find(c => c.key === 'social_facebook')?.value)} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-blue-600 transition-colors">
                    <Facebook size={18} />
                  </a>
                )}
                {siteContent.find(c => c.key === 'social_instagram')?.value && (
                  <a href={formatLink(siteContent.find(c => c.key === 'social_instagram')?.value)} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-pink-600 transition-colors">
                    <Instagram size={18} />
                  </a>
                )}
                {siteContent.find(c => c.key === 'social_whatsapp')?.value && (
                  <a href={formatLink(siteContent.find(c => c.key === 'social_whatsapp')?.value)} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-emerald-600 transition-colors">
                    <MessageCircle size={18} />
                  </a>
                )}
                {siteContent.find(c => c.key === 'social_telegram')?.value && (
                  <a href={formatLink(siteContent.find(c => c.key === 'social_telegram')?.value)} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-sky-600 transition-colors">
                    <Send size={18} />
                  </a>
                )}
                {siteContent.find(c => c.key === 'social_gmail')?.value && (
                  <a href={`mailto:${siteContent.find(c => c.key === 'social_gmail')?.value}`} className="text-stone-400 hover:text-red-600 transition-colors">
                    <Mail size={18} />
                  </a>
                )}
              </div>

              {profile ? (
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-stone-900">{profile.displayName || profile.email}</p>
                    <p className="text-xs text-stone-500 capitalize">{profile.role}</p>
                  </div>
                  <img 
                    src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName || 'User'}&background=random`} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full border border-stone-100"
                  />
                </div>
              ) : (
                <Link to="/login" className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700">
                  Login
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
