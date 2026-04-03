import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { SettingsProvider, useSettings } from './SettingsContext';
import Layout from './components/Layout';
import ProtectedRoute from './ProtectedRoute';
import { Settings, AlertCircle } from 'lucide-react';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SkillClub from './pages/SkillClub';
import Gallery from './pages/Gallery';
import Calendar from './pages/Calendar';
import Clubs from './pages/Clubs';
import Boards from './pages/Boards';
import Scoreboard from './pages/Scoreboard';
import StaffPanel from './pages/StaffPanel';
import AcademicPanel from './pages/AcademicPanel';
import SafaPanel from './pages/SafaPanel';
import AdminCommandCenter from './pages/AdminCommandCenter';
import AddUserPage from './pages/admin/AddUserPage';
import StaffManagementPage from './pages/admin/StaffManagementPage';
import StaffDirectoryPage from './pages/admin/StaffDirectoryPage';
import StudentManagementPage from './pages/admin/StudentManagementPage';
import ClubPointsPage from './pages/admin/ClubPointsPage';
import BulkUploadPage from './pages/admin/BulkUploadPage';
import ContentPage from './pages/admin/ContentPage';
import SettingsPage from './pages/admin/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import Portal from './pages/Portal';
import SubmitWork from './pages/SubmitWork';
import GraceMarks from './pages/GraceMarks';
import ResourceLibrary from './pages/ResourceLibrary';
import StudentPortfolio from './pages/StudentPortfolio';

import ResumeBuilder from './pages/ResumeBuilder';

function AppRoutes() {
  const { profile, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading, quotaExceeded } = useSettings();
  const location = useLocation();

  if (quotaExceeded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-background p-4 text-center">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-stone-100 max-w-md w-full">
          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="text-rose-600 w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-stone-900 mb-4 uppercase tracking-tight">Daily Limit Reached</h1>
          <p className="text-stone-500 font-medium leading-relaxed mb-8">
            The application has reached its free daily database read limit (50,000 reads). 
            The quota will automatically reset at midnight Pacific Time. Please check back tomorrow!
          </p>
          <div className="pt-6 border-t border-stone-100">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Darul Huda Punganur</p>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    );
  }



  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        
        <Route path="/home" element={<Navigate to="/" replace />} />
        
        <Route path="/skill-club" element={
          <ProtectedRoute>
            <SkillClub />
          </ProtectedRoute>
        } />
        
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/calendar" element={<Calendar />} />
        
        <Route path="/clubs" element={
          <ProtectedRoute>
            <Clubs />
          </ProtectedRoute>
        } />
        
        <Route path="/boards" element={
          <ProtectedRoute>
            <Boards />
          </ProtectedRoute>
        } />
        
        <Route path="/scoreboard" element={
          <ProtectedRoute>
            <Scoreboard />
          </ProtectedRoute>
        } />
        
        <Route path="/portal" element={
          <ProtectedRoute>
            <Portal />
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="/submit-work" element={
          <ProtectedRoute requiredRole="student">
            <SubmitWork />
          </ProtectedRoute>
        } />

        <Route path="/grace-marks" element={
          <ProtectedRoute requiredRole="student">
            <GraceMarks />
          </ProtectedRoute>
        } />

        <Route path="/resources" element={
          <ProtectedRoute>
            <ResourceLibrary />
          </ProtectedRoute>
        } />

        <Route path="/staff" element={
          <ProtectedRoute requiredRole="staff">
            <StaffPanel />
          </ProtectedRoute>
        } />
        
        <Route path="/academic" element={
          <ProtectedRoute requiredRole="academic">
            <AcademicPanel />
          </ProtectedRoute>
        } />
        
        <Route path="/safa" element={
          <ProtectedRoute requiredRole="safa">
            <SafaPanel />
          </ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AdminCommandCenter />
          </ProtectedRoute>
        } />
        <Route path="/admin/add-user" element={
          <ProtectedRoute requiredRole="admin">
            <AddUserPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/staff" element={
          <ProtectedRoute requiredRole="admin">
            <StaffManagementPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/staff-directory" element={
          <ProtectedRoute requiredRole="admin">
            <StaffDirectoryPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/students" element={
          <ProtectedRoute requiredRole="staff">
            <StudentManagementPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/club-points" element={
          <ProtectedRoute requiredRole="admin">
            <ClubPointsPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/bulk-upload" element={
          <ProtectedRoute requiredRole="admin">
            <BulkUploadPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/content" element={
          <ProtectedRoute requiredRole="admin">
            <ContentPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute requiredRole="admin">
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/resume-builder" element={
          <ProtectedRoute>
            <ResumeBuilder />
          </ProtectedRoute>
        } />
        <Route path="/portfolio/:admissionNumber" element={<StudentPortfolio />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </SettingsProvider>
  );
}
