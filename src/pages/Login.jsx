import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification
} from "firebase/auth";
import { auth, provider, db } from "../firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { t } from '../lib/i18n';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSignupPromptModal, setShowSignupPromptModal] = useState(false);
  const navigate = useNavigate();

  // Show signup prompt if a previous sign-in attempt flagged no profile
  React.useEffect(() => {
    if (sessionStorage.getItem("signupPrompt") === "1") {
      setShowSignupPromptModal(true);
      sessionStorage.removeItem("signupPrompt");
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError(t("Please fill in all fields"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      // First try to sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if email is verified
      if (!user.emailVerified) {
        // Send verification email if not verified
        try {
          await sendEmailVerification(user, {
            url: window.location.origin + '/login',
            handleCodeInApp: true
          });
          setError(t("Please verify your email. A verification link has been sent to your email address."));
          await auth.signOut(); // Sign out the user until email is verified
          return;
        } catch (verificationError) {
          console.error("Error sending verification email:", verificationError);
          setError(t("Error sending verification email. Please try again later."));
          return;
        }
      }

      const ref = doc(db, "users", user.uid);
      let role = "order_giver";
      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            email: user.email,
            role,
            displayName: user.displayName || "",
            provider: "password",
            createdAt: serverTimestamp(),
          });
        } else {
          role = snap.data().role || role;
        }
      } catch {
        // Network hiccup? Proceed with default role
      }

      // Redirect based on role, including admin
      const target =
        role === "admin"
          ? "/admin/dashboard"
          : (role === "service_provider" || role === "provider" || role === "serviceProvider")
            ? "/provider/dashboard"
            : "/dashboard/order-giver";
      navigate(target);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Sign in with Google
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Create user document if it doesn't exist
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName || "",
          role: "order_giver",
          provider: "google.com",
          createdAt: serverTimestamp(),
          emailVerified: user.emailVerified
        });
      }

      // Redirect based on role
      const role = userDoc.exists() ? userDoc.data().role : "order_giver";
      const target =
        role === "admin"
          ? "/admin/dashboard"
          : (role === "service_provider" || role === "provider" || role === "serviceProvider")
            ? "/provider/dashboard"
            : "/dashboard/order-giver";
      navigate(target);
      
    } catch (error) {
      console.error("Google Sign In Error:", error);
      setError(error.message || t("Failed to sign in with Google. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0">
        {/* Floating Shapes */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-slate-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float animation-delay-4000"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(#000 1px, transparent 1px),
                              linear-gradient(90deg, #000 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-300 rounded-full opacity-40"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              x: [null, Math.random() * window.innerWidth],
            }}
            transition={{
              duration: 20 + Math.random() * 20,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
        ))}
      </div>

      <motion.div 
        className="relative z-10 w-full max-w-sm mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        {/* Compact Glass Morphism Card */}
        <div className="backdrop-blur-lg bg-white/80 border border-white/60 rounded-2xl shadow-xl overflow-hidden">
          {/* Compact Header */}
          <div className="bg-gradient-to-r from-white to-blue-50/80 p-6 text-center border-b border-white/40">
            <motion.h2 
              className="text-2xl font-bold text-gray-900 mb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {t('Welcome Back')}
            </motion.h2>
            <motion.p 
              className="text-gray-600 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {t('Sign in to continue')}
            </motion.p>
          </div>

          <div className="p-6">
            {error && (
              <motion.div 
                className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs">{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
                  {t('Email address')}
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-3 py-2 text-sm bg-white/50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder={t('you@example.com')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-xs font-medium text-gray-700">
                    {t('Password')}
                  </label>
                  <Link 
                    to="/forgot-password" 
                    className="text-xs font-medium text-blue-600 hover:text-blue-500 focus:outline-none transition-colors"
                  >
                    {t('Forgot password?')}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full px-3 py-2 text-sm bg-white/50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </motion.div>

              <motion.button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 px-4 rounded-lg font-medium text-white text-sm relative overflow-hidden ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                } transition-all duration-200 transform hover:scale-[1.02]`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
              >
                <span className="relative z-10">
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('Signing in...')}
                    </div>
                  ) : (
                    t('Sign In')
                  )}
                </span>
              </motion.button>
            </form>

            <motion.div 
              className="my-4 flex items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink mx-3 text-gray-500 text-xs">{t('OR')}</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </motion.div>

            <motion.button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] text-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="w-4 h-4"
                aria-hidden="true"
              >
                <path fill="#FFC107" d="M43.611,20.083h-1.318V20H24v8h11.303C34.494,31.885,29.661,36,24,36c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.061,0,5.842,1.17,7.957,3.083l5.657-5.657C33.866,6.109,29.178,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.651,43.862,21.354,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.816C14.095,16.393,18.748,13,24,13c3.061,0,5.842,1.17,7.957,3.083l5.657-5.657 C33.866,6.109,29.178,4,24,4C16.535,4,10.218,8.067,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.516,0,10.474-2.105,14.227-5.544l-6.564-5.548C29.694,34.943,26.981,36,24,36 c-5.632,0-10.45-4.088-11.275-9.448l-6.591,5.061C8.016,39.05,15.433,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083h-1.318V20H24v8h11.303C34.494,31.885,29.661,36,24,36c-5.118,0-9.426-3.271-10.975-7.854 l-6.591,5.061C8.016,39.05,15.433,44,24,44c11.045,0,20-8.955,20-20C44,22.651,43.862,21.354,43.611,20.083z"/>
              </svg>
              <span className="font-medium">Google</span>
            </motion.button>
          </div>

          <div className="bg-gray-50/80 border-t border-gray-200/60 px-6 py-4 text-center">
            <motion.p 
              className="text-gray-600 text-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              {t("Don't have an account?")}{' '}
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none transition-colors"
              >
                {t('Sign up')}
              </button>
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Modal */}
      {showSignupPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white/95 backdrop-blur-lg border border-white/80 rounded-xl shadow-2xl w-full max-w-sm p-5 mx-4"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-2">{t('Please Register')}</h2>
            <p className="text-gray-600 text-sm mb-4">
              {t('No account is linked to this Google login. Please register to continue.')}
            </p>
            <div className="flex gap-3">
              <motion.button
                type="button"
                onClick={() => { setShowSignupPromptModal(false); navigate('/signup'); }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-[1.02]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('Go to Signup')}
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setShowSignupPromptModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 transform hover:scale-[1.02]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('Close')}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}