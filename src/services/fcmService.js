import { db, auth, requestNotificationPermission } from '../firebaseConfig';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

export const registerFcmTokenForCurrentUser = async () => {
  try {
    const token = await requestNotificationPermission();
    const user = auth.currentUser;
    if (token && user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
        updatedAt: serverTimestamp()
      });
    }
    return token || null;
  } catch (e) {
    console.error('FCM registration failed:', e);
    return null;
  }
};