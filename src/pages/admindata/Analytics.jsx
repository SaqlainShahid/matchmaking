import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { FiRefreshCw } from 'react-icons/fi';
import { getAdminAnalyticsSummary, getMonthlyRevenueSnapshot, getMonthlyUsersSnapshot, getMonthlyRequestsSnapshot } from '../../services/adminService';

const Analytics = () => {
  const [stats, setStats] = useState({ users: 0, providers: 0, requests: 0, quotes: 0, invoices: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState([]);
  const [usersTrend, setUsersTrend] = useState([]);
  const [requestsTrend, setRequestsTrend] = useState([]);

  const load = async () => {
    setLoading(true);
    try { const s = await getAdminAnalyticsSummary(); setStats(s || {}); } catch (_) {}

    // Load monthly snapshots and transform to last 6 labeled points
    try {
      const [revenueSeries, usersSeries, requestsSeries] = await Promise.all([
        getMonthlyRevenueSnapshot(12),
        getMonthlyUsersSnapshot(12),
        getMonthlyRequestsSnapshot(12)
      ]);
      const toLabelData = (series, key) => series.slice(Math.max(0, series.length - 6)).map(({ key: k, value }) => {
        const [y, m] = k.split('-');
        const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString(undefined, { month: 'short' });
        return key === 'total' ? { month: label, total: value } : { month: label, count: value };
      });
      setRevenueData(toLabelData(revenueSeries, 'total'));
      setUsersTrend(toLabelData(usersSeries, 'count'));
      setRequestsTrend(toLabelData(requestsSeries, 'count'));
    } catch (_) {
      setRevenueData([]);
      setUsersTrend([]);
      setRequestsTrend([]);
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Analytics</h3>
          <p className="text-sm text-gray-600">Key platform metrics and trends.</p>
        </div>
        <button className="btn-primary" onClick={load} disabled={loading}>
          <span className="inline-flex items-center gap-2"><FiRefreshCw /> Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-semibold">{stats.users}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Providers</p>
          <p className="text-2xl font-semibold">{stats.providers}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Requests</p>
          <p className="text-2xl font-semibold">{stats.requests}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Quotes</p>
          <p className="text-2xl font-semibold">{stats.quotes}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Invoices</p>
          <p className="text-2xl font-semibold">{stats.invoices}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Revenue</p>
          <p className="text-2xl font-semibold">${Number(stats.revenue || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Charts */}
      {!loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold text-gray-900">Revenue Trend</h4>
            </div>
            {revenueData.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="primaryGradientAnalytics" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(37,99,235,0.2)" />
                        <stop offset="100%" stopColor="rgba(37,99,235,0.9)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => `$${Number(v || 0).toFixed(2)}`} />
                    <Bar dataKey="total" fill="url(#primaryGradientAnalytics)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-sm">No paid invoices yet</div>
            )}
          </div>

          {/* New Users Trend */}
          <div className="bg-white border rounded-xl p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">New Users Trend</h4>
            {usersTrend.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usersTrend} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="successGradientAnalytics" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(22,163,74,0.2)" />
                        <stop offset="100%" stopColor="rgba(22,163,74,0.9)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => `${Number(v || 0)} users`} />
                    <Bar dataKey="count" fill="url(#successGradientAnalytics)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-sm">No recent user signups data</div>
            )}
          </div>

          {/* Requests Trend */}
          <div className="bg-white border rounded-xl p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Requests Trend</h4>
            {requestsTrend.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={requestsTrend} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="warningGradientAnalytics" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(245,158,11,0.2)" />
                        <stop offset="100%" stopColor="rgba(245,158,11,0.9)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => `${Number(v || 0)} requests`} />
                    <Bar dataKey="count" fill="url(#warningGradientAnalytics)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-sm">No recent requests data</div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-4"><div className="animate-pulse h-48" /></div>
          <div className="bg-white border rounded-xl p-4"><div className="animate-pulse h-48" /></div>
        </div>
      )}
    </div>
  );
};

export default Analytics;