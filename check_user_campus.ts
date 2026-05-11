import { collection, getDocs, query, where, getFirestore } from 'firebase/firestore';                
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUser() {
  const email = "mdthaha213@gmail.com";
  const q = query(collection(db, 'users'), where('email', '==', email));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log('No user document found for', email);
  } else {
    snap.forEach(d => {
      console.log('User:', d.data());
    });
  }
}

checkUser().catch(console.error);
