import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../firebaseConfig';
import {
  getProviderProfile,
  updateProviderProfile,
  subscribeToProviderOpenRequests,
  subscribeToProviderQuotes,
  subscribeToProviderProjects,
  subscribeToProviderInvoices,
  sendQuote,
  updateProjectProgress,
  generateInvoice,
  addProjectPhoto,
  addProjectComment
} from '../services/providerservices/providerService';
import { markInvoicePaid } from '../services/providerservices/providerService';
import { registerFcmTokenForCurrentUser } from '../services/fcmService';

const ProviderContext = createContext();

export const ProviderProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingQuotes: 0,
    activeProjects: 0,
    completedProjects: 0,
    earnings: 0
  });

  const loadProvider = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setUser(null);
        return null;
      }
      const profile = await getProviderProfile(currentUser.uid);
      setUser({
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        role: profile?.role || 'service_provider',
        serviceType: profile?.serviceType || '',
        serviceArea: profile?.serviceArea || '',
        phoneNumber: profile?.phoneNumber || '',
        companyName: profile?.companyName || ''
      });
      return profile;
    } catch (e) {
      console.error('Error loading provider:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    let unsubRequests = null;
    let unsubQuotes = null;
    let unsubProjects = null;
    let unsubInvoices = null;

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Register FCM token for provider
    registerFcmTokenForCurrentUser().catch(() => {});

    // Subscribe to provider open requests (hide assigned to others)
    getProviderProfile(uid).then((profile) => {
      const serviceType = profile?.serviceType || '';
      const serviceArea = profile?.serviceArea || '';
      unsubRequests = subscribeToProviderOpenRequests(uid, serviceType, serviceArea, (list) => {
        setRequests(list);
        const pendingCount = list.filter(r => r.status === 'pending').length;
        const activeCount = list.filter(r => r.status === 'in_progress' && r.providerId === uid).length;
        const completedCount = list.filter(r => r.status === 'completed').length;
        setStats(prev => ({
          ...prev,
          totalRequests: list.length,
          pendingQuotes: pendingCount,
          activeProjects: activeCount,
          completedProjects: completedCount
        }));
      });
    }).catch(() => {});

    unsubQuotes = subscribeToProviderQuotes(uid, (list) => {
      setQuotes(list);
    });

    unsubProjects = subscribeToProviderProjects(uid, (list) => {
      setProjects(list);
    });

    unsubInvoices = subscribeToProviderInvoices(uid, (list) => {
      setInvoices(list);
      const earnings = list.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
      setStats(prev => ({ ...prev, earnings }));
    });

    return () => {
      if (typeof unsubRequests === 'function') unsubRequests();
      if (typeof unsubQuotes === 'function') unsubQuotes();
      if (typeof unsubProjects === 'function') unsubProjects();
      if (typeof unsubInvoices === 'function') unsubInvoices();
    };
  }, []);

  const createQuote = async (requestId, data) => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return sendQuote(uid, requestId, data);
  };

  const updateProgress = async (projectId, progress, updates = {}) => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return updateProjectProgress(projectId, progress, updates);
  };

  const createInvoice = async (projectId) => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return generateInvoice(projectId);
  };

  const uploadPhoto = async (projectId, file) => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return addProjectPhoto(projectId, file);
  };

  const addComment = async (projectId, text) => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return addProjectComment(projectId, text);
  };

  const saveProfile = async (updates) => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return updateProviderProfile(uid, updates);
  };

  const setInvoicePaid = async (invoiceId) => {
    const uid = user?.uid || auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return markInvoicePaid(invoiceId);
  };

  const value = {
    user,
    loading,
    stats,
    requests,
    quotes,
    projects,
    invoices,
    loadProvider,
    createQuote,
    updateProgress,
    createInvoice,
    uploadPhoto,
    addComment,
    setInvoicePaid,
    saveProfile
  };

  return (
    <ProviderContext.Provider value={value}>
      {children}
    </ProviderContext.Provider>
  );
};

export const useProvider = () => useContext(ProviderContext);