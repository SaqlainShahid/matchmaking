import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  limit,
  arrayUnion
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sendNotification } from '../notificationService';

const REQUESTS_COLLECTION = 'requests';
const QUOTES_COLLECTION = 'quotes';
const PROJECTS_COLLECTION = 'projects';
const INVOICES_COLLECTION = 'invoices';
const USERS_COLLECTION = 'users';

export const getProviderProfile = async (providerId) => {
  const refUser = doc(db, USERS_COLLECTION, providerId);
  const snap = await getDoc(refUser);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updateProviderProfile = async (providerId, updates) => {
  const refUser = doc(db, USERS_COLLECTION, providerId);
  await updateDoc(refUser, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  const snap = await getDoc(refUser);
  return { id: snap.id, ...snap.data() };
};

// Subscribe to requests matching service type and area (basic area filter on address substring)
export const subscribeToMatchingRequests = (serviceType, serviceArea, callback) => {
  let q = query(
    collection(db, REQUESTS_COLLECTION),
    where('serviceType', '==', serviceType),
    where('status', 'in', ['pending', 'in_progress'])
  );

  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.(),
        updatedAt: data.updatedAt?.toDate?.()
      };
    }).filter(r => {
      if (!serviceArea) return true;
      const addr = r?.location?.address || '';
      return typeof addr === 'string' ? addr.toLowerCase().includes(String(serviceArea).toLowerCase()) : true;
    });
    callback(list);
  });
};

// Temporary: subscribe to all open requests without matching filters
export const subscribeToProviderOpenRequests = (providerId, serviceType, serviceArea, callback) => {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where('status', 'in', ['pending', 'in_progress'])
  );
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.(),
        updatedAt: data.updatedAt?.toDate?.()
      };
    }).filter(req => {
      // Hide requests that are already assigned/accepted by another provider
      const isAssigned = !!(req.providerAssigned || req.providerId || req.acceptedQuoteId || req?.acceptedQuote?.providerId);
      const isAssignedToMe = (req.providerId === providerId) || (req?.acceptedQuote?.providerId === providerId);
      if (isAssigned && !isAssignedToMe) {
        return false;
      }
      // Additionally, if in_progress and not assigned to me, hide
      if (req.status === 'in_progress' && !isAssignedToMe) {
        return false;
      }
      // Basic area and type matching
      const matchesType = !serviceType || req.serviceType === serviceType;
      const areaText = String(serviceArea || '').toLowerCase();
      const addr = String(req?.location?.address || '').toLowerCase();
      const matchesArea = !areaText || addr.includes(areaText);
      return matchesType && matchesArea;
    });
    callback(list);
  });
};

export const sendQuote = async (providerId, requestId, { amount, duration, note, attachments = [] }) => {
  const quoteRef = doc(collection(db, QUOTES_COLLECTION));
  // Fetch request to attach clientId
  let clientId = null;
  try {
    const reqSnap = await getDoc(doc(db, REQUESTS_COLLECTION, requestId));
    clientId = reqSnap.data()?.createdBy || reqSnap.data()?.orderGiverId || null;
  } catch (_) {}

  const quote = {
    id: quoteRef.id,
    requestId,
    providerId,
    clientId,
    amount: Number(amount) || 0,
    duration: duration || '',
    note: note || '',
    status: 'pending',
    attachments,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(quoteRef, quote);

  // Notify order giver
  try {
    const requestSnap = await getDoc(doc(db, REQUESTS_COLLECTION, requestId));
    const reqData = requestSnap.data();
    const orderGiverId = reqData?.createdBy || reqData?.orderGiverId;
    if (orderGiverId) {
      await sendNotification(orderGiverId, 'NEW_QUOTE', {
        requestId,
        requestTitle: reqData?.title || 'Service Request'
      });
    }
  } catch (e) {
    console.warn('Quote created but notification failed:', e);
  }

  return quote;
};

export const subscribeToProviderQuotes = (providerId, callback) => {
  const q = query(
    collection(db, QUOTES_COLLECTION),
    where('providerId', '==', providerId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, async (snapshot) => {
    const list = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.(),
        updatedAt: data.updatedAt?.toDate?.()
      };
    });
    callback(list);
  });
};

export const subscribeToProviderProjects = (providerId, callback) => {
  const q = query(
    collection(db, PROJECTS_COLLECTION),
    where('providerId', '==', providerId),
    orderBy('updatedAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.(),
        updatedAt: data.updatedAt?.toDate?.()
      };
    });
    callback(list);
  });
};

export const updateProjectProgress = async (projectId, progress, updates = {}) => {
  const refProject = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(refProject, {
    progress: Number(progress) || 0,
    ...updates,
    updatedAt: serverTimestamp()
  });
  const snap = await getDoc(refProject);
  const proj = { id: snap.id, ...snap.data() };

  // If completed, send payment/invoice notification to order giver
  if ((proj.status === 'completed') || (Number(proj.progress) >= 100)) {
    try {
      const requestId = proj.requestId;
      const reqSnap = requestId ? await getDoc(doc(db, REQUESTS_COLLECTION, requestId)) : null;
      const orderGiverId = reqSnap?.data()?.createdBy || reqSnap?.data()?.orderGiverId;
      if (orderGiverId) {
        await sendNotification(orderGiverId, 'REQUEST_UPDATED', {
          requestId,
          requestTitle: reqSnap?.data()?.title || 'Service Request'
        });
      }
    } catch (_) {}
  }
  return proj;
};

export const generateInvoice = async (projectId, overrides = {}) => {
  // Create base invoice document in Firestore
  const invoiceRef = doc(collection(db, INVOICES_COLLECTION));
  const projSnap = await getDoc(doc(db, PROJECTS_COLLECTION, projectId));
  const proj = projSnap.data() || {};

  // Allow provider to override amount, currency, or add a note
  const amount = Number(overrides.amount ?? proj.budget) || 0;
  const currency = overrides.currency || proj.currency || 'EUR';
  const note = overrides.note || '';

  const baseInvoice = {
    id: invoiceRef.id,
    projectId,
    providerId: proj.providerId,
    orderGiverId: proj.clientId || proj.orderGiverId,
    amount,
    currency,
    note,
    status: 'generated',
    date: serverTimestamp(),
    invoiceUrl: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(invoiceRef, baseInvoice);

  // Compose invoice PDF contents
  const docPdf = new jsPDF();

  const title = 'Invoice';
  docPdf.setFontSize(18);
  docPdf.text(title, 14, 20);

  docPdf.setFontSize(11);
  const issuedDate = new Date().toLocaleDateString();
  docPdf.text(`Invoice ID: ${invoiceRef.id}`, 14, 30);
  docPdf.text(`Issued: ${issuedDate}`, 14, 36);

  // Provider & Client details
  try {
    const providerProfile = proj.providerId ? await getDoc(doc(db, USERS_COLLECTION, proj.providerId)) : null;
    const orderGiverProfile = baseInvoice.orderGiverId ? await getDoc(doc(db, USERS_COLLECTION, baseInvoice.orderGiverId)) : null;
    const providerName = providerProfile?.data()?.companyName || providerProfile?.data()?.displayName || 'Service Provider';
    const clientName = orderGiverProfile?.data()?.displayName || 'Client';

    docPdf.text(`From: ${providerName}`, 14, 46);
    docPdf.text(`To: ${clientName}`, 14, 52);
  } catch (_) {
    // Fallback names already set above
  }

  // Line items table (simple single line item for project)
  const lineItems = [
    [
      proj.title || 'Service Project',
      proj.description ? String(proj.description).slice(0, 80) : '-',
      baseInvoice.currency,
      String(Number(proj.budget) || 0)
    ]
  ];
  autoTable(docPdf, {
    head: [['Item', 'Description', 'Currency', 'Amount']],
    body: lineItems,
    startY: 62
  });

  // Totals
  const finalAmount = Number(baseInvoice.amount) || 0;
  const totalsY = (docPdf.lastAutoTable?.finalY || 62) + 10;
  docPdf.setFontSize(12);
  docPdf.text(`Total: ${baseInvoice.currency} ${finalAmount}`, 14, totalsY);

  // Terms
  docPdf.setFontSize(9);
  docPdf.text(
    'Payment due within 14 days. Thank you for your business.',
    14,
    totalsY + 8
  );

  // Upload PDF to Storage
  const pdfBlob = docPdf.output('blob');
  const storageRef = ref(storage, `invoices/${invoiceRef.id}.pdf`);
  await uploadBytes(storageRef, pdfBlob, { contentType: 'application/pdf' });
  const url = await getDownloadURL(storageRef);

  // Update Firestore with URL
  await updateDoc(invoiceRef, { invoiceUrl: url, updatedAt: serverTimestamp() });

  // Send notification to order giver
  try {
    const requestId = proj.requestId;
    if (baseInvoice.orderGiverId) {
      await sendNotification(baseInvoice.orderGiverId, 'INVOICE_GENERATED', {
        requestId: requestId || '',
        requestTitle: proj.title || 'Service Request',
        invoiceId: invoiceRef.id,
        invoiceUrl: url
      });
    }
  } catch (e) {
    console.warn('Invoice generated, order giver notification failed:', e);
  }

  // Return the updated invoice data
  const updatedSnap = await getDoc(invoiceRef);
  return { id: updatedSnap.id, ...updatedSnap.data() };
};

export const subscribeToProviderInvoices = (providerId, callback) => {
  const q = query(
    collection(db, INVOICES_COLLECTION),
    where('providerId', '==', providerId),
    orderBy('date', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        date: data.date?.toDate?.(),
        createdAt: data.createdAt?.toDate?.(),
        updatedAt: data.updatedAt?.toDate?.()
      };
    });
    callback(list);
  });
};

export const uploadProviderFile = async (file, path = 'provider_docs') => {
  const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { name: file.name, url };
};

export const addProjectPhoto = async (projectId, file) => {
  const uploaded = await uploadProviderFile(file, 'project_photos');
  const refProject = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(refProject, {
    photos: arrayUnion({ url: uploaded.url, name: uploaded.name, uploadedAt: serverTimestamp() }),
    updatedAt: serverTimestamp()
  });
  const snap = await getDoc(refProject);
  return { id: snap.id, ...snap.data() };
};

export const addProjectComment = async (projectId, text) => {
  const refProject = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(refProject, {
    comments: arrayUnion({ text, createdAt: serverTimestamp() }),
    updatedAt: serverTimestamp()
  });
  const snap = await getDoc(refProject);
  return { id: snap.id, ...snap.data() };
};

// Mark invoice as paid and complete the job
export const markInvoicePaid = async (invoiceId) => {
  try {
    const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);
    if (!invoiceSnap.exists()) throw new Error('Invoice not found');
    const invoice = invoiceSnap.data();

    await updateDoc(invoiceRef, { status: 'paid', updatedAt: serverTimestamp() });

    // Update project status
    if (invoice.projectId) {
      const projectRef = doc(db, PROJECTS_COLLECTION, invoice.projectId);
      const projectSnap = await getDoc(projectRef);
      const project = projectSnap.data() || {};
      await updateDoc(projectRef, { status: 'completed', progress: 100, updatedAt: serverTimestamp() });

      // Update request status
      if (project.requestId) {
        const requestRef = doc(db, REQUESTS_COLLECTION, project.requestId);
        await updateDoc(requestRef, { status: 'completed', updatedAt: serverTimestamp() });

        // Send notifications
        try {
          if (invoice.providerId) {
            await sendNotification(invoice.providerId, 'PAYMENT_COMPLETED', {
              amount: String(invoice.amount || 0),
              requestId: project.requestId,
              requestTitle: project.title || 'Service Request'
            });
          }
          if (invoice.orderGiverId) {
            await sendNotification(invoice.orderGiverId, 'REQUEST_UPDATED', {
              requestId: project.requestId,
              requestTitle: project.title || 'Service Request'
            });
          }
        } catch (_) {}
      }
    }

    return true;
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    throw error;
  }
};