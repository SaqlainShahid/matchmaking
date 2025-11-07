const functions = require('firebase-functions');
const admin = require('firebase-admin');

try {
  admin.initializeApp();
} catch (_) {}

const db = admin.firestore();

exports.onNewMessageNotify = functions.firestore
  .document('conversations/{convId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const msg = snap.data() || {};
      const convId = context.params.convId;

      // Load conversation and sender profile
      const convSnap = await db.doc(`conversations/${convId}`).get();
      const conv = convSnap.data() || {};
      const participants = Array.isArray(conv.participants) ? conv.participants : [];

      const senderId = msg.senderId;
      const senderSnap = senderId ? await db.doc(`users/${senderId}`).get() : null;
      const sender = senderSnap && senderSnap.exists ? senderSnap.data() : {};
      const senderName = sender.displayName || sender.companyName || 'New message';

      // Collect recipient tokens
      const tokenSet = new Set();
      for (const uid of participants) {
        if (!uid || uid === senderId) continue;
        const userSnap = await db.doc(`users/${uid}`).get();
        const u = userSnap.exists ? userSnap.data() : {};
        const tokens = Array.isArray(u.fcmTokens) ? u.fcmTokens : [];
        for (const t of tokens) {
          if (t && typeof t === 'string') tokenSet.add(t);
        }
      }

      const tokens = Array.from(tokenSet);
      if (tokens.length === 0) {
        console.log('No recipient tokens found for conversation', convId);
        return null;
      }

      const payload = {
        notification: {
          title: `${senderName}`,
          body: String(msg.text || '').slice(0, 140) || 'New message',
        },
        data: {
          click_action: '/provider/messages',
          convId: convId,
          senderId: senderId || '',
        }
      };

      const res = await admin.messaging().sendMulticast({ tokens, ...payload });
      console.log('FCM sent', res.successCount, 'success,', res.failureCount, 'failure');
      return null;
    } catch (error) {
      console.error('onNewMessageNotify error:', error);
      return null;
    }
  });