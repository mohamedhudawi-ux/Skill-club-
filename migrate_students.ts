import { collection, getDocs, updateDoc, getFirestore } from 'firebase/firestore';                
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateData() {
  console.log('Starting migration...');
  const studentsCol = collection(db, 'students');
  const snap = await getDocs(studentsCol);
  console.log('Total students to check:', snap.size);
  
  let updated = 0;
  for (const d of snap.docs) {
    const data = d.data();
    let newClass = data.class;
    
    if (data.class === '4') newClass = 'S4';
    else if (data.class === '5') newClass = 'S5';
    else if (data.class === '3') newClass = 'S3';
    else if (data.class === 'S1') newClass = 'S1A';
    else if (data.class === 'S2') newClass = 'S2A';
    
    if (newClass !== data.class) {
      await updateDoc(d.ref, { class: newClass });
      updated++;
    }
  }
  
  console.log('Migration complete. Updated documents:', updated);
}

migrateData().catch(console.error);
