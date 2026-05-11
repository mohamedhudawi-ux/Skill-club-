import { collection, getDocs, query, where, getFirestore, limit } from 'firebase/firestore';                
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findAdmin() {
  const email = "mdthaha213@gmail.com";
  console.log('Searching for:', email);
  const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log('User not found by email query.');
    // List first 5 users to see structure
    const all = await getDocs(query(collection(db, 'users'), limit(5)));
    all.forEach(d => console.log(d.id, d.data().email));
  } else {
    console.log('UID:', snap.docs[0].id);
  }
}

findAdmin().catch(console.error);
