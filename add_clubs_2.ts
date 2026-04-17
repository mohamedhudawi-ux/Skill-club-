
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const clubsToAdd = ['Safa SRDB', 'LB', 'SAB', 'SAFA'];

async function addClubs() {
  const clubsRef = collection(db, 'clubs');
  for (const clubName of clubsToAdd) {
    const q = query(clubsRef, where('name', '==', clubName));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      await addDoc(clubsRef, { name: clubName, description: '', logoUrl: '', totalPoints: 0 });
      console.log(`Added club: ${clubName}`);
    } else {
      console.log(`Club already exists: ${clubName}`);
    }
  }
}

addClubs().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
