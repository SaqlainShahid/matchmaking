import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../firebaseConfig';
import { 
  createRequest, 
  getRequestById,
  getUserRequests,
  updateRequest as updateRequestService,
  deleteRequest,
  getQuotesForUser,
  updateQuoteStatus,
  getUserProjects,
  updateProjectStatus,
  rateProvider,
  subscribeToUserRequests,
  subscribeToUserQuotes,
  subscribeToUserProjects
} from '../services/ordergiverservices/orderGiverService';
import { getQuoteById, createInvoiceForAcceptedQuote, markInvoicePaidByOrderGiver } from '../services/ordergiverservices/orderGiverService';
import { registerFcmTokenForCurrentUser } from '../services/fcmService';

const OrderGiverContext = createContext();

export const OrderGiverProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingQuotes: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalSpent: 0
  });

  // Load user profile from Firebase Auth
  const loadUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setUser(null);
        return null;
      }

      // Get basic user info from auth
      const userProfile = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        emailVerified: currentUser.emailVerified,
        phoneNumber: currentUser.phoneNumber
      };

      setUser(userProfile);
      return userProfile;
    } catch (error) {
      console.error('Error loading user profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update user profile in Firebase Auth and Firestore
  const updateProfile = async (updates) => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      
      // Update in Firebase Auth
      if (updates.displayName || updates.photoURL) {
        await updateProfile(currentUser, {
          displayName: updates.displayName || currentUser.displayName,
          photoURL: updates.photoURL || currentUser.photoURL
        });
      }
      
      // Update in Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // Refresh user data
      const updatedUser = await loadUserProfile();
      return updatedUser;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Load requests for the current user
  const loadRequests = useCallback(async (status = 'all') => {
    try {
      if (!user) return [];
      
      setLoading(true);
      const requestsData = await getUserRequests(user.uid, status === 'all' ? null : status);
      
      // Calculate stats
      const totalSpent = requestsData
        .filter(req => req.status === 'completed' && req.acceptedQuoteId)
        .reduce((sum, req) => sum + (parseFloat(req.acceptedQuote?.price) || 0), 0);

      const stats = {
        totalRequests: requestsData.length,
        pendingQuotes: requestsData.filter(req => req.status === 'pending').length,
        activeProjects: requestsData.filter(req => req.status === 'in_progress').length,
        completedProjects: requestsData.filter(req => req.status === 'completed').length,
        totalSpent: parseFloat(totalSpent.toFixed(2))
      };

      setStats(stats);
      const { normalizeRequest } = await import('../lib/requestUtils').catch(() => ({ normalizeRequest: (x) => x }));
      setRequests((requestsData || []).map(r => normalizeRequest(r)));
      return requestsData;
    } catch (error) {
      console.error('Error loading requests:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load quotes for the current user
  const loadQuotes = useCallback(async (status = null) => {
    try {
      if (!user) return [];
      
      setLoading(true);
      const quotesData = await getQuotesForUser(user.uid, status);
      setQuotes(quotesData);
      return quotesData;
    } catch (error) {
      console.error('Error loading quotes:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load projects for the current user
  const loadProjects = useCallback(async (status = null) => {
    try {
      if (!user) return [];
      
      setLoading(true);
      const projectsData = await getUserProjects(user.uid, status);
      
      // Update stats based on projects
      const activeProjects = projectsData.filter(p => p.status === 'active').length;
      const completedProjects = projectsData.filter(p => p.status === 'completed').length;
      
      setStats(prev => ({
        ...prev,
        activeProjects,
        completedProjects
      }));
      
      setProjects(projectsData);
      return projectsData;
    } catch (error) {
      console.error('Error loading projects:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Create a new request
  const createNewRequest = async (requestData) => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      setLoading(true);
      const newRequest = await createRequest(user.uid, {
        ...requestData,
        clientId: user.uid,
        clientName: user.displayName || 'Anonymous',
        clientEmail: user.email
      });
      
      // Refresh requests list
      await loadRequests(activeTab);
      return newRequest;
    } catch (error) {
      console.error('Error creating request:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update a request
  const updateUserRequest = async (requestId, updates) => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      setLoading(true);
      const updatedRequest = await updateRequestService(requestId, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      // Refresh requests list
      await loadRequests(activeTab);
      return updatedRequest;
    } catch (error) {
      console.error('Error updating request:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Cancel a request
  const cancelUserRequest = async (requestId) => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      setLoading(true);
      await deleteRequest(user.uid, requestId);
      
      // Refresh requests list
      await loadRequests(activeTab);
    } catch (error) {
      console.error('Error cancelling request:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Accept a quote
  const acceptRequestQuote = async (quoteId) => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      setLoading(true);
      const updatedQuote = await updateQuoteStatus(quoteId, 'accepted', user.uid);
      
      // Refresh quotes and projects
      await Promise.all([
        loadQuotes('pending'),
        loadProjects('active')
      ]);
      
      return updatedQuote;
    } catch (error) {
      console.error('Error accepting quote:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Reject a quote
  const rejectQuote = async (quoteId) => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      setLoading(true);
      const updatedQuote = await updateQuoteStatus(quoteId, 'rejected', user.uid);
      
      // Refresh quotes
      await loadQuotes('pending');
      
      return updatedQuote;
    } catch (error) {
      console.error('Error rejecting quote:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update project status
  const updateProjectStatus = async (projectId, status) => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      setLoading(true);
      const updatedProject = await updateProjectStatus(projectId, status, user.uid);
      
      // Refresh projects
      await loadProjects(activeTab === 'all' ? null : activeTab);
      
      return updatedProject;
    } catch (error) {
      console.error('Error updating project status:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Rate a provider for a completed project
  const rateProvider = async (providerId, rating, review, projectId) => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      setLoading(true);
      await rateProvider(projectId, rating, review);
      
      // Refresh projects to show the updated rating
      await loadProjects('completed');
      
      return true;
    } catch (error) {
      console.error('Error rating provider:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time listeners when user is authenticated
  useEffect(() => {
    if (!user) return;
    
    // Set up real-time listeners
    const unsubscribeRequests = subscribeToUserRequests(user.uid, (requests) => {
      setRequests(requests);
      
      // Update stats
      const totalSpent = requests
        .filter(req => req.status === 'completed' && req.acceptedQuoteId)
        .reduce((sum, req) => sum + (parseFloat(req.acceptedQuote?.price) || 0), 0);

      setStats({
        totalRequests: requests.length,
        pendingQuotes: requests.filter(req => req.status === 'pending').length,
        activeProjects: requests.filter(req => req.status === 'in_progress').length,
        completedProjects: requests.filter(req => req.status === 'completed').length,
        totalSpent: parseFloat(totalSpent.toFixed(2))
      });
    });
    
    const unsubscribeQuotes = subscribeToUserQuotes(user.uid, (quotes) => {
      setQuotes(quotes);
    });
    
    const unsubscribeProjects = subscribeToUserProjects(user.uid, (projects) => {
      setProjects(projects);
      
      // Update stats based on projects
      const activeProjects = projects.filter(p => p.status === 'active').length;
      const completedProjects = projects.filter(p => p.status === 'completed').length;
      
      setStats(prev => ({
        ...prev,
        activeProjects,
        completedProjects
      }));
    });
    
    // Initial data load
    const loadInitialData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          loadRequests('all'),
          loadQuotes('pending'),
          loadProjects('active')
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
    
    // Cleanup function to unsubscribe from listeners
    return () => {
      if (typeof unsubscribeRequests === 'function') unsubscribeRequests();
      if (typeof unsubscribeQuotes === 'function') unsubscribeQuotes();
      if (typeof unsubscribeProjects === 'function') unsubscribeProjects();
    };
  }, [user, loadRequests, loadQuotes, loadProjects]);
  
  // Handle auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadUserProfile();
        // Register FCM token for push notifications
        registerFcmTokenForCurrentUser().catch(() => {});
      } else {
        setUser(null);
        setRequests([]);
        setQuotes([]);
        setProjects([]);
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, [loadUserProfile]);

  // Create invoice and mark paid (demo payment)
  const createInvoiceForQuote = async (quoteId) => {
    try {
      setLoading(true);
      const invoice = await createInvoiceForAcceptedQuote(quoteId);
      return invoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const payInvoice = async (invoiceId) => {
    try {
      setLoading(true);
      await markInvoicePaidByOrderGiver(invoiceId);
      // Refresh quotes and projects
      await Promise.all([
        loadQuotes('accepted'),
        loadProjects('active')
      ]);
      return true;
    } catch (error) {
      console.error('Error paying invoice:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <OrderGiverContext.Provider
      value={{
        // User
        user,
        loading,
        loadUserProfile,
        updateProfile,
        
        // Requests
        requests,
        loadRequests,
        createNewRequest,
        updateUserRequest,
        cancelUserRequest,
        
        // Quotes
        quotes,
        loadQuotes,
        acceptRequestQuote,
        // Alias for UI components expecting acceptQuote naming
        acceptQuote: acceptRequestQuote,
        rejectQuote,
        getRequestById,
        getQuoteById,
        createInvoiceForQuote,
        payInvoice,
        
        // Projects
        projects,
        loadProjects,
        updateProjectStatus,
        rateProvider,
        
        // UI State
        stats,
        activeTab,
        setActiveTab
      }}
    >
      {children}
    </OrderGiverContext.Provider>
  );
};

export const useOrderGiver = () => {
  const context = useContext(OrderGiverContext);
  if (!context) {
    throw new Error('useOrderGiver must be used within an OrderGiverProvider');
  }
  return context;
};

// Export the context for testing or direct usage if needed
export { OrderGiverContext };
