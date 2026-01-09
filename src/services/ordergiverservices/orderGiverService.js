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
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { sendNotification } from '../notificationService';
import { v4 as uuidv4 } from 'uuid';

// Collection names
const REQUESTS_COLLECTION = 'requests';
const QUOTES_COLLECTION = 'quotes';
const PROJECTS_COLLECTION = 'projects';
const USERS_COLLECTION = 'users';
const INVOICES_COLLECTION = 'invoices';

// ==================== REQUESTS ====================

export const createRequest = async (userId, requestData) => {
  try {
    const requestRef = doc(collection(db, REQUESTS_COLLECTION));
    // Normalize and include creator's display info when available
    const requestWithMetadata = {
      ...requestData,
      id: requestRef.id,
      createdBy: userId,
      createdByName: requestData.clientName || requestData.createdByName || requestData.clientName || null,
      createdByEmail: requestData.clientEmail || requestData.createdByEmail || null,
      status: requestData.status || 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      responses: 0,
      providerAssigned: false
    };

    await setDoc(requestRef, requestWithMetadata);
    
    // Add request ID to user's requests array
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      requests: arrayUnion(requestRef.id),
      updatedAt: serverTimestamp()
    });

    return { id: requestRef.id, ...requestWithMetadata };
  } catch (error) {
    console.error('Error creating request:', error);
    throw error;
  }
};

export const getRequestById = async (requestId) => {
  try {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (requestSnap.exists()) {
      return { id: requestSnap.id, ...requestSnap.data() };
    } else {
      throw new Error('Request not found');
    }
  } catch (error) {
    console.error('Error getting request:', error);
    throw error;
  }
};

export const getUserRequests = async (userId, statut = null) => {
  try {
    // We need to support requests where the user may be referenced in either `createdBy` or `orderGiverId`.
    const resultsMap = new Map();

    // Helper to run a query and populate map
    const runQuery = async (clauses) => {
      let q = collection(db, 'requests');
      for (const c of clauses) {
        q = query(q, where(c.field, c.op || '==', c.value));
      }
      const snap = await getDocs(q);
      snap.docs.forEach(d => resultsMap.set(d.id, { id: d.id, ...d.data() }));
    };

    if (statut) {
      // Support both 'status' and legacy 'statut' fields
      await Promise.all([
        runQuery([{ field: 'createdBy', value: userId }, { field: 'status', value: statut }]),
        runQuery([{ field: 'createdBy', value: userId }, { field: 'statut', value: statut }]),
        runQuery([{ field: 'orderGiverId', value: userId }, { field: 'status', value: statut }]),
        runQuery([{ field: 'orderGiverId', value: userId }, { field: 'statut', value: statut }])
      ]);
    } else {
      await Promise.all([
        runQuery([{ field: 'createdBy', value: userId }]),
        runQuery([{ field: 'orderGiverId', value: userId }])
      ]);
    }

    const results = Array.from(resultsMap.values()).map(r => ({
      ...r,
      createdAt: r.createdAt?.toDate?.() || r.createdAt,
      updatedAt: r.updatedAt?.toDate?.() || r.updatedAt
    }));

    // Sort by createdAt desc
    results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return results;
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    throw error;
  }
};

export const updateRequest = async (requestId, updates) => {
  try {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    await updateDoc(requestRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    const updatedDoc = await getDoc(requestRef);
    return { id: updatedDoc.id, ...updatedDoc.data() };
  } catch (error) {
    console.error('Error updating request:', error);
    throw error;
  }
};

export const deleteRequest = async (userId, requestId) => {
  try {
    // First, check if the request exists and belongs to the user
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }
    
    if (requestSnap.data().createdBy !== userId) {
      throw new Error('Unauthorized: You can only delete your own requests');
    }
    
    // Delete the request
    await deleteDoc(requestRef);
    
    // Remove request ID from user's requests array
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      requests: arrayRemove(requestId),
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting request:', error);
    throw error;
  }
};

// ==================== QUOTES ====================

export const getQuotesForUser = async (userId, status = null) => {
  try {
    // Prefer direct query by clientId to avoid 'in' limits
    let quotesQuery;
    if (status) {
      quotesQuery = query(
        collection(db, QUOTES_COLLECTION),
        where('clientId', '==', userId),
        where('status', '==', status)
      );
    } else {
      quotesQuery = query(
        collection(db, QUOTES_COLLECTION),
        where('clientId', '==', userId)
      );
    }

    const quotesSnapshot = await getDocs(quotesQuery);

    const quotesWithDetails = await Promise.all(
      quotesSnapshot.docs.map(async (docSnap) => {
        const quoteData = docSnap.data();
        const providerRef = doc(db, USERS_COLLECTION, quoteData.providerId);
        const providerSnap = await getDoc(providerRef);

        const requestRef = doc(db, REQUESTS_COLLECTION, quoteData.requestId);
        const requestSnap = await getDoc(requestRef);

        return {
          id: docSnap.id,
          ...quoteData,
          providerName: providerSnap.data()?.displayName || 'Unknown',
          providerEmail: providerSnap.data()?.email || '',
          providerPhone: providerSnap.data()?.phoneNumber || '',
          companyName: providerSnap.data()?.companyName || '',
          requestTitle: requestSnap.data()?.title || 'Untitled Request',
          createdAt: quoteData.createdAt?.toDate(),
          updatedAt: quoteData.updatedAt?.toDate(),
          expiresAt: quoteData.expiresAt?.toDate(),
          estimatedCompletion: quoteData.estimatedCompletion?.toDate()
        };
      })
    );

    quotesWithDetails.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
    return quotesWithDetails;
  } catch (error) {
    console.error('Error getting user quotes:', error);
    throw error;
  }
};

export const getQuoteById = async (quoteId) => {
  try {
    const quoteRef = doc(db, QUOTES_COLLECTION, quoteId);
    const quoteSnap = await getDoc(quoteRef);
    if (!quoteSnap.exists()) throw new Error('Quote not found');
    const quoteData = quoteSnap.data();

    // Provider details
    const providerRef = doc(db, USERS_COLLECTION, quoteData.providerId);
    const providerSnap = await getDoc(providerRef);

    // Request details
    const requestRef = doc(db, REQUESTS_COLLECTION, quoteData.requestId);
    const requestSnap = await getDoc(requestRef);

    return {
      id: quoteSnap.id,
      ...quoteData,
      providerName: providerSnap.data()?.displayName || 'Unknown',
      requestTitle: requestSnap.data()?.title || 'Untitled Request'
    };
  } catch (error) {
    console.error('Error getting quote by id:', error);
    throw error;
  }
};

export const updateQuoteStatus = async (quoteId, status, userId) => {
  try {
    const quoteRef = doc(db, QUOTES_COLLECTION, quoteId);
    const quoteSnap = await getDoc(quoteRef);
    
    if (!quoteSnap.exists()) {
      throw new Error('Quote not found');
    }
    
    const quoteData = quoteSnap.data();
    
    // Get the request to verify ownership
    const requestRef = doc(db, REQUESTS_COLLECTION, quoteData.requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }
    
    if (requestSnap.data().createdBy !== userId) {
      throw new Error('Unauthorized: You can only update quotes for your own requests');
    }
    
    // Update the quote status
    await updateDoc(quoteRef, {
      status,
      updatedAt: serverTimestamp()
    });
    
    // If quote is accepted, update the request and create/update project
    if (status === 'accepted') {
      // Update request status and set the accepted quote
      await updateDoc(requestRef, {
        status: 'in_progress',
        acceptedQuoteId: quoteId,
        providerId: quoteData.providerId,
        providerAssigned: true,
        updatedAt: serverTimestamp()
      });
      
      // Create or update project
      await createOrUpdateProject({
        requestId: quoteData.requestId,
        providerId: quoteData.providerId,
        quoteId: quoteId,
        clientId: requestSnap.data().createdBy,
        title: requestSnap.data().title,
        description: requestSnap.data().description,
        serviceType: requestSnap.data().serviceType,
        location: requestSnap.data().location,
        budget: Number(quoteData.amount ?? quoteData.price ?? 0),
        status: 'active',
        startedAt: serverTimestamp(),
        dueDate: quoteData?.estimatedCompletion ?? null
      });
      
      // Reject all other quotes for this request
      const otherQuotesQuery = query(
        collection(db, QUOTES_COLLECTION),
        where('requestId', '==', quoteData.requestId),
        where('status', '==', 'pending')
      );
      
      const otherQuotesSnapshot = await getDocs(otherQuotesQuery);
      const updatePromises = otherQuotesSnapshot.docs
        .filter(doc => doc.id !== quoteId)
        .map(doc => 
          updateDoc(doc.ref, {
            status: 'rejected',
            updatedAt: serverTimestamp(),
            rejectionReason: 'Another quote was accepted for this request.'
          })
        );
      
      await Promise.all(updatePromises);

      // Notify provider of acceptance
      try {
        await sendNotification(quoteData.providerId, 'QUOTE_ACCEPTED', {
          requestId: quoteData.requestId,
          requestTitle: requestSnap.data()?.title || 'Service Request'
        });
      } catch (e) {
        console.warn('Quote accepted, provider notification failed:', e);
      }
    }
    
    // Get the updated quote with provider details
    const updatedQuoteSnap = await getDoc(quoteRef);
    const providerRef = doc(db, USERS_COLLECTION, quoteData.providerId);
    const providerSnap = await getDoc(providerRef);
    
    return {
      id: updatedQuoteSnap.id,
      ...updatedQuoteSnap.data(),
      providerName: providerSnap.data()?.displayName || 'Unknown',
      providerEmail: providerSnap.data()?.email || '',
      providerPhone: providerSnap.data()?.phoneNumber || '',
      companyName: providerSnap.data()?.companyName || '',
      // Convert Firestore timestamps to Date objects
      createdAt: updatedQuoteSnap.data().createdAt?.toDate(),
      updatedAt: updatedQuoteSnap.data().updatedAt?.toDate(),
      expiresAt: updatedQuoteSnap.data().expiresAt?.toDate(),
      estimatedCompletion: updatedQuoteSnap.data().estimatedCompletion?.toDate()
    };
  } catch (error) {
    console.error('Error updating quote status:', error);
    throw error;
  }
};

// ==================== INVOICES (Order Giver) ====================

// Create invoice for an accepted quote (if not exists)
export const createInvoiceForAcceptedQuote = async (quoteId) => {
  try {
    const quoteRef = doc(db, QUOTES_COLLECTION, quoteId);
    const quoteSnap = await getDoc(quoteRef);
    if (!quoteSnap.exists()) throw new Error('Quote not found');
    const quote = quoteSnap.data();

    // Find project by quoteId
    const projQuery = query(
      collection(db, PROJECTS_COLLECTION),
      where('quoteId', '==', quoteId)
    );
    const projSnap = await getDocs(projQuery);
    if (projSnap.empty) throw new Error('Project not found for quote');
    const projDoc = projSnap.docs[0];
    const proj = { id: projDoc.id, ...projDoc.data() };

    // Resolve order giver id robustly
    let orderGiverId = proj.clientId || proj.orderGiverId || quote.clientId;
    if (!orderGiverId) {
      try {
        const requestRef = doc(db, REQUESTS_COLLECTION, quote.requestId);
        const requestSnap = await getDoc(requestRef);
        orderGiverId = requestSnap.data()?.createdBy || null;
      } catch (_) {
        orderGiverId = null;
      }
    }

    // Check for existing invoice
    const invQuery = query(
      collection(db, INVOICES_COLLECTION),
      where('projectId', '==', proj.id)
    );
    const invSnap = await getDocs(invQuery);
    if (!invSnap.empty) {
      return { id: invSnap.docs[0].id, ...invSnap.docs[0].data() };
    }

    // Calculate amounts
    const providerAmount = Number(proj.budget) || Number(quote.amount) || 0;
    const clientAmount = Math.round(providerAmount * 1.2 * 100) / 100; // 20% margin, rounded to 2 decimals
    const commission = Math.round((clientAmount - providerAmount) * 100) / 100;

    // Create new invoice
    const invoiceRef = doc(collection(db, INVOICES_COLLECTION));
    const invoice = {
      id: invoiceRef.id,
      projectId: proj.id,
      providerId: proj.providerId,
      orderGiverId,
      providerAmount,
      clientAmount,
      commission,
      status: 'pending_payment',
      date: serverTimestamp(),
      invoiceUrl: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      quoteId: quoteId,
      requestId: proj.requestId
    };
    await setDoc(invoiceRef, invoice);
    
    // Notify provider and order giver (optional)
    try {
      if (invoice.orderGiverId) {
        await sendNotification(invoice.orderGiverId, 'INVOICE_GENERATED', {
          requestId: proj.requestId || '',
          requestTitle: proj.title || 'Service Request'
        });
      }
    } catch (_) {}

    return invoice;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

// Mark invoice as paid and finalize statuses
export const markInvoicePaidByOrderGiver = async (invoiceId) => {
  try {
    const invoiceRef = doc(db, INVOICES_COLLECTION, invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);
    if (!invoiceSnap.exists()) throw new Error('Invoice not found');
    const invoice = invoiceSnap.data();

    await updateDoc(invoiceRef, { status: 'paid', updatedAt: serverTimestamp() });

    // Update project
    if (invoice.projectId) {
      const projectRef = doc(db, PROJECTS_COLLECTION, invoice.projectId);
      const projectSnap = await getDoc(projectRef);
      const project = projectSnap.data() || {};
      // Payment marks project as active/in_progress, not immediately completed
      await updateDoc(projectRef, { status: 'active', progress: Number(project.progress ?? 0), updatedAt: serverTimestamp() });

      // Update request
      if (project.requestId) {
        const requestRef = doc(db, REQUESTS_COLLECTION, project.requestId);
        await updateDoc(requestRef, { status: 'in_progress', updatedAt: serverTimestamp() });
      }

      // Notifications
      try {
        if (invoice.providerId) {
          await sendNotification(invoice.providerId, 'PAYMENT_COMPLETED', {
            amount: String(invoice.amount || 0),
            requestId: project.requestId,
            requestTitle: project.title || 'Service Request'
          });
        }
      } catch (_) {}
    }

    return true;
  } catch (error) {
    console.error('Error marking invoice paid:', error);
    throw error;
  }
};

// ==================== PROJECTS ====================

const createOrUpdateProject = async (projectData) => {
  try {
    // Remove any undefined fields to satisfy Firestore setDoc/updateDoc
    const sanitize = (obj) => Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined)
    );

    // Check if project already exists for this request
    const projectsQuery = query(
      collection(db, PROJECTS_COLLECTION),
      where('requestId', '==', projectData.requestId)
    );
    
    const projectsSnapshot = await getDocs(projectsQuery);
    let projectRef;
    
    if (!projectsSnapshot.empty) {
      // Update existing project
      projectRef = doc(db, PROJECTS_COLLECTION, projectsSnapshot.docs[0].id);
      await updateDoc(projectRef, sanitize({
        ...projectData,
        updatedAt: serverTimestamp()
      }));
    } else {
      // Create new project
      projectRef = doc(collection(db, PROJECTS_COLLECTION));
      await setDoc(projectRef, sanitize({
        ...projectData,
        id: projectRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }));
      
      // Add project ID to user's projects array
      const requestRef = doc(db, REQUESTS_COLLECTION, projectData.requestId);
      const requestSnap = await getDoc(requestRef);
      
      if (requestSnap.exists()) {
        const userId = requestSnap.data().createdBy;
        const userRef = doc(db, USERS_COLLECTION, userId);
        
        await updateDoc(userRef, {
          projects: arrayUnion(projectRef.id),
          updatedAt: serverTimestamp()
        });
      }
    }
    
    const projectSnap = await getDoc(projectRef);
    return { id: projectSnap.id, ...projectSnap.data() };
  } catch (error) {
    console.error('Error creating/updating project:', error);
    throw error;
  }
};

export const getUserProjects = async (userId, status = null) => {
  try {
    // First, get all projects where the user is the client
    let projectsQuery;
    if (status) {
      projectsQuery = query(
        collection(db, PROJECTS_COLLECTION),
        where('clientId', '==', userId),
        where('status', '==', status),
        orderBy('updatedAt', 'desc')
      );
    } else {
      projectsQuery = query(
        collection(db, PROJECTS_COLLECTION),
        where('clientId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
    }
    
    const projectsSnapshot = await getDocs(projectsQuery);
    
    // Get provider and request details for each project
    const projectsWithDetails = await Promise.all(
      projectsSnapshot.docs.map(async (docSnap) => {
        const projectData = docSnap.data();
        
        // Get provider details
        let providerData = {};
        if (projectData.providerId) {
          const providerRef = doc(db, USERS_COLLECTION, projectData.providerId);
          const providerSnap = await getDoc(providerRef);
          if (providerSnap.exists()) {
            providerData = {
              providerName: providerSnap.data()?.displayName || 'Unknown',
              providerEmail: providerSnap.data()?.email || '',
              providerPhone: providerSnap.data()?.phoneNumber || '',
              companyName: providerSnap.data()?.companyName || ''
            };
          }
        }
        
        // Get request details
        let requestData = {};
        if (projectData.requestId) {
          const requestRef = doc(db, REQUESTS_COLLECTION, projectData.requestId);
          const requestSnap = await getDoc(requestRef);
          if (requestSnap.exists()) {
            requestData = {
              requestTitle: requestSnap.data()?.title || 'Untitled Request',
              description: requestSnap.data()?.description || '',
              serviceType: requestSnap.data()?.serviceType || '',
              location: requestSnap.data()?.location || {},
              attachments: requestSnap.data()?.attachments || []
            };
          }
        }
        
        // Get quote details
        let quoteData = {};
        if (projectData.quoteId) {
          const quoteRef = doc(db, QUOTES_COLLECTION, projectData.quoteId);
          const quoteSnap = await getDoc(quoteRef);
          if (quoteSnap.exists()) {
            quoteData = {
              price: quoteSnap.data()?.price || 0,
              message: quoteSnap.data()?.message || '',
              providerId: quoteSnap.data()?.providerId || ''
            };
          }
        }
        
        return {
          id: docSnap.id,
          ...projectData,
          ...providerData,
          ...requestData,
          ...quoteData,
          // Convert Firestore timestamps to Date objects
          createdAt: projectData.createdAt?.toDate(),
          updatedAt: projectData.updatedAt?.toDate(),
          startedAt: projectData.startedAt?.toDate(),
          completedAt: projectData.completedAt?.toDate(),
          dueDate: projectData.dueDate?.toDate(),
          // Convert milestone timestamps
          milestones: projectData.milestones?.map(milestone => ({
            ...milestone,
            dueDate: milestone.dueDate?.toDate(),
            completedDate: milestone.completedDate?.toDate()
          }))
        };
      })
    );
    
    return projectsWithDetails;
  } catch (error) {
    console.error('Error getting user projects:', error);
    throw error;
  }
};

export const updateProjectStatus = async (projectId, status, userId) => {
  try {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      throw new Error('Project not found');
    }
    
    // Verify the user is the client for this project
    const projectData = projectSnap.data();
    
    // Get the request to verify ownership
    if (projectData.requestId) {
      const requestRef = doc(db, REQUESTS_COLLECTION, projectData.requestId);
      const requestSnap = await getDoc(requestRef);
      
      if (requestSnap.exists() && requestSnap.data().createdBy !== userId) {
        throw new Error('Unauthorized: You can only update your own projects');
      }
    }
    
    // Update the project status
    const updates = {
      status,
      updatedAt: serverTimestamp()
    };
    
    // If marking as completed, set completedAt
    if (status === 'completed') {
      updates.completedAt = serverTimestamp();
      
      // Also update the request status
      if (projectData.requestId) {
        const requestRef = doc(db, REQUESTS_COLLECTION, projectData.requestId);
        await updateDoc(requestRef, {
          status: 'completed',
          updatedAt: serverTimestamp()
        });
      }
    }
    
    await updateDoc(projectRef, updates);
    
    // Get the updated project with all details
    const updatedProjectSnap = await getDoc(projectRef);
    const updatedProject = updatedProjectSnap.data();
    
    // Get provider details
    let providerData = {};
    if (updatedProject.providerId) {
      const providerRef = doc(db, USERS_COLLECTION, updatedProject.providerId);
      const providerSnap = await getDoc(providerRef);
      if (providerSnap.exists()) {
        providerData = {
          providerName: providerSnap.data()?.displayName || 'Unknown',
          providerEmail: providerSnap.data()?.email || '',
          providerPhone: providerSnap.data()?.phoneNumber || '',
          companyName: providerSnap.data()?.companyName || ''
        };
      }
    }
    
    // Get request details
    let requestData = {};
    if (updatedProject.requestId) {
      const requestRef = doc(db, REQUESTS_COLLECTION, updatedProject.requestId);
      const requestSnap = await getDoc(requestRef);
      if (requestSnap.exists()) {
        requestData = {
          requestTitle: requestSnap.data()?.title || 'Untitled Request',
          description: requestSnap.data()?.description || '',
          serviceType: requestSnap.data()?.serviceType || '',
          location: requestSnap.data()?.location || {},
          attachments: requestSnap.data()?.attachments || []
        };
      }
    }
    
    return {
      id: updatedProjectSnap.id,
      ...updatedProject,
      ...providerData,
      ...requestData,
      // Convert Firestore timestamps to Date objects
      createdAt: updatedProject.createdAt?.toDate(),
      updatedAt: updatedProject.updatedAt?.toDate(),
      startedAt: updatedProject.startedAt?.toDate(),
      completedAt: updatedProject.completedAt?.toDate(),
      dueDate: updatedProject.dueDate?.toDate()
    };
  } catch (error) {
    console.error('Error updating project status:', error);
    throw error;
  }
};

export const rateProvider = async (projectId, rating, review) => {
  try {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      throw new Error('Project not found');
    }
    
    const projectData = projectSnap.data();
    
    // Update the project with the rating
    await updateDoc(projectRef, {
      providerRating: rating,
      providerReview: review,
      providerRated: true,
      updatedAt: serverTimestamp()
    });
    
    // Update the provider's average rating
    if (projectData.providerId) {
      const providerRef = doc(db, USERS_COLLECTION, projectData.providerId);
      const providerSnap = await getDoc(providerRef);
      
      if (providerSnap.exists()) {
        const providerData = providerSnap.data();
        const currentRatings = providerData.ratings || [];
        const newRatings = [...currentRatings, { rating, projectId, reviewedAt: serverTimestamp() }];
        const averageRating = newRatings.reduce((sum, r) => sum + r.rating, 0) / newRatings.length;
        
        await updateDoc(providerRef, {
          ratings: newRatings,
          averageRating: parseFloat(averageRating.toFixed(1)),
          updatedAt: serverTimestamp()
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error rating provider:', error);
    throw error;
  }
};

// ==================== FILE UPLOADS ====================

export const uploadFile = async (file, path = 'attachments') => {
  try {
    const storageRef = ref(storage, `${path}/${uuidv4()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      url: downloadURL
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// ==================== REALTIME UPDATES ====================

export const subscribeToUserRequests = (userId, callback) => {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where('createdBy', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to Date objects
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
    callback(requests);
  });
};

export const subscribeToUserQuotes = (userId, callback) => {
  // First, get all requests created by the user
  const requestsQuery = query(
    collection(db, REQUESTS_COLLECTION),
    where('createdBy', '==', userId)
  );
  
  return onSnapshot(requestsQuery, async (requestsSnapshot) => {
    const requestIds = requestsSnapshot.docs.map(doc => doc.id);
    
    if (requestIds.length === 0) {
      callback([]);
      return;
    }
    
    const buildDetails = async (docs) => {
      const quotesWithDetails = await Promise.all(
        docs.map(async (docSnap) => {
          const quoteData = docSnap.data();
          const providerRef = doc(db, USERS_COLLECTION, quoteData.providerId);
          const providerSnap = await getDoc(providerRef);
          
          const requestRef = doc(db, REQUESTS_COLLECTION, quoteData.requestId);
          const requestSnap = await getDoc(requestRef);
          
          return {
            id: docSnap.id,
            ...quoteData,
            providerName: providerSnap.data()?.displayName || 'Unknown',
            providerEmail: providerSnap.data()?.email || '',
            providerPhone: providerSnap.data()?.phoneNumber || '',
            companyName: providerSnap.data()?.companyName || '',
            requestTitle: requestSnap.data()?.title || 'Untitled Request',
            // Convert Firestore timestamps to Date objects
            createdAt: quoteData.createdAt?.toDate(),
            updatedAt: quoteData.updatedAt?.toDate(),
            expiresAt: quoteData.expiresAt?.toDate(),
            estimatedCompletion: quoteData.estimatedCompletion?.toDate()
          };
        })
      );
      quotesWithDetails.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
      callback(quotesWithDetails);
    };

    // If 10 or fewer, use 'in' query; otherwise set up multiple listeners per requestId
    if (requestIds.length <= 10) {
      const quotesQuery = query(
        collection(db, QUOTES_COLLECTION),
        where('requestId', 'in', requestIds)
      );
      const unsubscribe = onSnapshot(quotesQuery, async (quotesSnapshot) => {
        await buildDetails(quotesSnapshot.docs);
      });
      return unsubscribe;
    } else {
      const unsubs = requestIds.map((rid) => {
        const q = query(collection(db, QUOTES_COLLECTION), where('requestId', '==', rid));
        return onSnapshot(q, async () => {
          // Rebuild from all request IDs
          const docsArrays = await Promise.all(
            requestIds.map(async (id) => {
              const qs = query(collection(db, QUOTES_COLLECTION), where('requestId', '==', id));
              const gs = await getDocs(qs);
              return gs.docs;
            })
          );
          const allDocs = docsArrays.flat();
          await buildDetails(allDocs);
        });
      });
      return () => unsubs.forEach(u => typeof u === 'function' && u());
    }
  });
};

export const subscribeToUserProjects = (userId, callback) => {
  const qClient = query(
    collection(db, PROJECTS_COLLECTION),
    where('clientId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  const qLegacy = query(
    collection(db, PROJECTS_COLLECTION),
    where('orderGiverId', '==', userId),
    orderBy('updatedAt', 'desc')
  );

  const build = async (docs) => {
    const projects = await Promise.all(
      docs.map(async (docSnap) => {
        const projectData = docSnap.data();
        
        // Get provider details
        let providerData = {};
        if (projectData.providerId) {
          const providerRef = doc(db, USERS_COLLECTION, projectData.providerId);
          const providerSnap = await getDoc(providerRef);
          if (providerSnap.exists()) {
            providerData = {
              providerName: providerSnap.data()?.displayName || 'Unknown',
              providerEmail: providerSnap.data()?.email || '',
              providerPhone: providerSnap.data()?.phoneNumber || '',
              companyName: providerSnap.data()?.companyName || ''
            };
          }
        }
        
        // Get request details
        let requestData = {};
        if (projectData.requestId) {
          const requestRef = doc(db, REQUESTS_COLLECTION, projectData.requestId);
          const requestSnap = await getDoc(requestRef);
          if (requestSnap.exists()) {
            requestData = {
              requestTitle: requestSnap.data()?.title || 'Untitled Request',
              description: requestSnap.data()?.description || '',
              serviceType: requestSnap.data()?.serviceType || '',
              location: requestSnap.data()?.location || {},
              attachments: requestSnap.data()?.attachments || []
            };
          }
        }
        
        return {
          id: docSnap.id,
          ...projectData,
          ...providerData,
          ...requestData,
          // Convert Firestore timestamps to Date objects
          createdAt: projectData.createdAt?.toDate(),
          updatedAt: projectData.updatedAt?.toDate(),
          startedAt: projectData.startedAt?.toDate(),
          completedAt: projectData.completedAt?.toDate(),
          dueDate: projectData.dueDate?.toDate(),
          // Convert milestone timestamps
          milestones: projectData.milestones?.map(milestone => ({
            ...milestone,
            dueDate: milestone.dueDate?.toDate(),
            completedDate: milestone.completedDate?.toDate()
          }))
        };
      })
    );
    return projects;
  };

  const unsubClient = onSnapshot(qClient, async (snapshot) => {
    const p1 = await build(snapshot.docs);
    // Merge with legacy listener result stored globally? Simpler: fetch legacy once and merge
    const legacySnap = await getDocs(qLegacy);
    const p2 = await build(legacySnap.docs);
    // Deduplicate by id
    const byId = new Map();
    [...p1, ...p2].forEach(p => byId.set(p.id, p));
    callback(Array.from(byId.values()));
  });
  return unsubClient;
};
