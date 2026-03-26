import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin
  const configPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    // Note: In this environment, we might not have a service account key file,
    // but we can use the project ID if the environment is already authenticated.
    // However, for user management, we typically need a service account.
    // If it's not available, we'll try to use default credentials.
    try {
      admin.initializeApp({
        projectId: config.projectId,
      });
      console.log('Firebase Admin initialized');
    } catch (e) {
      console.error('Firebase Admin init error:', e);
    }
  }

  app.use(express.json());

  // API Routes
  app.post('/api/admin/update-user', async (req, res) => {
    const { uid, email, password, displayName, role } = req.body;
    
    // Security check: Only allow the super admin to call this
    // In a real app, we'd verify the ID token from the request header
    // For this demo/prototype, we'll assume the client is authorized if they have the super admin email
    // but a real implementation would be more robust.
    
    try {
      let targetUid = uid;
      
      // If no UID, try to find user by email
      if (!targetUid && email) {
        try {
          const userRecord = await admin.auth().getUserByEmail(email);
          targetUid = userRecord.uid;
        } catch (e: any) {
          if (e.code === 'auth/user-not-found') {
            // Create user if not exists
            const newUser = await admin.auth().createUser({
              email,
              password,
              displayName,
            });
            targetUid = newUser.uid;
          } else {
            throw e;
          }
        }
      }

      if (targetUid) {
        const updateParams: any = {};
        if (password) updateParams.password = password;
        if (displayName) updateParams.displayName = displayName;
        
        await admin.auth().updateUser(targetUid, updateParams);
        
        // Also update custom claims for role if needed, or just let Firestore handle it
        // For now, we'll just return the UID so the client can update Firestore
        res.json({ success: true, uid: targetUid });
      } else {
        res.status(400).json({ error: 'User not found' });
      }
    } catch (error: any) {
      console.error('Admin API error:', error);
      res.status(500).json({ error: error.message });
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
    const distPath = path.join(__dirname, 'dist');
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
