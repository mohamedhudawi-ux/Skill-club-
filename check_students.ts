import { collection, getDocs, getFirestore, limit, query } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkStudents() {
  const studentsSnap = await getDocs(query(collection(db, 'students'), limit(10)));
  
  studentsSnap.docs.forEach(d => {
    console.log('Student ID:', d.id, 'Data:', JSON.stringify(d.data()));
  });
}

checkStudents().catch(console.error);
