import { collection, getDocs, writeBatch, getFirestore, limit, query, where } from 'firebase/firestore';                
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateChunk() {
  console.log('Migrating a chunk of students...');
  // Only look for students with class in ['3', '4', '5', 'S1', 'S2']
  const studentsCol = collection(db, 'students');
  const q = query(studentsCol, where('class', 'in', ['3', '4', '5', 'S1', 'S2']), limit(400));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log('No more students to migrate in this chunk.');
    return;
  }
  
  console.log(`Found ${snap.size} students to migrate.`);
  
  let batch = writeBatch(db);
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
      batch.update(d.ref, { class: newClass });
      updated++;
    }
  }
  
  await batch.commit();
  console.log(`Successfully updated ${updated} documents.`);
}

migrateChunk().catch(console.error);
