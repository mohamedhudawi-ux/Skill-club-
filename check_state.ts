import { collection, getDocs, doc, getDoc, getFirestore } from 'firebase/firestore';                
import { initializeApp } from 'firebase/app';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkState() {
  const email = "mdthaha213@gmail.com";
  console.log('Checking user:', email);
  
  // Find UID
  const users = await getDocs(collection(db, 'users'));
  let myUser = null;
  users.forEach(d => {
    if (d.data().email === email) myUser = { id: d.id, ...d.data() };
  });
  
  if (myUser) {
    console.log('User found:', myUser);
  } else {
    console.log('User not found in /users');
  }

  // Check Clubs
  const clubs = await getDocs(collection(db, 'clubs'));
  console.log('Total Clubs:', clubs.size);
  clubs.forEach(d => console.log('Club:', d.id, d.data().name, d.data().campusId));

  // Check Boards
  const boards = await getDocs(collection(db, 'boards'));
  console.log('Total Boards:', boards.size);
  boards.forEach(d => console.log('Board:', d.id, d.data().title, d.data().campusId));
}

checkState().catch(console.error);
