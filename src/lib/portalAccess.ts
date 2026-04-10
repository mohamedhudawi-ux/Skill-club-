import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const checkPortalAccess = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) return true;
  
  const data = userDoc.data();
  const today = new Date().toISOString().split('T')[0];
  const visits = data.dailyPortalVisits || { date: today, count: 0 };
  
  if (visits.date !== today) {
    visits.date = today;
    visits.count = 0;
  }
  
  if (visits.count >= 7) {
    return false;
  }
  
  visits.count += 1;
  await updateDoc(userRef, { dailyPortalVisits: visits });
  return true;
};
