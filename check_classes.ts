import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';
import { normalizeClass } from './src/constants';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkClasses() {
  const studentsSnap = await getDocs(collection(db, 'students'));
  
  const targetClasses = ['S3', 'S2A', 'S2B'];
  const issues: any[] = [];
  
  studentsSnap.docs.forEach(d => {
    const data = d.data();
    const cls = data.class;
    const normalized = normalizeClass(cls);
    
    if (targetClasses.includes(normalized)) {
      if (!data.email) {
        issues.push({ id: d.id, name: data.name, class: cls, email: 'Missing' });
      }
    }
  });
  
  console.log('Students needing attention:', issues.length);
  console.table(issues.slice(0, 20));
}

checkClasses().catch(console.error);
