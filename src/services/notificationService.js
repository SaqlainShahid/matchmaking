import { db, auth, messaging } from '../firebaseConfig';
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';

const NOTIFICATIONS_COLLECTION = 'notifications';
const USERS_COLLECTION = 'users';

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      
      if (token) {
        await saveFcmToken(token);
        return token;
      }
    }
    return null;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

// Save FCM token to user document
const saveFcmToken = async (token) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, USERS_COLLECTION, user.uid);
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
};

// Remove FCM token when user logs out
export const removeFcmToken = async (token) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, USERS_COLLECTION, user.uid);
    await updateDoc(userRef, {
      fcmTokens: arrayRemove(token),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error removing FCM token:', error);
  }
};

// Create a new notification
export const createNotification = async (notificationData) => {
  try {
    const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
    const notification = {
      id: notificationRef.id,
      ...notificationData,
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(notificationRef, notification);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Get user notifications
export const getUserNotifications = async (userId, limitCount = 20) => {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notificationRef, {
      read: true,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const querySnapshot = await getDocs(q);
    const batch = [];
    
    querySnapshot.forEach((doc) => {
      const notificationRef = doc.ref;
      batch.push(
        updateDoc(notificationRef, {
          read: true,
          updatedAt: serverTimestamp()
        })
      );
    });

    await Promise.all(batch);
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Subscribe to notifications
export const subscribeToNotifications = (userId, callback) => {
  if (!userId) {
    console.warn('subscribeToNotifications called without a valid userId');
    return () => {};
  }

  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data?.createdAt?.toDate?.() ?? undefined,
          updatedAt: data?.updatedAt?.toDate?.() ?? undefined,
        };
      });
      callback(notifications);
    },
    (error) => {
      console.error('Notifications subscription error:', error);
    }
  );
};

// Listen for incoming messages when the app is in the foreground
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

// Common notification types and templates
const NOTIFICATION_TYPES = {
  REQUEST_CREATED: {
    title: 'Request Submitted',
    body: 'Your request "{requestTitle}" has been created',
    icon: '/icons/request.png',
    clickAction: '/requests/{requestId}'
  },
  NEW_REQUEST_AVAILABLE: {
    title: 'New Request Available',
    body: 'A new {serviceType} job posted near you: {requestTitle}',
    icon: '/icons/request.png',
    clickAction: '/provider/requests'
  },
  NEW_QUOTE: {
    title: 'New Quote Received',
    body: 'You have received a new quote for your request: {requestTitle}',
    icon: '/icons/quote.png',
    clickAction: '/requests/{requestId}'
  },
  QUOTE_ACCEPTED: {
    title: 'Quote Accepted',
    body: 'Your quote for {requestTitle} has been accepted!',
    icon: '/icons/check.png',
    clickAction: '/provider/projects'
  },
  INVOICE_GENERATED: {
    title: 'Invoice Generated',
    body: 'Invoice for {requestTitle} has been generated.',
    icon: '/icons/payment.png',
    clickAction: '/requests/{requestId}'
  },
  PAYMENT_COMPLETED: {
    title: 'Payment Completed',
    body: 'Payment of ${amount} received for {requestTitle}.',
    icon: '/icons/payment.png',
    clickAction: '/provider/invoices'
  },
  REQUEST_UPDATED: {
    title: 'Request Updated',
    body: 'Your request "{requestTitle}" has been updated',
    icon: '/icons/update.png',
    clickAction: '/requests/{requestId}'
  },
  NEW_MESSAGE: {
    title: 'New Message',
    body: '{senderName}: {message}',
    icon: '/icons/message.png',
    clickAction: '/messages?conversationId={conversationId}'
  },
  PAYMENT_RECEIVED: {
    title: 'Payment Received',
    body: 'Your payment of ${amount} has been received',
    icon: '/icons/payment.png',
    clickAction: '/transactions'
  }
};

// Send a notification to a user
export const sendNotification = async (userId, type, data) => {
  try {
    const notificationTemplate = NOTIFICATION_TYPES[type];
    if (!notificationTemplate) {
      throw new Error(`Invalid notification type: ${type}`);
    }

    // Replace placeholders in the template with actual data
    let title = notificationTemplate.title;
    let body = notificationTemplate.body;
    const clickAction = notificationTemplate.clickAction;

    // Replace placeholders in the template with actual data
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      title = title.replace(placeholder, value);
      body = body.replace(placeholder, value);
    });

    // Create the notification
    const notification = await createNotification({
      userId,
      type,
      title,
      body,
      data,
      read: false,
      clickAction: Object.entries(data).reduce(
        (result, [key, value]) => result.replace(`{${key}}`, value),
        clickAction
      )
    });

    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};
