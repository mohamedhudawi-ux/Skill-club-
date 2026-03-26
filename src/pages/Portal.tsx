import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { 
  User, 
  Shield, 
  Users, 
  Layout, 
  ChevronRight, 
  GraduationCap, 
  Briefcase, 
  Star,
  Calendar as CalendarIcon,
  Image as ImageIcon,
  BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from '../components/Card';

export default function Portal() {
  const { isAdmin, isStaff, isSafa, isStudent, isAcademic, profile } = useAuth();
  const navigate = useNavigate();

  const portals = [
    {
      id: 'student',
      title: 'Student Portal',
      description: 'View your points and track your progress.',
      icon: GraduationCap,
      color: 'bg-emerald-500',
      path: '/dashboard',
      show: isStudent
    },
    {
      id: 'staff',
      title: 'Students Directory',
      description: 'Manage student directory and profiles.',
      icon: Briefcase,
      color: 'bg-amber-500',
      path: '/staff',
      show: isStaff || isAdmin
    },
    {
      id: 'academic',
      title: 'Academic Panel',
      description: 'Enter marks and manage academic records.',
      icon: BookOpen,
      color: 'bg-indigo-500',
      path: '/academic',
      show: isAcademic || isStaff || isAdmin
    },
    {
      id: 'safa',
      title: 'Safa Panel',
      description: 'Manage programs and skill club activities.',
      icon: Star,
      color: 'bg-purple-500',
      path: '/safa',
      show: isSafa || isAdmin
    },
    {
      id: 'calendar',
      title: 'Calendar',
      description: 'View upcoming events and academic schedule.',
      icon: CalendarIcon,
      color: 'bg-rose-500',
      path: '/calendar',
      show: isStaff || isSafa || isAdmin
    },
    {
      id: 'gallery',
      title: 'Gallery',
      description: 'View and manage event photos.',
      icon: ImageIcon,
      color: 'bg-blue-500',
      path: '/gallery',
      show: isStaff || isSafa || isAdmin
    },
    {
      id: 'admin',
      title: 'Safa Dashboard',
      description: 'Full system management, user roles, and site settings.',
      icon: Shield,
      color: 'bg-stone-900',
      path: '/admin',
      show: isAdmin
    }
  ];

  const availablePortals = portals.filter(p => p.show);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl font-black text-stone-900 mb-4 tracking-tight">
            Welcome back, <span className="text-emerald-600">{profile?.displayName || profile?.email}</span>
          </h1>
          <p className="text-stone-500 text-lg max-w-2xl mx-auto">
            Access your specialized management portals and tools from one central location.
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        {availablePortals.map((portal, index) => (
          <motion.div
            key={portal.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            onClick={() => navigate(portal.path)}
            className="cursor-pointer"
          >
            <Card className="group relative p-8 hover:shadow-xl hover:shadow-stone-200/50 transition-all overflow-hidden h-full">
              <div className={`absolute top-0 right-0 w-32 h-32 ${portal.color} opacity-[0.03] rounded-bl-full transition-all group-hover:scale-150`} />
              
              <div className="flex items-start gap-6">
                <div className={`${portal.color} p-4 rounded-2xl text-white shadow-lg shadow-${portal.color.split('-')[1]}-500/20`}>
                  <portal.icon size={32} />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-stone-900 mb-2 group-hover:text-emerald-600 transition-colors">
                    {portal.title}
                  </h3>
                  <p className="text-stone-500 leading-relaxed mb-6">
                    {portal.description}
                  </p>
                  
                  <div className="flex items-center text-stone-900 font-bold gap-2 group-hover:gap-4 transition-all">
                    <span>Enter Portal</span>
                    <ChevronRight size={20} className="text-emerald-600" />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {availablePortals.length === 0 && (
        <div className="text-center py-20 bg-stone-50 rounded-[3rem] border-2 border-dashed border-stone-200">
          <User size={64} className="mx-auto text-stone-300 mb-4" />
          <h3 className="text-2xl font-bold text-stone-900 mb-2">No Portals Assigned</h3>
          <p className="text-stone-500">Your account doesn't have any specialized portal access yet. Please contact the administrator.</p>
        </div>
      )}
    </div>
  );
}
