import { db } from '../firebaseConfig';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

const REQUESTS_COLLECTION = 'requests';
const QUOTES_COLLECTION = 'quotes';

// Create a new service request
export const createRequest = async (requestData) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const requestRef = doc(collection(db, REQUESTS_COLLECTION));
    const newRequest = {
      ...requestData,
      id: requestRef.id,
      orderGiverId: user.uid,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      quotes: []
    };

    await setDoc(requestRef, newRequest);
    return { id: requestRef.id, ...newRequest };
  } catch (error) {
    console.error('Error creating request:', error);
    throw error;
  }
};

// Get requests for the current order giver
export const getMyRequests = async (status = 'all') => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    let q;
    if (status === 'all') {
      q = query(
        collection(db, REQUESTS_COLLECTION),
        where('orderGiverId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, REQUESTS_COLLECTION),
        where('orderGiverId', '==', user.uid),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamp to Date
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));
  } catch (error) {
    console.error('Error getting requests:', error);
    throw error;
  }
};

// Get a single request by ID
export const getRequestById = async (requestId) => {
  try {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }

    return {
      id: requestSnap.id,
      ...requestSnap.data(),
      createdAt: requestSnap.data().createdAt?.toDate(),
      updatedAt: requestSnap.data().updatedAt?.toDate(),
    };
  } catch (error) {
    console.error('Error getting request:', error);
    throw error;
  }
};

// Update a request
export const updateRequest = async (requestId, updates) => {
  try {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    await updateDoc(requestRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    // Return the updated request
    return getRequestById(requestId);
  } catch (error) {
    console.error('Error updating request:', error);
    throw error;
  }
};

// Cancel a request
export const cancelRequest = async (requestId) => {
  return updateRequest(requestId, { status: 'cancelled' });
};

// Get quotes for a request
export const getQuotesForRequest = async (requestId) => {
  try {
    const q = query(
      collection(db, QUOTES_COLLECTION),
      where('requestId', '==', requestId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));
  } catch (error) {
    console.error('Error getting quotes:', error);
    throw error;
  }
};

// Accept a quote
export const acceptQuote = async (quoteId) => {
  try {
    const quoteRef = doc(db, QUOTES_COLLECTION, quoteId);
    const quoteSnap = await getDoc(quoteRef);
    
    if (!quoteSnap.exists()) {
      throw new Error('Quote not found');
    }

    const quote = quoteSnap.data();
    
    // Update the quote status
    await updateDoc(quoteRef, {
      status: 'accepted',
      updatedAt: serverTimestamp()
    });

    // Update the request status and set the accepted quote
    const requestRef = doc(db, REQUESTS_COLLECTION, quote.requestId);
    await updateDoc(requestRef, {
      status: 'in_progress',
      providerAssigned: true,
      providerId: quote.providerId,
      acceptedQuoteId: quote.id,
      acceptedQuote: {
        providerId: quote.providerId,
        providerName: quote.providerName,
        price: quote.price,
        quoteId: quote.id,
        acceptedAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error accepting quote:', error);
    throw error;
  }
};

// Mark request as completed
export const completeRequest = async (requestId) => {
  return updateRequest(requestId, { 
    status: 'completed',
    completedAt: serverTimestamp() 
  });
};

// Rate a completed request
export const rateRequest = async (requestId, rating, review) => {
  try {
    const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Request not found');
    }

    const request = requestSnap.data();
    
    if (request.status !== 'completed') {
      throw new Error('Only completed requests can be rated');
    }

    if (!request.acceptedQuote) {
      throw new Error('No accepted quote found for this request');
    }

    // Add rating to the request
    await updateDoc(requestRef, {
      rating: {
        stars: rating,
        review: review || '',
        ratedAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });

    // Update provider's rating (you might want to move this to a Cloud Function)
    const providerRef = doc(db, 'users', request.acceptedQuote.providerId);
    await updateDoc(providerRef, {
      ratings: arrayUnion({
        requestId: requestId,
        stars: rating,
        review: review || '',
        ratedAt: serverTimestamp(),
        orderGiverId: request.orderGiverId
      }),
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error rating request:', error);
    throw error;
  }
};
