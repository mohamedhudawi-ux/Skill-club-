import { collection, getDocs, query, where, getFirestore } from 'firebase/firestore';                
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkClasses() {
  const studentsCol = collection(db, 'students');
  const snap = await getDocs(studentsCol);
  console.log('Total students:', snap.size);
  
  const classes: Record<string, number> = {};
  snap.forEach(d => {
    const cls = d.data().class || 'N/A';
    classes[cls] = (classes[cls] || 0) + 1;
  });
  
  console.log('Student distribution by class:', classes);
}

checkClasses().catch(console.error);
