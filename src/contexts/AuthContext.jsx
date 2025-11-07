import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification as sendEmailVerificationFirebase,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  // Sign up with email and password
  async function signup(email, password, additionalData) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update user profile with display name if provided
      if (additionalData?.displayName) {
        await updateProfile(user, {
          displayName: additionalData.displayName
        });
      }

      // Create user document in Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: additionalData?.displayName || '',
        role: additionalData?.role || 'orderGiver',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...additionalData
      });

      // Send email verification
      await sendEmailVerificationFirebase(user);
      
      return user;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  // Login with email and password
  async function login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Login with Google
  async function loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create user document if it doesn't exist
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          role: 'orderGiver', // Default role
          provider: 'google',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      return user;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }

  // Logout
  async function logout() {
    try {
      await firebaseSignOut(auth);
      setUserData(null);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Send email verification
  async function sendEmailVerification() {
    try {
      await sendEmailVerificationFirebase(auth.currentUser);
      return true;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  // Update user profile
  async function updateUserProfile(updates) {
    try {
      await updateProfile(auth.currentUser, updates);
      
      // Update in Firestore
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, {
          ...updates,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      
      return true;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get additional user data from Firestore
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        } else {
          // Create user document if it doesn't exist
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            role: 'orderGiver', // Default role
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          setUserData({
            role: 'orderGiver'
          });
        }
      } else {
        setUserData(null);
      }
      
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    userData,
    login,
    loginWithGoogle,
    signup,
    logout,
    sendEmailVerification,
    updateUserProfile,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
