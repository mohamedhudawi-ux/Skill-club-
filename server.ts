import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/admin/create-user', async (req, res) => {
    const { email, password, displayName, name, role } = req.body;
    const finalDisplayName = displayName || name;
    
    try {
      // Check if user already exists in Auth
      let userRecord;
      try {
        if (!email) throw new Error('No email provided');
        userRecord = await admin.auth().getUserByEmail(email);
        // If user exists, update their password if provided
        if (password) {
          await admin.auth().updateUser(userRecord.uid, { password });
        }
      } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
          // User doesn't exist, create them
          const createParams: any = {
            displayName: finalDisplayName,
            email,
            password: password || 'password123'
          };
          userRecord = await admin.auth().createUser(createParams);
        } else {
          throw e;
        }
      }

      // Set custom claims if needed, or just return success
      // We'll handle the Firestore profile creation on the client side 
      // or we can do it here if we have the Firestore instance.
      
      res.json({ uid: userRecord.uid, success: true });
    } catch (error: any) {
      console.error('Error creating user:', error);
      let errorMessage = error.message;
      if (errorMessage.includes('identitytoolkit.googleapis.com')) {
        const projectMatch = errorMessage.match(/project=([a-zA-Z0-9-]+)/);
        const projectId = projectMatch ? projectMatch[1] : (firebaseConfig.projectId || '');
        errorMessage = 'Firebase Authentication (Identity Toolkit API) is not enabled in your Google Cloud project. Please enable it here: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=' + projectId;
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post('/api/admin/update-user-password', async (req, res) => {
    const { uid, newPassword } = req.body;
    try {
      await admin.auth().updateUser(uid, { password: newPassword });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating password:', error);
      let errorMessage = error.message;
      if (errorMessage.includes('identitytoolkit.googleapis.com')) {
        const projectMatch = errorMessage.match(/project=([a-zA-Z0-9-]+)/);
        const projectId = projectMatch ? projectMatch[1] : (firebaseConfig.projectId || '');
        errorMessage = 'Firebase Authentication (Identity Toolkit API) is not enabled in your Google Cloud project. Please enable it here: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=' + projectId;
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post('/api/admin/update-user-profile', async (req, res) => {
    const { uid, displayName, photoURL } = req.body;
    try {
      const updateParams: any = { displayName };
      // Firebase Auth photoURL has a limit of ~2048 characters
      const isBase64 = photoURL && photoURL.startsWith('data:');
      if (photoURL && (!isBase64 || photoURL.length < 2000)) {
        updateParams.photoURL = photoURL;
      }
      
      await admin.auth().updateUser(uid, updateParams);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      let errorMessage = error.message;
      if (errorMessage.includes('identitytoolkit.googleapis.com')) {
        const projectMatch = errorMessage.match(/project=([a-zA-Z0-9-]+)/);
        const projectId = projectMatch ? projectMatch[1] : (firebaseConfig.projectId || '');
        errorMessage = 'Firebase Authentication (Identity Toolkit API) is not enabled in your Google Cloud project. Please enable it here: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=' + projectId;
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post('/api/admin/delete-user', async (req, res) => {
    const { uid } = req.body;
    try {
      await admin.auth().deleteUser(uid);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      let errorMessage = error.message;
      if (errorMessage.includes('identitytoolkit.googleapis.com')) {
        const projectMatch = errorMessage.match(/project=([a-zA-Z0-9-]+)/);
        const projectId = projectMatch ? projectMatch[1] : (firebaseConfig.projectId || '');
        errorMessage = 'Firebase Authentication (Identity Toolkit API) is not enabled in your Google Cloud project. Please enable it here: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=' + projectId;
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
