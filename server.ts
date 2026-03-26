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
  let adminInitialized = false;
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    try {
      // Check if already initialized to avoid errors on reload
      if (admin.apps.length === 0) {
        admin.initializeApp({
          projectId: config.projectId,
        });
      }
      adminInitialized = true;
      console.log('Firebase Admin initialized successfully');
    } catch (e) {
      console.error('Firebase Admin init error:', e);
    }
  } else {
    console.warn('firebase-applet-config.json not found, Admin API will be limited');
  }

  app.use(express.json());

  // Middleware to check if admin is initialized
  const checkAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!adminInitialized) {
      return res.status(500).json({ error: 'Firebase Admin not initialized. Check server logs.' });
    }
    next();
  };

  // API Routes
  app.post('/api/auth/signup', checkAdmin, async (req, res) => {
    const { email, password, displayName } = req.body;
    
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: false,
      });

      console.log(`Successfully created new user: ${userRecord.uid}`);
      res.json({ success: true, uid: userRecord.uid });
    } catch (error: any) {
      console.error('Signup API error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/update-user', checkAdmin, async (req, res) => {

    const { uid, email, password, displayName, role } = req.body;
    
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
              emailVerified: true, // Mark as verified for easier login
            });
            targetUid = newUser.uid;
            console.log(`Created new user in Auth: ${email} (${targetUid})`);
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
        console.log(`Updated user in Auth: ${targetUid}`);
        
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

    // SPA fallback for development
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
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
