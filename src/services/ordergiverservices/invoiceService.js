import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const INVOICES_COLLECTION = 'invoices';

// Get invoices for a given requestId
export const getInvoicesForRequest = async (requestId) => {
  const q = query(
    collection(db, INVOICES_COLLECTION),
    where('requestId', '==', requestId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get invoices for a given orderGiverId
export const getInvoicesForOrderGiver = async (orderGiverId) => {
  const q = query(
    collection(db, INVOICES_COLLECTION),
    where('orderGiverId', '==', orderGiverId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get invoices for a given providerId
export const getInvoicesForProvider = async (providerId) => {
  const q = query(
    collection(db, INVOICES_COLLECTION),
    where('providerId', '==', providerId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
