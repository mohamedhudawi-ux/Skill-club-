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
  Home,
  Send,
  BarChart3,
  FileText,
  Award,
  PlusCircle
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import moment from 'moment-hijri';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin, isStaff, isSafa } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const [dates, setDates] = useState({ gregorian: '', hijri: '' });

  useEffect(() => {
    const updateDates = () => {
      const now = moment();
      setDates({
        gregorian: now.format('dddd, D MMMM YYYY'),
        hijri: now.format('iD iMMMM iYYYY') + ' AH'
      });
    };
    updateDates();
    const timer = setInterval(updateDates, 60000);
    return () => clearInterval(timer);
  }, []);

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'SkillClub', href: '/skill-club', icon: Trophy },
    { name: 'Scoreboard', href: '/scoreboard', icon: BarChart3 },
    { name: 'Gallery', href: '/gallery', icon: ImageIcon },
    { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
    { name: 'Clubs', href: '/clubs', icon: Users },
    { name: 'Boards', href: '/boards', icon: Bell },
  ];

  if (profile?.role === 'student') {
    navigation.push({ name: 'Student Works', href: '/dashboard?tab=submissions', icon: Send });
  }

  if (isStaff) navigation.push({ name: 'Staff Panel', href: '/staff', icon: Users });
  if (isSafa) navigation.push({ name: 'Safa Panel', href: '/safa', icon: Bell });
  
  if (isAdmin) {
    navigation.push(
      { name: 'Student Works', href: '/admin?tab=submissions', icon: FileText },
      { name: 'Club Points', href: '/admin?tab=club-points', icon: Award },
      { name: 'Office Bearers', href: '/admin?tab=bearers', icon: Users },
      { name: 'Bulk Upload', href: '/admin?tab=bulk', icon: Send },
      { name: 'Grace Marks', href: '/admin?tab=grace', icon: PlusCircle },
      { name: 'Manage About', href: '/admin?tab=content', icon: Settings },
      { name: 'Manage Students', href: '/admin?tab=students', icon: Users },
      { name: 'Settings', href: '/admin?tab=settings', icon: Settings }
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
      {/* Header */}
      <header className="bg-brand-green text-white shadow-md sticky top-0 z-50 border-b-4 border-brand-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 rounded-md hover:bg-emerald-800 transition-colors"
              >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight leading-none text-brand-gold uppercase">Students Union</h1>
                <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest mt-1">Darul Huda Punganur</p>
              </div>
            </div>
            
            <div className="hidden md:flex flex-col items-end text-right">
              <p className="text-sm font-medium">{dates.gregorian}</p>
              <p className="text-xs text-brand-gold font-bold">{dates.hijri}</p>
            </div>

            <div className="flex items-center gap-4">
              {profile ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold">{profile.displayName || profile.email}</p>
                    <p className="text-xs text-brand-gold font-bold capitalize">{profile.role}</p>
                  </div>
                  <img 
                    src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName || 'User'}&background=random`} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full border-2 border-brand-gold shadow-sm"
                  />
                </div>
              ) : (
                <Link to="/login" className="bg-brand-gold text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-amber-600 transition-colors">
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        {/* Sidebar Desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <nav className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  location.pathname === item.href
                    ? 'bg-emerald-50 text-brand-green shadow-sm border-l-4 border-brand-gold'
                    : 'text-stone-600 hover:bg-white hover:text-brand-green'
                }`}
              >
                <item.icon size={20} className={location.pathname === item.href ? 'text-brand-gold' : 'text-stone-400'} />
                {item.name}
              </Link>
            ))}
            {profile && (
              <button
                onClick={() => auth.signOut()}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-all duration-200 mt-4"
              >
                <LogOut size={20} />
                Logout
              </button>
            )}
          </nav>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside className={`fixed inset-y-0 left-0 w-64 bg-brand-cream z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-brand-green">Menu</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-md hover:bg-stone-100">
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    location.pathname === item.href
                      ? 'bg-emerald-50 text-brand-green border-l-4 border-brand-gold'
                      : 'text-stone-600 hover:bg-white'
                  }`}
                >
                  <item.icon size={20} className={location.pathname === item.href ? 'text-brand-gold' : ''} />
                  {item.name}
                </Link>
              ))}
            </nav>
            {profile && (
              <button
                onClick={() => auth.signOut()}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50"
              >
                <LogOut size={20} />
                Logout
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-brand-green text-stone-300 py-12 mt-auto border-t-8 border-brand-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h3 className="text-brand-gold font-black text-xl mb-4 uppercase">Students Union</h3>
              <p className="text-sm leading-relaxed">
                Darul Huda Punganur - Empowering students through skill development and cultural activities.
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Contact Us</h3>
              <p className="text-sm">Email: studentsunion@college.edu</p>
              <p className="text-sm">Darul Huda Punganur</p>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Follow Us</h3>
              <div className="flex gap-4">
                <a href="#" className="hover:text-brand-gold transition-colors">Instagram</a>
                <a href="#" className="hover:text-brand-gold transition-colors">Facebook</a>
                <a href="#" className="hover:text-brand-gold transition-colors">WhatsApp</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-[10px] uppercase tracking-widest font-bold">
            <p>&copy; {new Date().getFullYear()} Students Union - Darul Huda Punganur. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
