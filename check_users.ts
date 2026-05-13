import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listUsers() {
  const snaps = await getDocs(collection(db, 'users'));
  
  snaps.docs.forEach(d => {
    const data = d.data();
    console.log(`User: ${data.displayName || data.email} | Role: ${data.role} | Campus: ${data.campusId}`);
  });
}

listUsers().catch(console.error);
