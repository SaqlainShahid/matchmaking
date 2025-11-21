import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { t } from '../lib/i18n';

const DashboardProvider = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingQuotes: 0,
    activeProjects: 0,
    completedProjects: 0,
    earnings: 0
  });
  
  const [recentRequests, setRecentRequests] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetch all requests that match the provider's service type
    const q = query(
      collection(db, 'requests'),
      where('status', 'in', ['pending', 'in_progress']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData = [];
      let pendingCount = 0;
      let activeCount = 0;
      let completedCount = 0;
      let totalEarnings = 0;

      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        requestsData.push(data);
        
        if (data.status === 'pending') pendingCount++;
        else if (data.status === 'in_progress') activeCount++;
        else if (data.status === 'completed') completedCount++;
        
        // Calculate earnings (assuming each completed project earns $100 for demo)
        if (data.status === 'completed') {
          totalEarnings += 100; // Replace with actual earnings calculation
        }
      });

      setRecentRequests(requestsData.slice(0, 5));
      setStats({
        totalRequests: requestsData.length,
        pendingQuotes: pendingCount,
        activeProjects: activeCount,
        completedProjects: completedCount,
        earnings: totalEarnings
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleCreateQuote = (requestId = null) => {
    if (requestId) {
      navigate(`/quotes/new?requestId=${requestId}`);
    } else {
      navigate('/quotes/new');
    }
  };

  const handleViewRequest = (requestId) => {
    navigate(`/provider/requests?open=${requestId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r">
          <div className="h-16 flex items-center px-6">
            <span className="font-semibold text-gray-900">Matchmaking</span>
          </div>
          <nav className="px-4 space-y-1">
            <a href="#" className="block px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-medium">{t('Dashboard')}</a>
            <a href="#" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">{t('Requests')}</a>
            <a href="#" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">{t('Quotes')}</a>
            <a href="#" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">{t('Projects')}</a>
            <a href="#" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">{t('Earnings')}</a>
          </nav>
          <div className="px-4 mt-6">
            <Button 
              onClick={() => handleCreateQuote()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {t('New Quote')}
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Topbar */}
          <header className="bg-white border-b h-16 px-6 flex items-center justify-between">
            <div className="flex items-center w-full justify-between">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder={t('Search')}
                  className="w-full h-10 rounded-lg bg-gray-100 text-sm px-3 border border-transparent focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-3 ml-4">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {auth.currentUser?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="text-gray-700 hover:bg-gray-100"
                >
                  {t('Logout')}
                </Button>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <main className="p-6 max-w-7xl mx-auto w-full">
            <h1 className="text-2xl font-semibold text-gray-800 mb-6">{t('Provider Dashboard')}</h1>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">{t('Total Requests')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRequests}</div>
                </CardContent>
              </Card>
              
              <Card className="rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">{t('Pending Quotes')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingQuotes}</div>
                </CardContent>
              </Card>
              
              <Card className="rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">{t('Active Projects')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeProjects}</div>
                </CardContent>
              </Card>
              
              <Card className="rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">{t('Total Earnings')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.earnings}</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Requests */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">{t('Recent Service Requests')}</h2>
                <Button variant="outline" size="sm">{t('View All')}</Button>
              </div>
              
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : recentRequests.length > 0 ? (
                <div className="space-y-4">
                  {recentRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div>
                        <h3 className="font-medium">{request.title || t('Service Request')}</h3>
                        <p className="text-sm text-gray-500">
                          {request.status === 'pending' ? t('Waiting for quotes') : t('In progress')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewRequest(request.id)}
                        >
                          {t('View')}
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleCreateQuote(request.id)}
                        >
                          {t('Send Quote')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">{t('No recent service requests found')}</p>
                  <p className="text-sm text-gray-400 mt-1">{t('New requests will appear here')}</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-medium mb-3">{t('Quick Actions')}</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    {t('View All Requests')}
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    {t('Manage Quotes')}
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    {t('Track Projects')}
                  </Button>
                </div>
              </Card>
              
              <Card className="p-4">
                <h3 className="font-medium mb-3">{t('Performance')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('Response Rate')}</span>
                    <span className="font-medium">95%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Avg. Response Time</span>
                    <span className="font-medium">2h 15m</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Completion Rate</span>
                    <span className="font-medium">92%</span>
                  </div>
                </div>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardProvider;
