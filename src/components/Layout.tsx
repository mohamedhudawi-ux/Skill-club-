import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Trophy, 
  Calendar as CalendarIcon, 
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
  Facebook,
  Instagram,
  Mail,
  Send,
  Wallet
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
      { name: 'Treasurer Panel', href: '/safa?tab=treasurer', icon: Wallet, group: 'Finance' },
      { name: 'Gallery', href: '/gallery', icon: ImageIcon, group: 'Media' },
      { name: 'Calendar', href: '/calendar', icon: CalendarIcon, group: 'Media' }
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
      { name: 'Calendar', href: '/calendar', icon: CalendarIcon, group: 'Media' },
    );

    if (profile?.role !== 'student') {
      navigation.push({ name: 'Scoreboard', href: '/scoreboard', icon: Award, group: 'Media' });
    }

    if (isSafa || isAdmin) {
      navigation.push(
        { name: 'Safa Panel', href: '/safa', icon: Bell, group: 'Media' },
        { name: 'Treasurer Panel', href: '/safa?tab=treasurer', icon: Wallet, group: 'Finance' }
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

  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  const formatLink = (link: string) => {
    if (!link) return '#';
    if (link.startsWith('http://') || link.startsWith('https://') || link.startsWith('mailto:') || link.startsWith('tel:')) {
      return link;
    }
    return `https://${link}`;
  };

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
            <div className="w-8 h-8 bg-emerald-600 rounded-lg" />
            <h1 className="text-xl font-black text-stone-900 tracking-tight">SKILL CLUB</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-stone-100 rounded-lg">
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
          <div className="w-8 h-8 bg-emerald-600 rounded-lg" />
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
            <div className="flex items-center gap-4 lg:hidden">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-md hover:bg-stone-100"
              >
                <Menu size={20} />
              </button>
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
