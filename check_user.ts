import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';                
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import firebaseConfig from './firebase-applet-config.json';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function checkUser() {
  const email = "mdthaha213@gmail.com";
  console.log('Checking for user with email:', email);
  
  const q = query(collection(db, 'users'), where('email', '==', email));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log('No user document found in /users for', email);
  } else {
    snap.forEach(d => {
      console.log('User document found:', d.id, d.data());
    });
  }
  
  // Also check if any students exist
  const studentsSnap = await getDocs(collection(db, 'students'));
  console.log('Total students:', studentsSnap.size);
}

checkUser().catch(console.error);
