import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderGiver } from '../../contexts/OrderGiverContext';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import RequestList from '../../components/RequestList';
import { Plus, FileText, Clock, CheckCircle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { t } from '../../lib/i18n';

const DashboardOrderGiver = () => {
  const navigate = useNavigate();
  const { stats, loadUserProfile, loading } = useOrderGiver();
  const [previousStats, setPreviousStats] = useState(null);

  useEffect(() => {
    loadUserProfile();
    
    // Simulate loading previous period stats (in real app, this would come from API)
    const mockPreviousStats = {
      totalRequests: Math.max(0, stats.totalRequests - 3),
      pendingQuotes: Math.max(0, stats.pendingQuotes - 2),
      activeProjects: Math.max(0, stats.activeProjects - 1),
      totalSpent: Math.max(0, stats.totalSpent - 500)
    };
    setPreviousStats(mockPreviousStats);
  }, [loadUserProfile]);

  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return { percentage: 0, positive: true };
    const percentage = ((current - previous) / previous) * 100;
    return {
      percentage: Math.round(percentage),
      positive: percentage >= 0
    };
  };

  const handleCreateRequest = () => {
    navigate('/requests/new');
  };

  const statCards = [
    {
      title: t('Total Requests'),
      value: stats.totalRequests,
      description: t('All service requests'),
      icon: FileText,
      color: "blue",
      trend: calculateTrend(stats.totalRequests, previousStats?.totalRequests)
    },
    {
      title: t('Pending Quotes'),
      value: stats.pendingQuotes,
      description: t('Awaiting responses'),
      icon: Clock,
      color: "amber",
      trend: calculateTrend(stats.pendingQuotes, previousStats?.pendingQuotes)
    },
    {
      title: t('Active Projects'),
      value: stats.activeProjects,
      description: t('In progress'),
      icon: CheckCircle,
      color: "emerald",
      trend: calculateTrend(stats.activeProjects, previousStats?.activeProjects)
    },
    {
      title: t('Total Investment'),
      value: `$${stats.totalSpent.toLocaleString()}`,
      description: t('Project expenditure'),
      icon: DollarSign,
      color: "violet",
      trend: calculateTrend(stats.totalSpent, previousStats?.totalSpent)
    }
  ];

  const getTrendDisplay = (trend) => {
    if (!previousStats) return { display: 'N/A', positive: true };
    
    return {
      display: `${trend.positive ? '+' : ''}${trend.percentage}%`,
      positive: trend.positive
    };
  };

  const getProgressWidth = (currentValue, totalRequests) => {
    if (totalRequests === 0) return '0%';
    const percentage = (currentValue / Math.max(...statCards.map(card => 
      typeof card.value === 'string' ? parseInt(card.value.replace(/[^0-9]/g, '')) || 0 : card.value
    ))) * 100;
    return `${Math.min(percentage, 100)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-inter">
      {/* Header - clean enterprise style */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('Project Dashboard')}</h2>
            <p className="text-gray-600 mt-2 text-base">
              {t('Overview of your service requests and project portfolio')}
            </p>
            <div className="mt-3 h-1 w-16 bg-blue-600 rounded"></div>
          </div>
          <Button
            onClick={handleCreateRequest}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label={t('Create a new service request')}
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('New Request')}
          </Button>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, index) => {
          const IconComponent = card.icon;
          const trendDisplay = getTrendDisplay(card.trend);
          
          return (
            <Card 
              key={index}
              className="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 bg-white"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-2">{card.title}</p>
                    <div className="flex items-baseline gap-2 mb-1">
                      <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                      {previousStats && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded flex items-center ${
                          trendDisplay.positive 
                            ? 'bg-green-50 text-green-700' 
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {trendDisplay.positive ? (
                            <TrendingUp className="h-3 w-3 inline mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 inline mr-1" />
                          )}
                          {trendDisplay.display}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{card.description}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${
                    card.color === 'blue' ? 'bg-blue-50' :
                    card.color === 'amber' ? 'bg-amber-50' :
                    card.color === 'emerald' ? 'bg-emerald-50' :
                    'bg-violet-50'
                  }`}>
                    <IconComponent className={`h-5 w-5 ${
                      card.color === 'blue' ? 'text-blue-600' :
                      card.color === 'amber' ? 'text-amber-600' :
                      card.color === 'emerald' ? 'text-emerald-600' :
                      'text-violet-600'
                    }`} />
                  </div>
                </div>
                
                {/* Progress indicator */}
                <div className="mt-4">
                  <div className="w-full bg-gray-100 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full transition-all duration-500 ${
                        card.color === 'blue' ? 'bg-blue-500' :
                        card.color === 'amber' ? 'bg-amber-500' :
                        card.color === 'emerald' ? 'bg-emerald-500' :
                        'bg-violet-500'
                      }`}
                      style={{ 
                        width: getProgressWidth(
                          typeof card.value === 'string' 
                            ? parseInt(card.value.replace(/[^0-9]/g, '')) || 0 
                            : card.value,
                          stats.totalRequests
                        )
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Request List Section */}
      <Card className="border border-gray-200 rounded-lg shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 font-sans">
                {t('Service Requests')}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {previousStats ? `${t('Compared to previous period')} • ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : t('Manage your ongoing service requests')}
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium"
              >
                {t('Export')}
              </Button>
              <Button 
                onClick={handleCreateRequest}
                className="bg-gray-900 hover:bg-gray-800 text-white font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('New Request')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <RequestList />
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOrderGiver;