import admin from 'firebase-admin';

// Initialize admin SDK using service account JSON set in env var
function initAdmin() {
  if (admin.apps && admin.apps.length) return admin;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON environment variable');
  const serviceAccount = JSON.parse(serviceAccountJson);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin;
}

// Vercel / Netlify serverless handler signature
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  const { notificationId, notification } = body;

  try {
    const adminSdk = initAdmin();
    const db = adminSdk.firestore();

    // Fetch notification doc if id provided
    let notif = notification;
    if (!notif && notificationId) {
      const docSnap = await db.collection('notifications').doc(notificationId).get();
      if (!docSnap.exists) return res.status(404).json({ error: 'Notification not found' });
      notif = { id: docSnap.id, ...docSnap.data() };
    }

    if (!notif || !notif.userId) return res.status(400).json({ error: 'Invalid notification payload' });

    const userRef = db.collection('users').doc(notif.userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: 'User not found' });

    const user = userSnap.data() || {};
    const tokens = Array.isArray(user.fcmTokens) ? user.fcmTokens.filter(Boolean) : [];

    if (tokens.length === 0) {
      console.log('No FCM tokens for user', notif.userId);
      return res.status(200).json({ success: true, delivered: 0, message: 'No tokens' });
    }

    const payload = {
      notification: {
        title: notif.title || 'Notification',
        body: notif.body || '',
      },
      data: {
        ...(notif.data || {}),
        click_action: notif.clickAction || '/',
      }
    };

    const response = await adminSdk.messaging().sendMulticast({ tokens, ...payload });

    console.log(`Forwarded notification ${notif.id} to ${tokens.length} tokens. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    return res.status(200).json({ success: true, delivered: response.successCount, failed: response.failureCount });
  } catch (error) {
    console.error('Forwarder error:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}
