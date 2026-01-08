Serverless Notification Forwarder

Purpose:
- A small serverless function that forwards newly-created `notifications` documents to the user's stored FCM tokens using the Firebase Admin SDK.

Deployment (Vercel / Netlify / Render):
- Set the env var `FIREBASE_SERVICE_ACCOUNT_JSON` to the contents of your service account JSON (stringified JSON). e.g. copy/paste file content.
- Deploy this folder as a single serverless function (Vercel: place under `/api/forwardNotification.js` or configure the function path).

API:
- POST / (JSON)
  - { notificationId: string }
  - OR { notification: { userId, title, body, data, clickAction } }

Response:
- 200 { success: true, delivered: N, failed: M } on success
- 4xx/5xx on errors
