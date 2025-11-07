import { db, auth, storage } from '../firebaseConfig';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const MESSAGES_COLLECTION = 'messages';
const CONVERSATIONS_COLLECTION = 'conversations';

// Upload a chat attachment to storage and return metadata
export const uploadChatAttachment = async (file) => {
  try {
    const path = `chat/${auth.currentUser?.uid || 'anonymous'}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { name: file.name, type: file.type, size: file.size, url };
  } catch (e) {
    console.error('Error uploading chat attachment:', e);
    throw e;
  }
};

// Get or create a conversation between two users
export const getOrCreateConversation = async (otherUserId) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');

    const conversationId = [currentUser.uid, otherUserId].sort().join('_');
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    
    // Try to get existing conversation
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      return {
        id: conversationSnap.id,
        ...conversationSnap.data(),
        lastMessageAt: conversationSnap.data().lastMessageAt?.toDate()
      };
    }

    // Create new conversation
    const newConversation = {
      participants: [currentUser.uid, otherUserId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: null,
      lastMessageAt: null,
      unreadCount: {
        [currentUser.uid]: 0,
        [otherUserId]: 0
      }
    };

    await setDoc(conversationRef, newConversation);
    
    return {
      id: conversationId,
      ...newConversation
    };
  } catch (error) {
    console.error('Error getting or creating conversation:', error);
    throw error;
  }
};

// Send a message
export const sendMessage = async (conversationId, text, requestId = null, attachments = []) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, 'messages');
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    
    // Create the message
    const message = {
      senderId: user.uid,
      text,
      requestId,
      read: false,
      readBy: [user.uid],
      attachments: Array.isArray(attachments) ? attachments : [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Add message to the conversation
    const messageRef = doc(messagesRef);
    await setDoc(messageRef, message);

    // Update conversation last message
    const snap = await getDoc(conversationRef);
    const convData = snap.data() || {};
    const participants = Array.isArray(convData.participants) ? convData.participants : [];
    const currentUnread = convData.unreadCount || {};
    const newUnread = { ...currentUnread };
    participants.forEach((pid) => {
      newUnread[pid] = pid === user.uid ? 0 : (Number(currentUnread[pid] || 0) + 1);
    });
    await updateDoc(conversationRef, {
      lastMessage: {
        text,
        senderId: user.uid,
        sentAt: serverTimestamp()
      },
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      unreadCount: newUnread
    });

    return {
      id: messageRef.id,
      ...message
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Get messages for a conversation
export const getMessages = async (conversationId, limitCount = 50) => {
  try {
    const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, 'messages');
    const q = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })).reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

// Mark messages as read
export const markMessagesAsRead = async (conversationId, messageIds) => {
  try {
    const batch = [];
    
    // Update each message
    for (const messageId of messageIds) {
      const messageRef = doc(db, CONVERSATIONS_COLLECTION, conversationId, 'messages', messageId);
      batch.push(updateDoc(messageRef, { read: true, updatedAt: serverTimestamp(), readBy: arrayUnion(auth.currentUser?.uid) }));
    }

    // Update unread count in conversation
    const user = auth.currentUser;
    if (user) {
      const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
      batch.push(
        updateDoc(conversationRef, {
          [`unreadCount.${user.uid}`]: 0,
          updatedAt: serverTimestamp()
        })
      );
    }

    await Promise.all(batch);
    return true;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

// Get user conversations
export const getUserConversations = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const q = query(
      collection(db, CONVERSATIONS_COLLECTION),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastMessage: doc.data().lastMessage ? {
        ...doc.data().lastMessage,
        sentAt: doc.data().lastMessage.sentAt?.toDate()
      } : null,
      lastMessageAt: doc.data().lastMessageAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting user conversations:', error);
    throw error;
  }
};

// Subscribe to the user's conversations in real time
export const subscribeToUserConversations = (callback) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where('participants', 'array-contains', user.uid),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
      lastMessage: docSnap.data().lastMessage ? {
        ...docSnap.data().lastMessage,
        sentAt: docSnap.data().lastMessage.sentAt?.toDate()
      } : null,
      lastMessageAt: docSnap.data().lastMessageAt?.toDate(),
      createdAt: docSnap.data().createdAt?.toDate(),
      updatedAt: docSnap.data().updatedAt?.toDate()
    }));
    const filtered = list.filter(c => !(c?.archivedBy && c.archivedBy[user.uid] === true));
    callback(filtered);
  });
};

// Subscribe to archived conversations for the current user
export const subscribeToArchivedConversations = (callback) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where('participants', 'array-contains', user.uid),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
      lastMessage: docSnap.data().lastMessage ? {
        ...docSnap.data().lastMessage,
        sentAt: docSnap.data().lastMessage.sentAt?.toDate()
      } : null,
      lastMessageAt: docSnap.data().lastMessageAt?.toDate(),
      createdAt: docSnap.data().createdAt?.toDate(),
      updatedAt: docSnap.data().updatedAt?.toDate()
    }));
    const archived = list.filter(c => c?.archivedBy && c.archivedBy[user.uid] === true);
    callback(archived);
  });
};

// Subscribe to messages in a conversation in real time (chronological order)
export const subscribeToMessages = (conversationId, callback) => {
  const messagesRef = collection(db, CONVERSATIONS_COLLECTION, conversationId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate(),
      updatedAt: docSnap.data().updatedAt?.toDate()
    }));
    callback(list);
  });
};
export const subscribeToConversation = (conversationId, callback) => {
  const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  return onSnapshot(conversationRef, (snap) => {
    callback({ id: snap.id, ...(snap.data() || {}) });
  });
};

// Subscribe to conversation list updates
export const subscribeToConversations = (callback) => {
  const user = auth.currentUser;
  if (!user) return () => {};

  const q = query(
    collection(db, CONVERSATIONS_COLLECTION),
    where('participants', 'array-contains', user.uid),
    orderBy('lastMessageAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastMessage: doc.data().lastMessage ? {
        ...doc.data().lastMessage,
        sentAt: doc.data().lastMessage.sentAt?.toDate()
      } : null,
      lastMessageAt: doc.data().lastMessageAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
    
    callback(conversations);
  });
};

// Set typing state for current user in a conversation
export const setTyping = async (conversationId, isTyping) => {
  try {
    const user = auth.currentUser;
    if (!user) return;
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    await updateDoc(conversationRef, { [`typing.${user.uid}`]: !!isTyping, updatedAt: serverTimestamp() });
  } catch (_) {
    // non-fatal
  }
};

// Archive conversation for the current user
export const archiveConversation = async (conversationId) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  await updateDoc(conversationRef, { [`archivedBy.${user.uid}`]: true, updatedAt: serverTimestamp() });
  return true;
};

// Soft delete a message in a conversation (keeps placeholder)
export const deleteMessage = async (conversationId, messageId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    const messageRef = doc(db, CONVERSATIONS_COLLECTION, conversationId, 'messages', messageId);
    await updateDoc(messageRef, {
      deleted: true,
      deletedBy: user.uid,
      deletedAt: serverTimestamp(),
      // Replace content to avoid leaking data
      text: '[deleted]',
      attachments: []
    });
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};
