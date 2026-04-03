import React from 'react';
import { useSettings } from '../SettingsContext';

export function BrandingHeader() {
  const { siteContent } = useSettings();
  const collegeLogo = siteContent.find(c => c.key === 'college_logo')?.value;

  return (
    <div className="space-y-6 mb-10">
      {/* Logo at the top */}
      {collegeLogo && (
        <div className="flex justify-center">
          <img 
            src={collegeLogo} 
            alt="Darul Huda Punganur Logo" 
            className="h-24 md:h-32 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* Info of Darul Huda Punganur */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-5xl font-black text-stone-900 tracking-tighter uppercase">
          Darul Huda <span className="text-emerald-600">Punganur</span>
        </h1>
        <p className="text-stone-500 font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs">
          Skill Club Portal • Safa Union
        </p>
      </div>
    </div>
  );
}
