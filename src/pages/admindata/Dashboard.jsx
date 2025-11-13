import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { getAdminAnalyticsSummary, syncStripe, getAllInvoices, getAllRequests, getAllUsers, getMonthlyRevenueSnapshot, getMonthlyUsersSnapshot, getMonthlyRequestsSnapshot, computeTimeSeriesTrends } from '../../services/adminService';
import { FiRefreshCw, FiDownloadCloud, FiBell, FiChevronRight } from 'react-icons/fi';
import ComingSoon from '../../components/ComingSoon';

const Dashboard = () => {
  const [stats, setStats] = useState({ users: 0, providers: 0, requests: 0, quotes: 0, invoices: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [usersTrend, setUsersTrend] = useState([]);
  const [requestsTrend, setRequestsTrend] = useState([]);
  const [trendRevenue, setTrendRevenue] = useState({ current: 0, previous: null, mom: null, yoy: null });
  const [trendUsers, setTrendUsers] = useState({ current: 0, previous: null, mom: null, yoy: null });
  const [trendRequests, setTrendRequests] = useState({ current: 0, previous: null, mom: null, yoy: null });

  useEffect(() => {
    refreshStats();
  }, []);

  const refreshStats = async () => {
    setLoading(true);
    try {
      const s = await getAdminAnalyticsSummary();
      setStats(s);
      setLastUpdated(new Date());
      // Load revenue by month using service snapshots (last 12 months)
      try {
        const revenueSeries = await getMonthlyRevenueSnapshot(12);
        setTrendRevenue(computeTimeSeriesTrends(revenueSeries));
        const data = revenueSeries.slice(Math.max(0, revenueSeries.length - 6)).map(({ key, value }) => {
          const [y, m] = key.split('-');
          const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString(undefined, { month: 'short' });
          return { month: label, total: value };
        });
        setRevenueData(data);
      } catch (_) {
        setRevenueData([]);
      }
      // Load users and requests monthly trend (last 6 months)
      try {
        const [usersSeries, requestsSeries] = await Promise.all([
          getMonthlyUsersSnapshot(12),
          getMonthlyRequestsSnapshot(12)
        ]);
        setTrendUsers(computeTimeSeriesTrends(usersSeries));
        setTrendRequests(computeTimeSeriesTrends(requestsSeries));
        const usersData = usersSeries.slice(Math.max(0, usersSeries.length - 6)).map(({ key, value }) => {
          const [y, m] = key.split('-');
          const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString(undefined, { month: 'short' });
          return { month: label, count: value };
        });
        const requestsData = requestsSeries.slice(Math.max(0, requestsSeries.length - 6)).map(({ key, value }) => {
          const [y, m] = key.split('-');
          const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString(undefined, { month: 'short' });
          return { month: label, count: value };
        });
        setUsersTrend(usersData);
        setRequestsTrend(requestsData);
      } catch (_) {
        setUsersTrend([]);
        setRequestsTrend([]);
      }
    } catch (_) {
      // swallow for now
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Users', stats.users],
      ['Providers', stats.providers],
      ['Requests', stats.requests],
      ['Quotes', stats.quotes],
      ['Invoices', stats.invoices],
      ['Revenue', stats.revenue],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-dashboard-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatPct = (n) => {
    if (n === null || n === undefined) return 'N/A';
    const sign = n > 0 ? '+' : '';
    return `${sign}${Math.round(n)}%`;
  };

  return (
    <div className="space-y-6 font-inter">
      {/* Header / Actions */}
      <div className="card glass">
        <div className="card-content">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h2>
              <p className="text-gray-600 mt-1">Overview of platform activity and performance</p>
              {lastUpdated && (
                <p className="text-xs text-gray-500 mt-1">Last updated: {lastUpdated.toLocaleString()}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row md:flex-wrap">
              <button className="btn-secondary" onClick={exportCsv}>
                <span className="inline-flex items-center gap-2"><FiDownloadCloud /> Export CSV</span>
              </button>
              <button className="btn-secondary" onClick={() => window.location.assign('/admin/notifications')}>
                <span className="inline-flex items-center gap-2"><FiBell /> Broadcast</span>
              </button>
              <button className="btn-primary" onClick={refreshStats}>
                <span className="inline-flex items-center gap-2"><FiRefreshCw /> Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card glass">
          <CardContent className="card-content">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Total Users</p>
              <span className={`kpi-chip ${trendUsers.mom > 0 ? 'kpi-success' : trendUsers.mom < 0 ? 'kpi-error' : 'kpi-info'}`}>
                <span className="kpi-dot"></span> MoM {formatPct(trendUsers.mom)}
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.users}</p>
          </CardContent>
        </Card>
        <Card className="card glass">
          <CardContent className="card-content">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Providers</p>
              <span className="kpi-chip kpi-success"><span className="kpi-dot"></span> Supply</span>
            </div>
            <p className="text-2xl font-semibold">{stats.providers}</p>
          </CardContent>
        </Card>
        <Card className="card glass">
          <CardContent className="card-content">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Requests</p>
              <span className="kpi-chip kpi-warning"><span className="kpi-dot"></span> Demand</span>
            </div>
            <p className="text-2xl font-semibold">{stats.requests}</p>
          </CardContent>
        </Card>
        <Card className="card glass">
          <CardContent className="card-content">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Quotes</p>
              <span className="kpi-chip kpi-info"><span className="kpi-dot"></span> Pipeline</span>
            </div>
            <p className="text-2xl font-semibold">{stats.quotes}</p>
          </CardContent>
        </Card>
        <Card className="card glass">
          <CardContent className="card-content">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Invoices</p>
              <span className="kpi-chip kpi-success"><span className="kpi-dot"></span> Billing</span>
            </div>
            <p className="text-2xl font-semibold">{stats.invoices}</p>
          </CardContent>
        </Card>
        <Card className="card glass">
          <CardContent className="card-content">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Revenue</p>
              <div className="flex items-center gap-2">
                <span className={`kpi-chip ${trendRevenue.mom > 0 ? 'kpi-success' : trendRevenue.mom < 0 ? 'kpi-error' : 'kpi-info'}`}>
                  <span className="kpi-dot"></span> MoM {formatPct(trendRevenue.mom)}
                </span>
                <span className={`kpi-chip ${trendRevenue.yoy > 0 ? 'kpi-success' : trendRevenue.yoy < 0 ? 'kpi-error' : 'kpi-info'}`}>
                  <span className="kpi-dot"></span> YoY {formatPct(trendRevenue.yoy)}
                </span>
              </div>
            </div>
            <p className="text-2xl font-semibold">${Number(stats.revenue || 0).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Activity */}
      {!loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card glass">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
                <button className="btn-secondary" onClick={() => syncStripe().catch(() => {})}>
                  Sync Stripe
                </button>
              </div>
            </div>
            <div className="card-content">
              {revenueData.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <defs>
                        <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(37,99,235,0.2)" />
                          <stop offset="100%" stopColor="rgba(37,99,235,0.9)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => `$${Number(v || 0).toFixed(2)}`} />
                      <Bar dataKey="total" fill="url(#primaryGradient)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                  No paid invoices yet
                </div>
              )}
            </div>
          </div>
          <div className="card glass">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="card-content">
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-center justify-between"><span>New users joined</span><span className="text-gray-500">{stats.users}</span></li>
                <li className="flex items-center justify-between"><span>New requests</span><span className="text-gray-500">{stats.requests}</span></li>
                <li className="flex items-center justify-between"><span>Quotes issued</span><span className="text-gray-500">{stats.quotes}</span></li>
                <li className="flex items-center justify-between"><span>Invoices generated</span><span className="text-gray-500">{stats.invoices}</span></li>
              </ul>
              <div className="mt-4">
                <button className="btn-secondary" onClick={() => window.location.assign('/admin/analytics')}>
                  <span className="inline-flex items-center gap-2">View analytics <FiChevronRight /></span>
                </button>
              </div>
            </div>
          </div>
          {/* Additional charts: Users & Requests Trends */}
          <div className="card glass">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">New Users Trend</h3>
            </div>
            <div className="card-content">
              {usersTrend.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={usersTrend} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <defs>
                        <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(22,163,74,0.2)" />
                          <stop offset="100%" stopColor="rgba(22,163,74,0.9)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => `${Number(v || 0)} users`} />
                      <Bar dataKey="count" fill="url(#successGradient)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                  No recent user signups data
                </div>
              )}
            </div>
          </div>
          <div className="card glass">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900">Requests Trend</h3>
            </div>
            <div className="card-content">
              {requestsTrend.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={requestsTrend} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                      <defs>
                        <linearGradient id="warningGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(245,158,11,0.2)" />
                          <stop offset="100%" stopColor="rgba(245,158,11,0.9)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => `${Number(v || 0)} requests`} />
                      <Bar dataKey="count" fill="url(#warningGradient)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                  No recent requests data
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card"><div className="card-content animate-pulse h-48"></div></div>
          <div className="card"><div className="card-content animate-pulse h-48"></div></div>
        </div>
      )}

      {/* Coming Soon blocks */}
      <ComingSoon title="Provider Performance Insights" description="Deeper analytics on provider response times, conversion rates, and category heatmaps." />
      <ComingSoon title="Automated Risk Monitoring" description="Real-time anomaly detection across payments, messaging, and account activity." />
    </div>
  );
};

export default Dashboard;