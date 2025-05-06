import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Get the service account path
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

// Check if file exists
if (!fs.existsSync(serviceAccountPath)) {
  throw new Error('Firebase Service Account file not found at: ' + serviceAccountPath);
}

// Load and parse the service account
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export const auth = admin.auth();
export const db = admin.firestore();