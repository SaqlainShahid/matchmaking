import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { auth } from './firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import RoleGuard from './components/RoleGuard.jsx'
import RoleLanding from './components/RoleLanding.jsx'
import { OrderGiverProvider } from './contexts/OrderGiverContext'
import { ProviderProvider } from './contexts/ProviderContext'
import OrderGiverLayout from './layouts/OrderGiverLayout'
import ProviderLayout from './layouts/ProviderLayout'
import AdminLayout from './layouts/AdminLayout'

// Pages
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import PendingApproval from './pages/PendingApproval'
import DashboardOrderGiver from './pages/ordergiverdata/DashboardOrderGiver'
import DashboardProvider from './pages/Serviceproviderdata/DashboardProvider'
import ProviderRequests from './pages/Serviceproviderdata/Requests'
import ProviderQuotes from './pages/Serviceproviderdata/Quotes'
import ProviderProjects from './pages/Serviceproviderdata/Projects'
import ProviderInvoices from './pages/Serviceproviderdata/Invoices'
import ProviderSettings from './pages/Serviceproviderdata/Settings'
import ProviderMessages from './pages/Serviceproviderdata/Messages'
import ProviderServices from './pages/Serviceproviderdata/Services'
import Requests from './pages/ordergiverdata/Requests'
import RequestDetails from './pages/ordergiverdata/RequestDetails'
import ErrorBoundary from './components/ErrorBoundary'
import Quotes from './pages/ordergiverdata/Quotes'
import Checkout from './pages/ordergiverdata/Checkout'    
import Projects from './pages/ordergiverdata/Projects'    
import OGProviders from './pages/ordergiverdata/Providers'
import OGProviderServices from './pages/ordergiverdata/ProviderServices'
import Messages from './pages/ordergiverdata/Messages'    
import FeedbackOG from './pages/ordergiverdata/Feedback'
import RequestForm from './components/RequestForm'
import Settings from './pages/ordergiverdata/Settings'
// Admin Pages
import AdminDashboard from './pages/admindata/Dashboard'
import AdminUsers from './pages/admindata/Users'
import AdminProviders from './pages/admindata/Providers'
import AdminRequests from './pages/admindata/Requests'
import AdminQuotes from './pages/admindata/Quotes'
import AdminPayments from './pages/admindata/Payments'
import AdminNotifications from './pages/admindata/Notifications'
import AdminAnalytics from './pages/admindata/Analytics'
import AdminDisputes from './pages/admindata/Disputes'
import AdminConfig from './pages/admindata/Config'
import AdminFeedback from './pages/admindata/Feedback'
import AdminMessages from './pages/admindata/Messages'
import AdminProviderServices from './pages/admindata/ProviderServices'
import AdminProviderServiceDetail from './pages/admindata/ProviderServiceDetail'
import FeedbackProvider from './pages/Serviceproviderdata/Feedback'
import Earnings from './pages/Serviceproviderdata/Earnings'
import Payments from './pages/ordergiverdata/Payments'
import AdminRevenue from './pages/admindata/Revenue'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorBoundary>
        <Routes>
          <Route
            path="/"
            element={<RoleLanding />}
          />
        <Route
          path="/login"
          element={user && user.emailVerified ? <RoleLanding /> : <Login />}
        />
        <Route
          path="/signup"
          element={user && user.emailVerified ? <Navigate to="/dashboard" /> : <Signup />}
        />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Order Giver Area with static sidebar */}
        <Route
          element={
            <ProtectedRoute>
              <OrderGiverProvider>
                <OrderGiverLayout />
              </OrderGiverProvider>
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<RoleLanding />} />
          <Route path="/dashboard/order-giver" element={<DashboardOrderGiver />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/requests/new" element={<RequestForm />} />
          <Route path="/requests/:id" element={<RequestDetails />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/providers" element={<OGProviders />} />
          <Route path="/providers/:providerId/services" element={<OGProviderServices />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/feedback" element={<FeedbackOG />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/payments" element={<Payments />} />
        </Route>
        {/* Protected Provider Area with static sidebar */}
        <Route
          element={
            <ProtectedRoute>
              <RoleGuard allowed={["service_provider", "provider"]}>
                <ProviderProvider>
                  <ProviderLayout />
                </ProviderProvider>
              </RoleGuard>
            </ProtectedRoute>
          }
        >
          <Route path="/provider" element={<Navigate to="/provider/dashboard" replace />} />
          <Route path="/dashboard/provider" element={<Navigate to="/provider/dashboard" replace />} />
          <Route path="/provider/dashboard" element={<DashboardProvider />} />
          <Route path="/provider/requests" element={<ProviderRequests />} />
          <Route path="/provider/quotes" element={<ProviderQuotes />} />
          <Route path="/provider/quotes/new" element={<ProviderQuotes />} />
          <Route path="/provider/projects" element={<ProviderProjects />} />
          <Route path="/provider/services" element={<ProviderServices />} />
          <Route path="/provider/invoices" element={<ProviderInvoices />} />
          <Route path="/provider/messages" element={<ProviderMessages />} />
          <Route path="/provider/feedback" element={<FeedbackProvider />} />
          <Route path="/provider/settings" element={<ProviderSettings />} />
          <Route path="/provider/earnings" element={<Earnings />} />
        </Route>

        {/* Protected Admin Area with static sidebar */}
        <Route
          element={
            <ProtectedRoute>
              <RoleGuard allowed={["admin"]}>
                <AdminLayout />
              </RoleGuard>
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/providers" element={<AdminProviders />} />
          <Route path="/admin/providers/:providerId/services" element={<AdminProviderServices />} />
          <Route path="/admin/providers/:providerId/services/:serviceId" element={<AdminProviderServiceDetail />} />
          <Route path="/admin/requests" element={<AdminRequests />} />
          <Route path="/admin/quotes" element={<AdminQuotes />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/revenue" element={<AdminRevenue />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/messages" element={<AdminMessages />} />
          <Route path="/admin/feedback" element={<AdminFeedback />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/disputes" element={<AdminDisputes />} />
          <Route path="/admin/config" element={<AdminConfig />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </div>
  )
}

export default App
