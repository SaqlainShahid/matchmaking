import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const SERVICES_COLLECTION = 'services';

export const createService = async (providerId, service) => {
  const ref = doc(collection(db, SERVICES_COLLECTION));
  const payload = {
    providerId,
    title: String(service.title || '').trim(),
    category: String(service.category || '').trim(),
    description: String(service.description || '').trim(),
    price: Number(service.price || 0),
    currency: String(service.currency || 'USD'),
    status: service.status || 'draft',
    images: Array.isArray(service.images) ? service.images : [],
    tags: Array.isArray(service.tags) ? service.tags : [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(ref, payload);
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
};

export const getProviderServices = async (providerId, filters = {}) => {
  let qCol = query(collection(db, SERVICES_COLLECTION), where('providerId', '==', providerId));
  if (filters.status) {
    qCol = query(qCol, where('status', '==', filters.status));
  }
  // Firestore requires orderBy to be last; create another query for ordering
  qCol = query(qCol, orderBy('updatedAt', 'desc'));
  const snap = await getDocs(qCol);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateService = async (serviceId, updates) => {
  const ref = doc(db, SERVICES_COLLECTION, serviceId);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
};

export const getServiceById = async (serviceId) => {
  const ref = doc(db, SERVICES_COLLECTION, serviceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const deleteServiceById = async (serviceId) => {
  const ref = doc(db, SERVICES_COLLECTION, serviceId);
  await deleteDoc(ref);
  return true;
};

export const setServiceStatus = async (serviceId, status) => {
  return updateService(serviceId, { status });
};

export const publishService = async (serviceId) => setServiceStatus(serviceId, 'published');
export const unpublishService = async (serviceId) => setServiceStatus(serviceId, 'draft');