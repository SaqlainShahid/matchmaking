import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const RoleLanding = () => {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    const resolveTarget = async () => {
      const user = auth.currentUser;
      if (!user || !user.emailVerified) {
        setTarget('/login');
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const role = snap.data()?.role || 'order_giver';
        if (role === 'service_provider' || role === 'provider' || role === 'serviceProvider') {
          setTarget('/provider/dashboard');
        } else if (role === 'admin') {
          setTarget('/admin/dashboard');
        } else {
          setTarget('/dashboard/order-giver');
        }
      } catch (_) {
        setTarget('/dashboard/order-giver');
      }
    };
    resolveTarget();
  }, []);

  if (!target) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return <Navigate to={target} replace />;
};

export default RoleLanding;