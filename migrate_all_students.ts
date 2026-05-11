import { collection, getDocs, writeBatch, getFirestore } from 'firebase/firestore';                
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateData() {
  console.log('Starting full migration...');
  const studentsCol = collection(db, 'students');
  const snap = await getDocs(studentsCol);
  console.log('Total students to check:', snap.size);
  
  let batch = writeBatch(db);
  let count = 0;
  let totalUpdated = 0;

  for (const d of snap.docs) {
    const data = d.data();
    let newClass = data.class;
    
    // Normalize logic
    if (data.class === '4') newClass = 'S4';
    else if (data.class === '5') newClass = 'S5';
    else if (data.class === '3') newClass = 'S3';
    else if (data.class === 'S1') newClass = 'S1A';
    else if (data.class === 'S2') newClass = 'S2A';
    
    if (newClass !== data.class) {
      batch.update(d.ref, { class: newClass });
      count++;
      totalUpdated++;
    }

    if (count === 450) { // Batch limit is 500
      await batch.commit();
      console.log(`Committed ${count} updates...`);
      batch = writeBatch(db);
      count = 0;
    }
  }
  
  if (count > 0) {
    await batch.commit();
    console.log(`Committed last ${count} updates.`);
  }
  
  console.log('Full Migration complete. Total updated documents:', totalUpdated);
}

migrateData().catch(console.error);
