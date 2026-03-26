import { Timestamp } from 'firebase/firestore';

export const safeToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  if (typeof timestamp === 'string') return new Date(timestamp);
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  return null;
};
