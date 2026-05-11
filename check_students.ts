import { collection, getDocs, query, where, getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkStudents() {
  const studentsSnap = await getDocs(collection(db, 'students'));
  console.log('Total students in collection:', studentsSnap.size);
  
  const class4 = studentsSnap.docs.filter(d => d.data().class === "4");
  const class5 = studentsSnap.docs.filter(d => d.data().class === "5");
  
  console.log('Students in class 4:', class4.length);
  console.log('Students in class 5:', class5.length);
}

checkStudents().catch(console.error);
