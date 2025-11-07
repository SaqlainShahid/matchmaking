import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Check if user exists in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          // Update last login time
          await setDoc(userRef, {
            lastLogin: new Date().toISOString()
          }, { merge: true });
          setHasProfile(true);
        } else {
          setHasProfile(false);
        }
      }
      
      setUser(currentUser || null);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // For email/password users, require email verification
  const isEmailProvider = user.providerData?.some(provider => provider.providerId === 'password');
  if (isEmailProvider && !user.emailVerified) {
    return <Navigate to="/login" state={{ from: location, message: 'Please verify your email before logging in.' }} replace />;
  }

  // If user doesn't have a profile, redirect to signup
  if (!hasProfile) {
    return <Navigate to="/signup" state={{ from: location }} replace />;
  }

  // If we got here, the user is authenticated and has a profile
  return children;
};

export default ProtectedRoute;
