import { collection, getDocs, query, where, getFirestore } from 'firebase/firestore';                
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUser() {
  const email = "mdthaha213@gmail.com";
  console.log('Searching for user:', email);
  const q = query(collection(db, 'users'), where('email', '==', email));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log('No user found in /users with that email.');
    // Check all users
    const all = await getDocs(collection(db, 'users'));
    console.log('Total users:', all.size);
    all.forEach(d => console.log(d.id, d.data().email));
  } else {
    snap.forEach(d => {
      console.log('Found user:', d.id, d.data());
    });
  }
}

checkUser().catch(console.error);
