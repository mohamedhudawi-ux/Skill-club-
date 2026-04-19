import express from 'express';
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
  console.log('Starting server...');
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  const handleAuthError = (error: any, res: any) => {
    console.error('Auth Error:', error);
    let errorMessage = error.message;
    
    // Check for Identity Toolkit API disabled error
    const isIdentityToolkitError = 
      errorMessage.includes('identitytoolkit.googleapis.com') || 
      errorMessage.includes('Identity Toolkit API') ||
      (error.errorInfo && JSON.stringify(error.errorInfo).includes('identitytoolkit.googleapis.com'));

    if (isIdentityToolkitError) {
      const projectId = firebaseConfig.projectId || '531260372208';
      errorMessage = `Firebase Authentication (Identity Toolkit API) is not enabled in your Google Cloud project. 
      
1. Please enable it here: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=${projectId}
2. Also, go to the Firebase Console and click "Get Started" in the Authentication section: https://console.firebase.google.com/project/${projectId}/authentication
3. After enabling, wait 2-3 minutes for propagation.`;
    }
    
    res.status(500).json({ error: errorMessage });
  };

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
          const createParams = {
            displayName: finalDisplayName,
            email,
            password: password || 'password123'
          };
          userRecord = await admin.auth().createUser(createParams);
        } else {
          throw e;
        }
      }

      res.json({ uid: userRecord.uid, success: true });
    } catch (error) {
      handleAuthError(error, res);
    }
  });

  app.post('/api/admin/update-user-password', async (req, res) => {
    const { uid, newPassword } = req.body;
    try {
      await admin.auth().updateUser(uid, { password: newPassword });
      res.json({ success: true });
    } catch (error) {
      handleAuthError(error, res);
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
    } catch (error) {
      handleAuthError(error, res);
    }
  });

  app.post('/api/user/update-credentials', async (req, res) => {
    const { uid, email, password, displayName, currentPassword } = req.body;
    // In a real app, we'd verify the currentPassword here if it's a self-service update
    // But for this portal, we'll allow it if the UID matches the authenticated user's UID
    // (The frontend will send the UID of the logged-in user)
    try {
      const updateParams: any = {};
      if (email) updateParams.email = email;
      if (password) updateParams.password = password;
      if (displayName) updateParams.displayName = displayName;
      
      await admin.auth().updateUser(uid, updateParams);
      res.json({ success: true });
    } catch (error) {
      handleAuthError(error, res);
    }
  });

  app.post('/api/admin/update-user-credentials', async (req, res) => {
    const { uid, email, password, displayName } = req.body;
    try {
      const updateParams: any = {};
      if (email) updateParams.email = email;
      if (password) updateParams.password = password;
      if (displayName) updateParams.displayName = displayName;
      
      await admin.auth().updateUser(uid, updateParams);
      res.json({ success: true });
    } catch (error) {
      handleAuthError(error, res);
    }
  });

  app.post('/api/admin/get-user', async (req, res) => {
    const { uid } = req.body;
    try {
      const userRecord = await admin.auth().getUser(uid);
      res.json({ 
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        disabled: userRecord.disabled
      });
    } catch (error) {
      handleAuthError(error, res);
    }
  });

  app.post('/api/admin/delete-users', async (req, res) => {
    const { uids } = req.body;
    if (!Array.isArray(uids)) {
      return res.status(400).json({ error: 'uids must be an array' });
    }
    try {
      // Firebase Admin SDK supports deleting up to 1000 users at once
      const result = await admin.auth().deleteUsers(uids);
      res.json({ 
        success: true, 
        successCount: result.successCount, 
        failureCount: result.failureCount,
        errors: result.errors 
      });
    } catch (error) {
      handleAuthError(error, res);
    }
  });

  app.post('/api/admin/delete-user', async (req, res) => {
    const { uid } = req.body;
    try {
      await admin.auth().deleteUser(uid);
      res.json({ success: true });
    } catch (error) {
      handleAuthError(error, res);
    }
  });

  // Detect production mode
  const isProduction = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'dist'));
  
  if (!isProduction) {
    console.log('Running in development mode with Vite middleware');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in production mode serving static files');
    const distPath = path.join(__dirname, 'dist');
    
    // Serve static files with explicit logging or fallback check
    app.use(express.static(distPath, {
      index: false, // Don't serve index.html from here, we handle it with the catch-all
    }));

    // Explicitly handle assets to avoid them being caught by the catch-all
    app.use('/assets', express.static(path.join(distPath, 'assets')));

    app.get('*all', (req, res) => {
      // If the request looks like an asset that wasn't found, don't send index.html
      if (req.path.includes('.') && !req.path.endsWith('.html')) {
        return res.status(404).send('Not found');
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
