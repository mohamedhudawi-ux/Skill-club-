import React from 'react';
import { useSettings } from '../SettingsContext';

export function BrandingHeader() {
  const { siteContent, currentCampus } = useSettings();
  const collegeLogo = siteContent.find(c => c.key === 'college_logo')?.value;
  const campusName = currentCampus?.name || "Darul Huda Punganur";
  const studentUnionName = currentCampus?.studentUnionName || "Safa Union";
  const skillClubName = currentCampus?.skillClubName || "Skill Club";

  return (
    <div className="space-y-6 mb-10">
      {/* Logo at the top */}
      {collegeLogo && (
        <div className="flex justify-center">
          <img 
            src={collegeLogo} 
            alt={campusName + " Logo"} 
            className="h-24 md:h-32 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* Info of Campus */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-5xl font-black text-stone-900 tracking-tighter uppercase">
          {campusName}
        </h1>
        <p className="text-stone-500 font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs">
          {skillClubName} Portal • {studentUnionName}
        </p>
      </div>
    </div>
  );
}
