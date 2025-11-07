import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const RoleGuard = ({ allowed = [], children }) => {
  const location = useLocation();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }
    getDoc(doc(db, 'users', uid)).then((snap) => {
      setRole(snap.data()?.role || null);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const normalized = role === 'serviceProvider' ? 'service_provider' : role;
  if (!normalized || (allowed.length > 0 && !allowed.includes(normalized))) {
    return <Navigate to="/dashboard/order-giver" state={{ from: location }} replace />;
  }

  return children;
};

export default RoleGuard;