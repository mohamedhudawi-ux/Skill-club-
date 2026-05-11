import { collection, getDocs, limit, getFirestore, query } from 'firebase/firestore';                
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkIds() {
  const q = query(collection(db, 'students'), limit(5));
  const snap = await getDocs(q);
  snap.forEach(d => {
    console.log('ID:', d.id, 'Data:', d.data());
  });
}

checkIds().catch(console.error);
