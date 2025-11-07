import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProvider } from '../../contexts/ProviderContext';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Plus, FileText, Clock, CheckCircle, DollarSign } from 'lucide-react';

const DashboardProvider = () => {
  const navigate = useNavigate();
  const ctx = useProvider();
  const stats = ctx?.stats || { totalRequests: 0, pendingQuotes: 0, activeProjects: 0, completedProjects: 0, earnings: 0 };
  const requests = ctx?.requests || [];
  const loadProvider = ctx?.loadProvider || (() => {});
  const loading = ctx?.loading || false;

  useEffect(() => {
    loadProvider();
  }, [loadProvider]);

  const statCards = [
    { title: 'Requests Received', value: stats.totalRequests, description: 'Matching service requests', icon: FileText, color: 'blue' },
    { title: 'Quotes Sent', value: stats.pendingQuotes, description: 'Awaiting decision', icon: Clock, color: 'amber' },
    { title: 'Ongoing Projects', value: stats.activeProjects, description: 'In progress', icon: CheckCircle, color: 'emerald' },
    { title: 'Earnings This Month', value: `$${stats.earnings}`, description: 'Completed invoices', icon: DollarSign, color: 'violet' },
  ];

  const handleSendQuote = (requestId) => {
    navigate(`/provider/quotes/new?requestId=${requestId}`);
  };

  const handleViewProjects = () => navigate('/provider/projects');
  const handleViewInvoices = () => navigate('/provider/invoices');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-inter">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Provider Dashboard</h2>
            <p className="text-gray-600 mt-2 text-base">Overview of incoming requests and projects</p>
            <div className="mt-3 h-1 w-16 bg-blue-600 rounded"></div>
          </div>
          <Button
            onClick={() => navigate('/provider/quotes/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Quote
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className="border border-gray-200 rounded-lg shadow-sm bg-white">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">{card.title}</p>
                    <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                    <p className="text-xs text-gray-500">{card.description}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${
                    card.color === 'blue' ? 'bg-blue-50' :
                    card.color === 'amber' ? 'bg-amber-50' :
                    card.color === 'emerald' ? 'bg-emerald-50' : 'bg-violet-50'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      card.color === 'blue' ? 'text-blue-600' :
                      card.color === 'amber' ? 'text-amber-600' :
                      card.color === 'emerald' ? 'text-emerald-600' : 'text-violet-600'
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Latest Requests */}
      <Card className="border border-gray-200 rounded-lg shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Latest Requests</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Requests matching your category and area</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="border-gray-300 text-gray-700">Export</Button>
              <Button onClick={handleViewProjects} className="bg-gray-900 hover:bg-gray-800 text-white">View Projects</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {requests.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No matching requests right now</div>
            ) : (
              requests.slice(0, 8).map((req) => (
                <div key={req.id} className="p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{req.title || 'Service Request'}</p>
                    <p className="text-sm text-gray-500">{req.serviceType} • {req.priority}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(`/provider/requests?open=${req.id}`)}>View</Button>
                    <Button onClick={() => handleSendQuote(req.id)}>Send Quote</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-medium mb-2">Projects in Progress</h3>
          <p className="text-sm text-gray-500">Track and update project progress</p>
          <Button variant="outline" className="mt-3" onClick={handleViewProjects}>Manage Projects</Button>
        </Card>
        <Card className="p-4">
          <h3 className="font-medium mb-2">Invoices Summary</h3>
          <p className="text-sm text-gray-500">View earnings and invoices</p>
          <Button variant="outline" className="mt-3" onClick={handleViewInvoices}>View Invoices</Button>
        </Card>
      </div>
    </div>
  );
};

export default DashboardProvider;