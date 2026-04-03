import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(configPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

if (firebaseConfig.projectId) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();

const studentsToProvision = [
  "897", "899", "901", "903", "905", "840", "874", "877", "879", "882", "884", "886", "890", "880", "822", "893", "896", "906", "908", "912", "914", "824", "819", "871", "896", "910", "873", "876", "878", "881", "883", "885", "887", "889", "891", "892", "894", "895", "898", "900", "902", "904", "907", "909", "911", "913", "915", "916", "820", "821", "823", "825", "826", "827", "828", "829", "830", "831", "832", "833", "834", "835", "836", "837", "838", "839", "841", "842", "843", "844", "845", "846", "847", "848", "849", "850", "851", "852", "853", "854", "855", "856", "857", "858", "859", "860", "861", "862", "863", "864", "865", "866", "867", "868", "869", "870", "872", "875", "888"
];

async function provision() {
  console.log('Starting provisioning...');
  let successCount = 0;
  let errorCount = 0;

  for (const admNo of studentsToProvision) {
    const email = `${admNo}@skill.edu`;
    const password = `stu${admNo}`;
    
    try {
      // 1. Create user in Firebase Auth
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(email);
        // Update password if user already exists
        await admin.auth().updateUser(userRecord.uid, { password });
        console.log(`Updated existing auth for ${admNo}`);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: `Student ${admNo}`
          });
          console.log(`Created new auth for ${admNo}`);
        } else {
          throw err;
        }
      }

      // 2. Fetch student details from 'students' collection to get their actual name
      let studentName = `Student ${admNo}`;
      const studentDoc = await db.collection('students').doc(admNo).get();
      if (studentDoc.exists) {
        studentName = studentDoc.data()?.name || studentName;
        // Update student doc with email
        await db.collection('students').doc(admNo).update({ email });
      } else {
        console.log(`Warning: Student doc not found for admission number ${admNo}`);
      }

      // 3. Create/Update user in 'users' collection
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        displayName: studentName,
        role: 'student',
        admissionNumber: admNo,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Update auth display name if we found their real name
      if (studentName !== `Student ${admNo}`) {
        await admin.auth().updateUser(userRecord.uid, { displayName: studentName });
      }

      successCount++;
    } catch (error: any) {
      let errorMessage = error.message;
      const isIdentityToolkitError = 
        errorMessage.includes('identitytoolkit.googleapis.com') || 
        errorMessage.includes('Identity Toolkit API') ||
        (error.errorInfo && JSON.stringify(error.errorInfo).includes('identitytoolkit.googleapis.com'));

      if (isIdentityToolkitError) {
        const projectId = firebaseConfig.projectId || '531260372208';
        console.error(`\nCRITICAL ERROR: Firebase Authentication (Identity Toolkit API) is not enabled in your Google Cloud project.`);
        console.error(`1. Please enable it here: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=${projectId}`);
        console.error(`2. Also, go to the Firebase Console and click "Get Started" in the Authentication section: https://console.firebase.google.com/project/${projectId}/authentication`);
        console.error(`3. After enabling, wait 2-3 minutes for propagation and try again.\n`);
        process.exit(1);
      }
      
      console.error(`Failed to provision ${admNo}:`, error);
      errorCount++;
    }
  }

  console.log(`Provisioning complete. Success: ${successCount}, Errors: ${errorCount}`);
  process.exit(0);
}

provision();
