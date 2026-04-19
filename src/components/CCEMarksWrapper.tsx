import React from 'react';
import { useAuth } from '../AuthContext';
import { CCEMarksStaff } from './CCEMarksStaff';
import { CCEMarksAdmin } from './CCEMarksAdmin';

export function CCEMarksWrapper() {
  const { profile } = useAuth();

  if (profile?.role === 'admin') {
    return <CCEMarksAdmin />;
  }
  
  return <CCEMarksStaff />;
}
