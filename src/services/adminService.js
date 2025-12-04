import { db, storage } from '../firebaseConfig';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { sendNotification, createNotification } from './notificationService';
import { ref, listAll, getDownloadURL } from 'firebase/storage';

const USERS = 'users';
const REQUESTS = 'requests';
const QUOTES = 'quotes';
const INVOICES = 'invoices';
const PROJECTS = 'projects';
const DISPUTES = 'disputes';
const CONFIGS = 'configurations';

// Users
export const getAllUsers = async (filters = {}) => {
  let q = query(collection(db, USERS));
  if (filters.role) q = query(q, where('role', '==', filters.role));
  if (typeof filters.suspended === 'boolean') q = query(q, where('suspended', '==', filters.suspended));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateUserRole = async (userId, role) => {
  const ref = doc(db, USERS, userId);
  await updateDoc(ref, { role, updatedAt: serverTimestamp() });
  const s = await getDoc(ref); return { id: s.id, ...s.data() };
};

export const setUserSuspended = async (userId, suspended = true) => {
  const ref = doc(db, USERS, userId);
  await updateDoc(ref, { suspended, updatedAt: serverTimestamp() });
  return true;
};

export const deleteUserById = async (userId) => {
  await deleteDoc(doc(db, USERS, userId));
  return true;
};

// Aliases for UI imports
export const suspendUser = async (userId) => setUserSuspended(userId, true);
export const deleteUser = deleteUserById;

// Provider Verification
export const getProvidersForVerification = async (status = 'pending') => {
  // Fetch providers by role. Do not filter by verificationStatus in Firestore
  // so that users without the field still show up as pending.
  const q = query(collection(db, USERS), where('role', 'in', ['service_provider', 'provider', 'serviceProvider']));
  const snap = await getDocs(q);
  const providers = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (!status) return providers;

  if (status === 'pending') {
    return providers.filter(p => {
      const vs = p.verificationStatus;
      const verified = p.verified === true;
      return !(vs === 'approved' || vs === 'rejected' || verified);
    });
  }

  return providers.filter(p => p.verificationStatus === status);
};

export const setProviderVerification = async (userId, verificationStatus) => {
  const ref = doc(db, USERS, userId);
  await updateDoc(ref, { verificationStatus, verified: verificationStatus === 'approved', updatedAt: serverTimestamp() });
  await sendNotification(userId, 'REQUEST_UPDATED', { requestTitle: 'Verification', requestId: '' }).catch(() => null);
  return true;
};

// Aliases and helpers for provider verification
export const getProvidersPendingVerification = async () => getProvidersForVerification('pending');
export const verifyProvider = async (userId) => setProviderVerification(userId, 'approved');
export const rejectProvider = async (userId) => setProviderVerification(userId, 'rejected');

// Generic verification for any user role
export const setUserVerification = async (userId, status = 'approved') => {
  const ref = doc(db, USERS, userId);
  await updateDoc(ref, { verificationStatus: status, verified: status === 'approved', updatedAt: serverTimestamp() });
  return true;
};

// Hard delete user and related data across collections
export const deleteUserAndData = async (userId) => {
  await getDoc(doc(db, USERS, userId)).catch(() => null);

  // Helper to delete docs by query
  const deleteByQuery = async (col, clauses = []) => {
    let qCol = collection(db, col);
    for (const c of clauses) {
      qCol = query(qCol, where(c.field, c.op || '==', c.value));
    }
    const snap = await getDocs(qCol).catch(() => null);
    if (!snap) return;
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref).catch(() => null)));
  };

  // Collect requests by this user (order giver variants)
  let requestIds = [];
  const rq1 = await getDocs(query(collection(db, REQUESTS), where('createdBy', '==', userId))).catch(() => null);
  const rq2 = await getDocs(query(collection(db, REQUESTS), where('orderGiverId', '==', userId))).catch(() => null);
  requestIds = [...(rq1?.docs || []), ...(rq2?.docs || [])].map(d => d.id);

  // Delete quotes tied to those requests
  for (const rid of requestIds) {
    await deleteByQuery(QUOTES, [{ field: 'requestId', value: rid }]);
  }

  // Delete requests
  await Promise.all(requestIds.map(rid => deleteDoc(doc(db, REQUESTS, rid)).catch(() => null)));

  // Delete direct quotes by clientId or providerId
  await deleteByQuery(QUOTES, [{ field: 'clientId', value: userId }]);
  await deleteByQuery(QUOTES, [{ field: 'providerId', value: userId }]);

  // Delete provider services if any
  await deleteByQuery('services', [{ field: 'providerId', value: userId }]);

  // Delete invoices, projects possibly associated
  await deleteByQuery(INVOICES, [{ field: 'clientId', value: userId }]);
  await deleteByQuery(INVOICES, [{ field: 'providerId', value: userId }]);
  await deleteByQuery(PROJECTS, [{ field: 'clientId', value: userId }]);
  await deleteByQuery(PROJECTS, [{ field: 'providerId', value: userId }]);
  await deleteByQuery(PROJECTS, [{ field: 'ownerId', value: userId }]);

  // Delete disputes if any
  await deleteByQuery(DISPUTES, [{ field: 'clientId', value: userId }]);
  await deleteByQuery(DISPUTES, [{ field: 'providerId', value: userId }]);

  await deleteDoc(doc(db, USERS, userId)).catch(() => null);
  return true;
};

export const getProviderDocuments = async (providerId) => {
  try {
    const basePath = `provider_docs/${providerId}`;
    const folderRef = ref(storage, basePath);
    const res = await listAll(folderRef);
    const files = await Promise.all(res.items.map(async (itemRef) => {
      const url = await getDownloadURL(itemRef);
      return { name: itemRef.name, url };
    }));
    return files;
  } catch {
    try {
      const folderRef = ref(storage, `provider_docs`);
      await listAll(folderRef);
      return [];
    } catch {
      return [];
    }
  }
};

// Requests
export const getAllRequests = async (status = null) => {
  let q;
  if (status) {
    q = query(collection(db, REQUESTS), where('status', '==', status), orderBy('createdAt', 'desc'));
  } else {
    q = query(collection(db, REQUESTS), orderBy('createdAt', 'desc'));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateRequestStatusAdmin = async (requestId, status) => {
  const ref = doc(db, REQUESTS, requestId);
  await updateDoc(ref, { status, updatedAt: serverTimestamp() });
  return true;
};

export const deleteRequestByAdmin = async (requestId) => {
  await deleteDoc(doc(db, REQUESTS, requestId));
  return true;
};

// Aliases for UI imports
export const updateRequestStatus = updateRequestStatusAdmin;
export const deleteRequest = deleteRequestByAdmin;

// Quotes
export const getAllQuotes = async (status = null) => {
  let q = collection(db, QUOTES);
  if (status) q = query(q, where('status', '==', status));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateQuoteStatusAdmin = async (quoteId, status) => {
  const ref = doc(db, QUOTES, quoteId);
  await updateDoc(ref, { status, updatedAt: serverTimestamp() });
  return true;
};

// Alias
export const setQuoteStatus = updateQuoteStatusAdmin;

// Invoices / Payments
export const getAllInvoices = async (status = null) => {
  let q = collection(db, INVOICES);
  if (status) q = query(q, where('status', '==', status));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const markInvoicePaidAdmin = async (invoiceId) => {
  const ref = doc(db, INVOICES, invoiceId);
  await updateDoc(ref, { status: 'paid', updatedAt: serverTimestamp() });
  return true;
};

// Alias
export const markInvoicePaid = markInvoicePaidAdmin;

// Stripe sync placeholder
export const syncStripe = async () => {
  console.warn('syncStripe not implemented: add cloud function or backend handler');
  return true;
};

// Notifications
export const sendNotificationToUsers = async (userIds = [], type, data) => {
  const results = [];
  for (const uid of userIds) {
    const res = await sendNotification(uid, type, data).catch(() => null);
    if (res !== null) results.push(res);
  }
  return results;
};

// Admin notifications
export const sendBroadcastNotification = async ({ title, body, roles = null } = {}) => {
  // Fetch users (optionally by role) and create notification entries
  let q = query(collection(db, USERS));
  if (roles && Array.isArray(roles) && roles.length > 0) {
    // Firestore doesn't support 'in' with large lists well; if needed, call multiple times
    const snaps = await Promise.all(roles.map(r => getDocs(query(collection(db, USERS), where('role', '==', r)))));
    const users = snaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
    await Promise.all(users.map(u => createNotification({ userId: u.id, type: 'ADMIN_BROADCAST', title, body, data: {}, read: false })));
    return true;
  } else {
    const snap = await getDocs(q);
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    await Promise.all(users.map(u => createNotification({ userId: u.id, type: 'ADMIN_BROADCAST', title, body, data: {}, read: false })));
    return true;
  }
};

export const sendTargetedNotification = async (userId, { title, body, data = {} }) => {
  await createNotification({ userId, type: 'ADMIN_MESSAGE', title, body, data, read: false });
  return true;
};

export const getNotifications = async (limitCount = 50) => {
  const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Analytics
export const getAdminAnalyticsSummary = async () => {
  const [users, providers, requests, quotes, invoices] = await Promise.all([
    getAllUsers(),
    getAllUsers({ role: 'service_provider' }),
    getAllRequests(),
    getAllQuotes(),
    getAllInvoices()
  ]);
  const revenue = invoices.reduce((sum, i) => sum + (i.status === 'paid' ? Number(i.amount || 0) : 0), 0);
  return {
    users: users.length,
    providers: providers.length,
    requests: requests.length,
    quotes: quotes.length,
    invoices: invoices.length,
    revenue
  };
};

// --- Analytics snapshots and trend helpers ---
const monthKeyFromDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const resolveTimestampDate = (obj, preferredFields = ['paidAt', 'updatedAt', 'createdAt']) => {
  for (const field of preferredFields) {
    const v = obj?.[field];
    if (v?.toDate) return v.toDate();
    if (v instanceof Date) return v;
  }
  return new Date();
};

const sortAndSliceSeries = (map, months = 12) => {
  const keys = Array.from(map.keys()).sort();
  const sliced = keys.slice(Math.max(0, keys.length - months));
  return sliced.map((k) => ({ key: k, value: map.get(k) || 0 }));
};

export const getMonthlyRevenueSnapshot = async (months = 12) => {
  const invoices = await getAllInvoices();
  const byMonth = new Map();
  invoices.forEach((inv) => {
    if (inv.status !== 'paid') return;
    const d = resolveTimestampDate(inv, ['paidAt', 'updatedAt', 'createdAt']);
    const key = monthKeyFromDate(d);
    byMonth.set(key, (byMonth.get(key) || 0) + Number(inv.amount || 0));
  });
  return sortAndSliceSeries(byMonth, months);
};

export const getMonthlyUsersSnapshot = async (months = 12) => {
  const users = await getAllUsers();
  const byMonth = new Map();
  users.forEach((u) => {
    const d = resolveTimestampDate(u, ['createdAt']);
    const key = monthKeyFromDate(d);
    byMonth.set(key, (byMonth.get(key) || 0) + 1);
  });
  return sortAndSliceSeries(byMonth, months);
};

export const getMonthlyRequestsSnapshot = async (months = 12) => {
  const requests = await getAllRequests();
  const byMonth = new Map();
  requests.forEach((r) => {
    const d = resolveTimestampDate(r, ['createdAt']);
    const key = monthKeyFromDate(d);
    byMonth.set(key, (byMonth.get(key) || 0) + 1);
  });
  return sortAndSliceSeries(byMonth, months);
};

export const computeTimeSeriesTrends = (series = []) => {
  if (!Array.isArray(series) || series.length === 0) {
    return { current: 0, previous: null, mom: null, yoy: null };
  }
  const last = series[series.length - 1];
  const prev = series[series.length - 2] || null;
  const current = Number(last?.value || 0);
  const previous = prev ? Number(prev.value || 0) : null;

  const pct = (a, b) => {
    if (b === null || b === undefined) return null;
    if (b === 0) return a > 0 ? 100 : 0; // define +100% when rising from zero
    return ((a - b) / b) * 100;
  };

  // MoM change
  const mom = pct(current, previous);

  // YoY: find same month last year
  let yoy = null;
  const [yStr, mStr] = String(last?.key || '').split('-');
  if (yStr && mStr) {
    const yoyKey = `${Number(yStr) - 1}-${mStr.padStart(2, '0')}`;
    const yoyItem = series.find((s) => s.key === yoyKey);
    const yoyPrev = yoyItem ? Number(yoyItem.value || 0) : null;
    yoy = pct(current, yoyPrev);
  }

  return { current, previous, mom, yoy };
};

// Disputes
export const getAllDisputes = async () => {
  const snap = await getDocs(collection(db, DISPUTES));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const resolveDispute = async (disputeId, resolution) => {
  const ref = doc(db, DISPUTES, disputeId);
  await updateDoc(ref, { status: 'resolved', resolution, resolvedAt: serverTimestamp() });
  return true;
};

// Configurations
export const getPlatformConfigs = async () => {
  const snap = await getDocs(collection(db, CONFIGS));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const setPlatformConfig = async (key, value) => {
  const ref = doc(db, CONFIGS, key);
  await setDoc(ref, { key, value, updatedAt: serverTimestamp() }, { merge: true });
  return true;
};

// Helpers matching UI imports
export const getPlatformConfig = async () => {
  const items = await getPlatformConfigs();
  const acc = {};
  for (const item of items) {
    if (item && item.key !== undefined) acc[item.key] = item.value;
  }
  return acc;
};

export const updatePlatformConfig = async (configObj = {}) => {
  const entries = Object.entries(configObj || {});
  await Promise.all(entries.map(([key, value]) => setPlatformConfig(key, value)));
  return true;
};
