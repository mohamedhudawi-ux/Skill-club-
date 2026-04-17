export const CLASS_LIST = [
  'SS2', 'SS1', 'S5', 'S4', 'S3', 
  'S2A', 'S2B', 'S1A', 'S1B'
];

export const normalizeClass = (cls: string): string => {
  if (!cls) return '';
  let upper = cls.toUpperCase().trim();
  
  // Classes that should NOT have sections: S3 to SS2
  const noSectionClasses = ['S3', 'S4', 'S5', 'SS1', 'SS2'];
  for (const base of noSectionClasses) {
    if (upper.startsWith(base)) return base;
  }
  
  // Classes that SHOULD have sections: S1, S2
  // If only base class is mentioned, default to 'A'
  if (upper === 'S1' || upper === 'S2') return upper + 'A';
  
  return upper;
};
