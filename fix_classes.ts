import { collection, getDocs, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';                
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixClasses() {
  console.log('Fixing classes for 4 and 5...');
  const q4 = query(collection(db, 'students'), where('class', '==', '4'));
  const snap4 = await getDocs(q4);
  console.log(`Found ${snap4.size} students with class "4"`);
  
  for (const d of snap4.docs) {
    await updateDoc(d.ref, { class: 'S4' });
  }
  
  const q5 = query(collection(db, 'students'), where('class', '==', '5'));
  const snap5 = await getDocs(q5);
  console.log(`Found ${snap5.size} students with class "5"`);
  
  for (const d of snap5.docs) {
    await updateDoc(d.ref, { class: 'S5' });
  }
  
  console.log('Done!');
}

fixClasses().catch(console.error);
