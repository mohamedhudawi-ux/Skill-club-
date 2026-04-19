import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { SiteContent, Campus } from './types';
import { useAuth } from './AuthContext';

interface SettingsContextType {
  settings: any;
  siteContent: SiteContent[];
  currentCampus: Campus | null;
  loading: boolean;
  quotaExceeded: boolean;
  refreshContent: (force?: boolean) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { campusId } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [siteContent, setSiteContent] = useState<SiteContent[]>([]);
  const [currentCampus, setCurrentCampus] = useState<Campus | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const handleQuotaError = (error: any) => {
    if (error?.message?.includes('Quota') || error?.code === 'resource-exhausted') {
      setQuotaExceeded(true);
    }
  };

  const fetchSettings = async (force = false) => {
    const cached = localStorage.getItem('systemSettingsCache');
    if (cached) {
      setSettings(JSON.parse(cached));
    }

    if (!force) {
      const cacheTime = localStorage.getItem('systemSettingsCacheTime');
      if (cached && cacheTime) {
        const now = new Date().getTime();
        const age = now - parseInt(cacheTime);
        if (age < 3600000) { // 1 hour cache
          return;
        }
      }
    }

    try {
      const settingsId = campusId || 'system';
      const docSnap = await getDoc(doc(db, 'settings', settingsId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings(data);
        localStorage.setItem('systemSettingsCache', JSON.stringify(data));
        localStorage.setItem('systemSettingsCacheTime', new Date().getTime().toString());
      } else if (campusId) {
        // Use default system settings if campus-specific ones don't exist yet
        const systemSnap = await getDoc(doc(db, 'settings', 'system'));
        if (systemSnap.exists()) {
          setSettings(systemSnap.data());
        }
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      handleQuotaError(error);
    }
  };

  const fetchContent = async (force = false) => {
    const cached = localStorage.getItem('siteContentCache');
    if (cached) {
      setSiteContent(JSON.parse(cached));
    }

    if (!force) {
      const cacheTime = localStorage.getItem('siteContentCacheTime');
      if (cached && cacheTime) {
        const now = new Date().getTime();
        const age = now - parseInt(cacheTime);
        if (age < 3600000) { // 1 hour cache
          return;
        }
      }
    }

    try {
      const q = campusId 
        ? query(collection(db, 'siteContent'), where('campusId', 'in', [null, campusId]))
        : collection(db, 'siteContent'); // Fallback to all if no campus context
        
      const snapshot = await getDocs(q);
      const content = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SiteContent));
      setSiteContent(content);
      localStorage.setItem('siteContentCache', JSON.stringify(content));
      localStorage.setItem('siteContentCacheTime', new Date().getTime().toString());
    } catch (error: any) {
      console.error('Error fetching site content:', error);
      handleQuotaError(error);
    }
  };

  const fetchCampusInfo = async () => {
    if (!campusId) return;
    try {
      const docSnap = await getDoc(doc(db, 'campuses', campusId));
      if (docSnap.exists()) {
        setCurrentCampus({ id: docSnap.id, ...docSnap.data() } as Campus);
      }
    } catch (error) {
      console.error('Error fetching campus info:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchContent(), fetchCampusInfo()]);
      setLoading(false);
    };
    init();
  }, [campusId]);

  const value = {
    settings,
    siteContent,
    currentCampus,
    loading,
    quotaExceeded,
    refreshContent: async (force = true) => {
      setLoading(true);
      await Promise.all([fetchSettings(force), fetchContent(force), fetchCampusInfo()]);
      setLoading(false);
    }
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
