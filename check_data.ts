import { collection, getDocs, limit, query, getFirestore } from 'firebase/firestore';                
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkData() {
  const q = query(collection(db, 'students'), limit(10));
  const snap = await getDocs(q);
  console.log('Sample Students:');
  snap.forEach(d => {
    console.log(d.id, d.data());
  });
}

checkData().catch(console.error);
