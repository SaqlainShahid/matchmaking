import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
} from "firebase/auth";
import { auth, provider, db } from "../firebaseConfig";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { t } from '../lib/i18n';

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState("order_giver");
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!email || !password || !fullName || !phone) {
      setError(t("Please fill in all required fields"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // Kick off verification and profile save concurrently (no blocking)
      void sendEmailVerification(user).catch(console.error);
          void setDoc(
            doc(db, "users", user.uid),
            {
              email,
              role,
              displayName: fullName,
              phone,
              company: company || "",
              city: city || "",
              provider: "password",
              createdAt: serverTimestamp(),
            },
            { merge: true }
          ).catch(console.error);

      // Show verify modal instead of alert
      setShowVerifyModal(true);
      setResendMessage(t("We sent a verification email. Please check your inbox."));
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      // Require core profile fields before Google signup
      if (!fullName || !phone) {
        setError(t("Please fill in Full Name and Phone before signing up with Google"));
        return;
      }

      setLoading(true);
      setError("");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setError(t("An account already exists for this Google account. Please sign in."));
        navigate("/login");
        return;
      }

      await setDoc(
        userRef,
        {
          email: user.email,
          role,
          displayName: fullName,
          phone,
          company: company || "",
          city: city || "",
          provider: "google",
          createdAt: serverTimestamp(),
        }
      );
      navigate(role === "service_provider" ? "/provider/dashboard" : "/dashboard/order-giver");
    } catch (error) {
      setError(error.message);
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
        className="relative z-10 w-full max-w-4xl mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        {/* Glass Morphism Card */}
        <div className="backdrop-blur-lg bg-white/80 border border-white/60 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-white to-blue-50/80 p-8 text-center border-b border-white/40">
            <motion.h2 
              className="text-3xl font-bold text-gray-900 mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {t('Create Your Account')}
            </motion.h2>
            <motion.p 
              className="text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {t('Join us today and get started')}
            </motion.p>
          </div>

          <div className="p-8">
            {error && (
              <motion.div 
                className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left Side - Form Inputs */}
              <div className="lg:w-1/2">
                <form onSubmit={handleSignup} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">{t('Full Name *')}</label>
                      <input
                        id="fullName"
                        type="text"
                        required
                        className="w-full px-4 py-3 text-sm bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                        placeholder={t('Enter your full name')}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">{t('Phone *')}</label>
                      <input
                        id="phone"
                        type="tel"
                        required
                        className="w-full px-4 py-3 text-sm bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                        placeholder={t('Your phone number')}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">{t('Company')}</label>
                      <input
                        id="company"
                        type="text"
                        className="w-full px-4 py-3 text-sm bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                        placeholder={t('Your company (optional)')}
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">{t('City')}</label>
                      <input
                        id="city"
                        type="text"
                        className="w-full px-4 py-3 text-sm bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                        placeholder={t('Your city (optional)')}
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">{t('Email *')}</label>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="w-full px-4 py-3 text-sm bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                        placeholder={t('you@example.com')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 }}
                    >
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">{t('Password *')}</label>
                      <input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        className="w-full px-4 py-3 text-sm bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                        placeholder={t('Create a password')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.0 }}
                  >
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">{t('Role *')}</label>
                    <select
                      id="role"
                      className="w-full px-4 py-3 text-sm bg-white/50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="order_giver">{t('Order Giver')}</option>
                      <option value="service_provider">{t('Service Provider')}</option>
                    </select>
                  </motion.div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3.5 px-4 rounded-lg font-medium text-white text-sm relative overflow-hidden ${
                      loading
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                    } transition-all duration-200 transform hover:scale-[1.02]`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
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
                          {t('Creating Account...')}
                        </div>
                      ) : (
                        t('Create Account')
                      )}
                    </span>
                  </motion.button>
                </form>
              </div>

              {/* Right Side - Google Signup */}
              <div className="lg:w-1/2 flex flex-col justify-center">
                <div className="text-center mb-8">
                  <motion.h3 
                    className="text-xl font-semibold text-gray-900 mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {t('Quick Sign Up')}
                  </motion.h3>
                  <motion.p 
                    className="text-gray-600 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {t('Use your Google account to get started')}
                  </motion.p>
                </div>

                <motion.button
                  onClick={handleGoogleSignup}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-5 h-5"
                    aria-hidden="true"
                  >
                    <path fill="#FFC107" d="M43.611,20.083h-1.318V20H24v8h11.303C34.494,31.885,29.661,36,24,36c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.061,0,5.842,1.17,7.957,3.083l5.657-5.657C33.866,6.109,29.178,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.651,43.862,21.354,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.816C14.095,16.393,18.748,13,24,13c3.061,0,5.842,1.17,7.957,3.083l5.657-5.657 C33.866,6.109,29.178,4,24,4C16.535,4,10.218,8.067,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.516,0,10.474-2.105,14.227-5.544l-6.564-5.548C29.694,34.943,26.981,36,24,36 c-5.632,0-10.45-4.088-11.275-9.448l-6.591,5.061C8.016,39.05,15.433,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083h-1.318V20H24v8h11.303C34.494,31.885,29.661,36,24,36c-5.118,0-9.426-3.271-10.975-7.854 l-6.591,5.061C8.016,39.05,15.433,44,24,44c11.045,0,20-8.955,20-20C44,22.651,43.862,21.354,43.611,20.083z"/>
                  </svg>
                  <span className="font-medium">{t('Sign up with Google')}</span>
                </motion.button>

                {/* Divider */}
                <motion.div 
                  className="my-6 flex items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink mx-4 text-gray-500 text-sm">{t('OR')}</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </motion.div>

                {/* Already have account */}
                <motion.div 
                  className="text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <p className="text-sm text-gray-600">
                    {t('Already have an account?')}{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none transition-colors"
                    >
                      {t('Sign in here')}
                    </button>
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Verify Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white/95 backdrop-blur-lg border border-white/80 rounded-xl shadow-2xl w-full max-w-md p-6 mx-4"
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">{t('Verify your email')}</h2>
            </div>
            <p className="text-gray-600 text-center mb-4">
              {t('We sent a verification link to')} <span className="font-medium text-blue-600">{email}</span>.
              {t('Please check your inbox and verify your email to continue.')}
            </p>
            {resendMessage && (
              <p className="text-sm text-green-600 text-center mb-4">{resendMessage}</p>
            )}
            <div className="flex flex-col gap-3">
              <motion.button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-[1.02]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('Go to Login')}
              </motion.button>
              <motion.button
                type="button"
                onClick={async () => {
                  try {
                    setResendLoading(true);
                    setResendMessage("");
                    const current = auth.currentUser;
                    if (current) {
                      await sendEmailVerification(current);
                      setResendMessage(t("Verification email resent successfully!"));
                    } else {
                      setResendMessage(t("Session expired. Please sign up again."));
                    }
                  } catch (err) {
                    setResendMessage(err.message);
                  } finally {
                    setResendLoading(false);
                  }
                }}
                className={`w-full px-4 py-2.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 transform hover:scale-[1.02] ${resendLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={resendLoading}
                whileHover={{ scale: resendLoading ? 1 : 1.02 }}
                whileTap={{ scale: resendLoading ? 1 : 0.98 }}
              >
                {resendLoading ? t('Resending...') : t('Resend Email')}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}