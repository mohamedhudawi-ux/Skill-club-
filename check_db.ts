
import { collection, getDocs, query, where, getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDatabase() {
  const studentsSnap = await getDocs(collection(db, 'students'));
  console.log('Total students in collection:', studentsSnap.size);
  
  // Checking for some students
  studentsSnap.docs.slice(0, 5).forEach(d => console.log(d.id, d.data().name, d.data().campusId));
  
  const staffSnap = await getDocs(collection(db, 'users'));
  console.log('Total users in collection:', staffSnap.size);
}

checkDatabase().catch(console.error);
