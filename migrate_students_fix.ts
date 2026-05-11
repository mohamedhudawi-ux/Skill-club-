import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, getFirestore } from 'firebase/firestore';                
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateStudents() {
  console.log('Starting student migration...');
  const snap = await getDocs(collection(db, 'students'));
  console.log(`Found ${snap.size} students`);

  let batch = writeBatch(db);
  let count = 0;
  let migrated = 0;
  let skipped = 0;

  for (const studentDoc of snap.docs) {
    const data = studentDoc.data();
    const id = studentDoc.id;
    const admissionNumber = data.admissionNumber;

    if (!admissionNumber) {
      console.log(`Skipping student ${id} - no admissionNumber`);
      skipped++;
      continue;
    }

    if (id !== admissionNumber) {
      // Check if target doc already exists
      // If it exists, we'll merge
      batch.set(doc(db, 'students', admissionNumber), data, { merge: true });
      batch.delete(doc(db, 'students', id));
      migrated++;
    } else {
      count++;
    }

    if ((migrated + skipped) % 100 === 0 && migrated > 0) {
      await batch.commit();
      batch = writeBatch(db);
      console.log(`Migrated ${migrated} so far...`);
    }
  }

  await batch.commit();
  console.log(`Migration complete. Migrated: ${migrated}, Already correct: ${count}, Skipped: ${skipped}`);
}

migrateStudents().catch(console.error);
