import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Campus, SKILL_CLUB_CATEGORIES, SKILL_CLUB_RULES, SkillClubRule } from '../types';
import { useAuth } from '../AuthContext';
import { LayoutDashboard, Plus, Building2, MapPin, Settings2, Trash2, CheckCircle2, XCircle, Globe, ShieldCheck, ListPlus, Save, AlertCircle, Lock, Unlock, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function MasterDashboard() {
  const { isMasterAdmin, user } = useAuth();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [passcode, setPasscode] = useState('');
  
  // In a real app, this should be an environment variable or stored securely in Firestore
  const MASTER_KEY = 'SAFA-MASTER-2024';

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCampus, setNewCampus] = useState({
    id: '',
    name: '',
    location: '',
    skillClubName: 'Skill Club',
    studentUnionName: 'Student Union',
    description: '',
  });

  useEffect(() => {
    if (isMasterAdmin && !isLocked) {
      fetchCampuses();
    }
  }, [isMasterAdmin, isLocked]);

  const verifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === MASTER_KEY) {
      setIsLocked(false);
      toast.success('Master Board Unlocked');
    } else {
      toast.error('Invalid Master Key');
      setPasscode('');
    }
  };

  const fetchCampuses = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'campuses'));
      const querySnapshot = await getDocs(q);
      const campusList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Campus[];
      setCampuses(campusList);
    } catch (error) {
      console.error('Error fetching campuses:', error);
      toast.error('Failed to load campuses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampus.id || !newCampus.name) {
      toast.error('ID and Name are required');
      return;
    }

    try {
      const campusData = {
        name: newCampus.name,
        location: newCampus.location,
        skillClubName: newCampus.skillClubName,
        studentUnionName: newCampus.studentUnionName,
        description: newCampus.description,
        status: 'active',
        skillClubRules: SKILL_CLUB_RULES,
        createdAt: new Date().toISOString(),
      };

      // Use the provided ID
      await setDoc(doc(db, 'campuses', newCampus.id), campusData);
      
      // Initialize campus settings
      await setDoc(doc(db, 'settings', newCampus.id), {
        maintenance: false,
        registration: true,
        lastUpdated: new Date().toISOString()
      });
      
      toast.success('Campus added successfully');
      setShowAddModal(false);
      fetchCampuses();
      setNewCampus({ id: '', name: '', location: '', skillClubName: 'Skill Club', studentUnionName: 'Student Union', description: '' });
    } catch (error) {
      console.error('Error adding campus:', error);
      toast.error('Failed to add campus');
    }
  };

  const toggleStatus = async (campusId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'campuses', campusId), { status: newStatus });
      toast.success(`Campus marked as ${newStatus}`);
      fetchCampuses();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status');
    }
  };

  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);

  const handleUpdateCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampus) return;

    try {
      const { id, ...data } = editingCampus;
      await updateDoc(doc(db, 'campuses', id), data);
      toast.success('Campus updated successfully');
      setEditingCampus(null);
      fetchCampuses();
    } catch (error) {
      console.error('Error updating campus:', error);
      toast.error('Failed to update campus');
    }
  };

  const [managingCampusId, setManagingCampusId] = useState<string | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [localRules, setLocalRules] = useState<SkillClubRule[]>([]);

  const openRuleManager = (campus: Campus) => {
    setLocalRules(campus.skillClubRules || SKILL_CLUB_RULES);
    setShowRuleModal(true);
  };

  const saveRules = async () => {
    if (!managingCampusId) return;
    try {
      await updateDoc(doc(db, 'campuses', managingCampusId), {
        skillClubRules: localRules
      });
      toast.success('Rules updated for this campus');
      setShowRuleModal(false);
      fetchCampuses();
    } catch (error) {
      console.error('Error saving rules:', error);
      toast.error('Failed to save rules');
    }
  };

  if (managingCampusId) {
    const campus = campuses.find(c => c.id === managingCampusId);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button 
          onClick={() => setManagingCampusId(null)}
          className="mb-6 flex items-center gap-2 text-stone-500 font-bold uppercase tracking-widest text-xs hover:text-stone-900 transition-colors"
        >
          ← Back to All Campuses
        </button>
        
        <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-stone-100 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary text-[10px] font-black uppercase tracking-widest rounded-full">
                  Management Mode
                </span>
                <span className="text-stone-400 font-bold text-xs uppercase tracking-widest">ID: {campus?.id}</span>
              </div>
              <h1 className="text-4xl font-black text-stone-900 uppercase tracking-tight">{campus?.name}</h1>
              <p className="text-stone-500 font-medium mt-1 uppercase tracking-widest text-xs">{campus?.location}</p>
            </div>
            
            <div className="flex items-center gap-4">
               <button 
                onClick={() => setEditingCampus(campus || null)}
                className="px-6 py-3 bg-stone-900 text-white rounded-2xl font-bold uppercase tracking-wider text-sm hover:bg-stone-800 transition-all"
               >
                 Campus Settings
               </button>
               <button 
                onClick={() => campus && toggleStatus(campus.id, campus.status)}
                className={`px-6 py-3 ${campus?.status === 'active' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white rounded-2xl font-bold uppercase tracking-wider text-sm transition-all`}
               >
                 {campus?.status === 'active' ? 'Deactivate' : 'Activate'}
               </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-xl">
            <h3 className="text-lg font-black text-stone-900 mb-6 uppercase tracking-tight">Skill Club Setup</h3>
            <p className="text-stone-500 text-sm mb-6 leading-relaxed">
              Configuring categories and point rules for <strong>{campus?.skillClubName}</strong>.
            </p>
            <button 
              onClick={() => campus && openRuleManager(campus)}
              className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-primary/20"
            >
              Manage Rules
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-xl">
            <h3 className="text-lg font-black text-stone-900 mb-6 uppercase tracking-tight">Admin Management</h3>
            <p className="text-stone-500 text-sm mb-6 leading-relaxed">
              Assigned admins and staff for this campus.
            </p>
            <button className="w-full py-4 bg-stone-100 text-stone-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-stone-200 transition-colors">
              Manage Access
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-xl">
            <h3 className="text-lg font-black text-stone-900 mb-6 uppercase tracking-tight">Analytics</h3>
            <p className="text-stone-500 text-sm mb-6 leading-relaxed">
              Usage statistics, active students, and point distributions.
            </p>
            <button className="w-full py-4 bg-stone-100 text-stone-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-stone-200 transition-colors">
              View Reports
            </button>
          </div>
        </div>

        {/* Rule Management Modal */}
        <AnimatePresence>
          {showRuleModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowRuleModal(false)}
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-black text-stone-900 uppercase tracking-tight">Manage Rules</h2>
                  <button 
                    onClick={saveRules}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-2xl font-bold uppercase tracking-wider text-sm shadow-lg shadow-brand-primary/20"
                  >
                    <Save className="w-5 h-5" />
                    Save Rules
                  </button>
                </div>

                <div className="space-y-8">
                  {localRules.map((categoryRule, catIdx) => (
                    <div key={categoryRule.category} className="bg-stone-50 rounded-[2.5rem] p-8 border border-stone-100">
                      <div className="flex justify-between items-start mb-6">
                        <h4 className="text-xl font-black text-stone-900 uppercase tracking-tight">{categoryRule.category}</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryRule.subCategories.map((sub, subIdx) => (
                          <div key={subIdx} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
                            <input 
                              type="text"
                              value={sub.name}
                              onChange={(e) => {
                                const newRules = [...localRules];
                                newRules[catIdx].subCategories[subIdx].name = e.target.value;
                                setLocalRules(newRules);
                              }}
                              className="flex-1 bg-transparent border-none font-bold text-stone-800 focus:ring-0 text-sm"
                            />
                            <div className="flex items-center gap-1">
                              <input 
                                type="number"
                                value={sub.points}
                                onChange={(e) => {
                                  const newRules = [...localRules];
                                  newRules[catIdx].subCategories[subIdx].points = parseInt(e.target.value) || 0;
                                  setLocalRules(newRules);
                                }}
                                className="w-16 bg-stone-50 border-none rounded-xl font-black text-brand-primary text-center focus:ring-2 focus:ring-brand-primary/20"
                              />
                              <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">pts</span>
                            </div>
                            <button 
                              onClick={() => {
                                const newRules = [...localRules];
                                newRules[catIdx].subCategories.splice(subIdx, 1);
                                setLocalRules(newRules);
                              }}
                              className="p-2 text-stone-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            const newRules = [...localRules];
                            newRules[catIdx].subCategories.push({ name: 'New Item', points: 10 });
                            setLocalRules(newRules);
                          }}
                          className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-stone-200 text-stone-400 font-bold hover:border-brand-primary/30 hover:text-brand-primary transition-all text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Add Sub-category
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (!isMasterAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Building2 className="w-16 h-16 text-stone-300 mb-4" />
        <h2 className="text-xl font-bold text-stone-900">Access Denied</h2>
        <p className="text-stone-500">Only master admins can access this board.</p>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[3rem] shadow-2xl border border-stone-100 text-center">
        <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
          <Lock className="w-10 h-10 text-brand-primary" />
        </div>
        <h2 className="text-3xl font-black text-stone-900 mb-2 uppercase tracking-tight">Security Lock</h2>
        <p className="text-stone-500 text-sm mb-10 font-medium">Hello {user?.email}, <br />Please enter the Master Access Key to proceed.</p>
        
        <form onSubmit={verifyPasscode} className="space-y-6">
          <div className="relative">
            <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
            <input
              type="password"
              required
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter Access Key"
              className="w-full pl-16 pr-6 py-5 bg-stone-50 border-none rounded-2xl font-black tracking-widest text-center focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <button
            type="submit"
            className="w-full py-5 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all active:scale-95"
          >
            Unlock Master Board
          </button>
        </form>
        
        <p className="mt-10 text-[10px] text-stone-400 font-bold uppercase tracking-[0.2em]">
          System protected by Skill Development Club Meta Security
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-stone-900 flex items-center gap-3 uppercase tracking-tight">
            <Globe className="w-8 h-8 text-brand-primary" />
            Master Admin Board
          </h1>
          <p className="text-stone-500 font-medium mt-1">Global campus management & configuration</p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-2xl font-bold uppercase tracking-wider text-sm hover:bg-opacity-90 transition-all shadow-lg shadow-brand-primary/20"
        >
          <Plus className="w-5 h-5" />
          Add New Campus
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-[2.5rem] p-8 border border-stone-100 animate-pulse h-64"></div>
          ))
        ) : campuses.length > 0 ? (
          campuses.map((campus) => (
            <motion.div
              key={campus.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setManagingCampusId(campus.id)}
              className="bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-xl shadow-stone-200/50 hover:shadow-2xl hover:shadow-brand-primary/10 transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-7 h-7 text-brand-primary" />
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  campus.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
                }`}>
                  {campus.status}
                </div>
              </div>

              <h2 className="text-xl font-black text-stone-900 mb-2 uppercase tracking-tight">{campus.name}</h2>
              <div className="flex items-center gap-2 text-stone-500 text-sm mb-4">
                <MapPin className="w-4 h-4" />
                {campus.location || 'Location not set'}
              </div>

              <p className="text-sm text-stone-600 mb-6 line-clamp-2 leading-relaxed">
                {campus.description || 'No description provided.'}
              </p>

              <div className="flex items-center justify-between pt-6 border-t border-stone-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none mb-1">Skill Club</span>
                  <span className="text-sm font-bold text-stone-900">{campus.skillClubName || 'Skill Club'}</span>
                </div>
                
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => toggleStatus(campus.id, campus.status)}
                    className="p-2 text-stone-400 hover:text-brand-primary transition-colors hover:bg-stone-50 rounded-xl"
                    title={campus.status === 'active' ? 'Deactivate' : 'Activate'}
                  >
                    {campus.status === 'active' ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={() => setEditingCampus(campus)}
                    className="p-2 text-stone-400 hover:text-brand-primary transition-colors hover:bg-stone-50 rounded-xl"
                    title="Campus Settings"
                  >
                    <Settings2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 bg-stone-50 rounded-[3rem] border-2 border-dashed border-stone-200 flex flex-col items-center justify-center">
            <Globe className="w-12 h-12 text-stone-300 mb-4" />
            <p className="text-stone-500 font-bold uppercase tracking-widest text-sm">No campuses registered yet</p>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-stone-900 text-white rounded-[2rem] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-6 h-6 text-brand-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">System Health</span>
          </div>
          <p className="text-2xl font-black uppercase tracking-tight">Global Meta Board</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Systems Online</span>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl"
            >
              <h2 className="text-3xl font-black text-stone-900 mb-6 uppercase tracking-tight">Add New Campus</h2>
              
              <form onSubmit={handleAddCampus} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-2 px-1">Campus ID (slug)</label>
                  <input
                    type="text"
                    required
                    value={newCampus.id}
                    onChange={(e) => setNewCampus({ ...newCampus, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="e.g. malappuram-campus"
                    className="w-full px-6 py-4 bg-stone-50 border-none rounded-2xl font-bold placeholder:text-stone-300 focus:ring-2 focus:ring-brand-primary/20"
                  />
                  <p className="text-[10px] text-stone-400 mt-2 px-1 uppercase tracking-widest font-bold">This will be used for identifying data collection</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-2 px-1">Campus Name</label>
                  <input
                    type="text"
                    required
                    value={newCampus.name}
                    onChange={(e) => setNewCampus({ ...newCampus, name: e.target.value })}
                    placeholder="e.g. DHPC Malappuram"
                    className="w-full px-6 py-4 bg-stone-50 border-none rounded-2xl font-bold placeholder:text-stone-300 focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-2 px-1">Location</label>
                  <input
                    type="text"
                    value={newCampus.location}
                    onChange={(e) => setNewCampus({ ...newCampus, location: e.target.value })}
                    placeholder="e.g. Kerala, India"
                    className="w-full px-6 py-4 bg-stone-50 border-none rounded-2xl font-bold placeholder:text-stone-300 focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-2 px-1">Students' Union Name</label>
                  <input
                    type="text"
                    required
                    value={newCampus.studentUnionName}
                    onChange={(e) => setNewCampus({ ...newCampus, studentUnionName: e.target.value })}
                    placeholder="e.g. SAFA Union"
                    className="w-full px-6 py-4 bg-stone-50 border-none rounded-2xl font-bold placeholder:text-stone-300 focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-stone-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-brand-primary text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-opacity-90 transition-colors shadow-lg shadow-brand-primary/20"
                  >
                    Create campus
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingCampus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingCampus(null)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <h2 className="text-3xl font-black text-stone-900 mb-6 uppercase tracking-tight">Edit Campus</h2>
              
              <form onSubmit={handleUpdateCampus} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-2 px-1">Campus Name</label>
                  <input
                    type="text"
                    required
                    value={editingCampus.name}
                    onChange={(e) => setEditingCampus({ ...editingCampus, name: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border-none rounded-2xl font-bold placeholder:text-stone-300 focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-2 px-1">Location</label>
                  <input
                    type="text"
                    value={editingCampus.location || ''}
                    onChange={(e) => setEditingCampus({ ...editingCampus, location: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border-none rounded-2xl font-bold placeholder:text-stone-300 focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-2 px-1">Skill Club Name</label>
                  <input
                    type="text"
                    value={editingCampus.skillClubName || ''}
                    onChange={(e) => setEditingCampus({ ...editingCampus, skillClubName: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border-none rounded-2xl font-bold placeholder:text-stone-300 focus:ring-2 focus:ring-brand-primary/20"
                  />
                  <p className="text-[10px] text-stone-400 mt-2 px-1 uppercase tracking-widest font-bold">Custom name for the skill development club in this campus</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-2 px-1">Students' Union Name</label>
                  <input
                    type="text"
                    value={editingCampus.studentUnionName || ''}
                    onChange={(e) => setEditingCampus({ ...editingCampus, studentUnionName: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border-none rounded-2xl font-bold placeholder:text-stone-300 focus:ring-2 focus:ring-brand-primary/20"
                  />
                  <p className="text-[10px] text-stone-400 mt-2 px-1 uppercase tracking-widest font-bold">Custom name for the Students' Union in this campus (e.g. SAFA)</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-2 px-1">Description</label>
                  <textarea
                    rows={3}
                    value={editingCampus.description || ''}
                    onChange={(e) => setEditingCampus({ ...editingCampus, description: e.target.value })}
                    className="w-full px-6 py-4 bg-stone-50 border-none rounded-2xl font-bold placeholder:text-stone-300 focus:ring-2 focus:ring-brand-primary/20 resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingCampus(null)}
                    className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-stone-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-brand-primary text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-opacity-90 transition-colors shadow-lg shadow-brand-primary/20"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
