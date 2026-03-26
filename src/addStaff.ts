
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const staffMembers = [
  { name: 'Zakir', email: 'zakir@skill.edu' },
  { name: 'Nayaz', email: 'nayaz@skill.edu' },
  { name: 'Saifullah', email: 'saifullah@skill.edu' },
  { name: 'Saifullahk', email: 'saifullahk@skill.edu' },
  { name: 'Irfan', email: 'irfan@skill.edu' },
  { name: 'Shuaib', email: 'shuaib@skill.edu' },
  { name: 'Latheef', email: 'latheef@skill.edu' },
  { name: 'Salman', email: 'salman@skill.edu' },
  { name: 'Shefil', email: 'shefil@skill.edu' },
  { name: 'Safwan', email: 'safwan@skill.edu' },
  { name: 'Shibli', email: 'shibli@skill.edu' },
  { name: 'Thaha', email: 'thaha@skill.edu' },
  { name: 'Jawad', email: 'jawad@skill.edu' },
];

export async function addStaffMembers() {
  for (const staff of staffMembers) {
    // Note: This script assumes the Auth user already exists or will be created.
    // In a real scenario, you'd need to create the Auth user first.
    // Since I cannot create Auth users here, I will just add the profile to Firestore.
    // This will allow them to be recognized as staff once they sign in.
    
    // Using email as a temporary ID if UID is not available, 
    // but in production, you should use the Auth UID.
    const staffRef = doc(db, 'users', staff.email);
    
    await setDoc(staffRef, {
      email: staff.email,
      displayName: staff.name,
      role: 'staff',
      createdAt: new Date().toISOString()
    }, { merge: true });
    console.log(`Added ${staff.name} to Firestore`);
  }
}
