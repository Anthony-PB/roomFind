import admin from 'firebase-admin';
import serviceAccount from '../roomfind-9375c-firebase-adminsdk-fbsvc-af0575f50c.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

export const db = admin.firestore();
export const auth = admin.auth();
export default admin;