import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './ProtectedRoute';

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
import WorkSubmission from './pages/WorkSubmission';
import StaffPanel from './pages/StaffPanel';
import SafaPanel from './pages/SafaPanel';
import Admin from './pages/Admin';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/skill-club" element={<SkillClub />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/clubs" element={<Clubs />} />
            <Route path="/boards" element={<Boards />} />
            <Route path="/scoreboard" element={<Scoreboard />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />

            <Route path="/submit-work" element={
              <ProtectedRoute requiredRole="student">
                <WorkSubmission />
              </ProtectedRoute>
            } />
            
            <Route path="/staff" element={
              <ProtectedRoute requiredRole="staff">
                <StaffPanel />
              </ProtectedRoute>
            } />
            
            <Route path="/safa" element={
              <ProtectedRoute requiredRole="safa">
                <SafaPanel />
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <Admin />
              </ProtectedRoute>
            } />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}
