import { collection, getDocs, query, where, updateDoc, getFirestore, limit } from 'firebase/firestore';                
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixBatch() {
  const q4 = query(collection(db, 'students'), where('class', '==', '4'), limit(25));
  const snap4 = await getDocs(q4);
  console.log(`Found ${snap4.size} students with class "4"`);
  for (const d of snap4.docs) {
    await updateDoc(d.ref, { class: 'S4' });
  }

  const q5 = query(collection(db, 'students'), where('class', '==', '5'), limit(25));
  const snap5 = await getDocs(q5);
  console.log(`Found ${snap5.size} students with class "5"`);
  for (const d of snap5.docs) {
    await updateDoc(d.ref, { class: 'S5' });
  }
  console.log('Batch done');
}

fixBatch().catch(console.error);
