import { db, auth } from '../firebaseConfig';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';

const FEEDBACKS = 'feedbacks';

// Submit feedback from current user (order_giver or provider)
export const submitFeedback = async ({ subject = '', message = '', rating = null, role = null, relatedType = null, relatedId = null } = {}) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const id = `${user.uid}_${Date.now()}`;
  const ref = doc(db, FEEDBACKS, id);
  const payload = {
    userId: user.uid,
    email: user.email || '',
    role: role || 'order_giver',
    subject: String(subject || '').slice(0, 200),
    message: String(message || '').slice(0, 5000),
    rating: rating === null ? null : Number(rating),
    relatedType: relatedType || null, // e.g., 'request', 'provider', 'project'
    relatedId: relatedId || null,
    status: 'new', // new | in_review | resolved
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    adminNotes: []
  };
  await setDoc(ref, payload);
  return { id, ...payload };
};

// Admin: add note or update status
export const addAdminNote = async (feedbackId, note) => {
  const ref = doc(db, FEEDBACKS, feedbackId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Feedback not found');
  const existing = snap.data()?.adminNotes || [];
  const updated = [...existing, { note: String(note || '').slice(0, 1000), at: serverTimestamp() }];
  await updateDoc(ref, { adminNotes: updated, updatedAt: serverTimestamp() });
  return true;
};

export const setFeedbackStatus = async (feedbackId, status) => {
  const allowed = ['new', 'in_review', 'resolved'];
  const next = allowed.includes(status) ? status : 'in_review';
  await updateDoc(doc(db, FEEDBACKS, feedbackId), { status: next, updatedAt: serverTimestamp() });
  return true;
};

// Admin: get all feedback (optionally filter by role or status)
export const getAllFeedback = async ({ role = null, status = null, limitCount = 100 } = {}) => {
  let q = query(collection(db, FEEDBACKS), orderBy('createdAt', 'desc'));
  if (role) q = query(q, where('role', '==', role));
  if (status) q = query(q, where('status', '==', status));
  q = query(q, limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// User: get own feedback list
export const getMyFeedback = async (limitCount = 50) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  const q = query(collection(db, FEEDBACKS), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};