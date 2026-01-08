import { db, auth } from '../firebaseConfig';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

const USERS_COLLECTION = 'users';

// Get current user profile
export const getCurrentUserProfile = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return null;

    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Create user profile if it doesn't exist
      const newUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        role: 'order_giver', // Default role
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        preferences: {},
        address: {}
      };
      
      await setDoc(userRef, newUser);
      return newUser;
    }

    return {
      id: userSnap.id,
      ...userSnap.data(),
      createdAt: userSnap.data().createdAt?.toDate(),
      updatedAt: userSnap.data().updatedAt?.toDate(),
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (updates) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const userRef = doc(db, USERS_COLLECTION, user.uid);
    
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    // Return the updated profile
    return getCurrentUserProfile();
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Get user by ID
export const getUserById = async (userId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }

    return {
      id: userSnap.id,
      ...userSnap.data(),
      // Hide sensitive information
      email: undefined,
      phone: undefined,
      address: undefined
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
};

// Get all service providers
export const getServiceProviders = async (filters = {}) => {
  try {
    // Include typical provider roles and company/agency accounts
    let q = query(
      collection(db, USERS_COLLECTION),
      where('role', 'in', ['service_provider', 'provider', 'company', 'agency', 'contractor'])
    );

    // Add additional filters if provided
    if (filters.serviceType) {
      q = query(q, where('services', 'array-contains', filters.serviceType));
    }

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Hide sensitive information
      email: undefined,
      phone: undefined,
      address: undefined,
      // Convert timestamps
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));
  } catch (error) {
    console.error('Error getting service providers:', error);
    throw error;
  }
};

// Find providers matching a service type and (optionally) area
export const getMatchingProviders = async (serviceType, area = '') => {
  try {
    // Perform two queries to support both legacy `serviceType` field and the newer `services` array
    const providersMap = new Map();

    // Query by serviceType field
    try {
      // Allow for a broader set of provider-like roles (service providers, companies, agencies)
      const q1 = query(
      collection(db, USERS_COLLECTION),
      where('role', 'in', ['service_provider', 'provider', 'company', 'agency', 'contractor']),
        where('serviceType', '==', serviceType)
      );
      const snap1 = await getDocs(q1);
      snap1.docs.forEach(d => providersMap.set(d.id, { id: d.id, ...d.data() }));
    } catch (err) {
      // ignore individual query failures
      console.warn('serviceType query failed:', err);
    }

    // Query by services array (array-contains)
    try {
      // Allow for a broader set of provider-like roles (service providers, companies, agencies)
      const q2 = query(
      collection(db, USERS_COLLECTION),
      where('role', 'in', ['service_provider', 'provider', 'company', 'agency', 'contractor']),
        where('services', 'array-contains', serviceType)
      );
      const snap2 = await getDocs(q2);
      snap2.docs.forEach(d => providersMap.set(d.id, { id: d.id, ...d.data() }));
    } catch (err) {
      console.warn('services array query failed:', err);
    }

    let providers = Array.from(providersMap.values());

    if (!area) return providers;
    const areaLower = String(area).toLowerCase();
    return providers.filter(p => {
      const serviceArea = (p.serviceArea || p.city || '').toLowerCase();
      return serviceArea ? serviceArea.includes(areaLower) : true;
    });
  } catch (error) {
    console.error('Error getting matching providers:', error);
    return [];
  }
};

// Update user preferences
export const updateUserPreferences = async (preferences) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const userRef = doc(db, USERS_COLLECTION, user.uid);
    
    await updateDoc(userRef, {
      'preferences': {
        ...preferences
      },
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
};

// Update user address
export const updateUserAddress = async (address) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const userRef = doc(db, USERS_COLLECTION, user.uid);
    
    await updateDoc(userRef, {
      'address': {
        ...address
      },
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error updating user address:', error);
    throw error;
  }
};
