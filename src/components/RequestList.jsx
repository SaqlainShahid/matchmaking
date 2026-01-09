import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useOrderGiver } from '../contexts/OrderGiverContext';
import { getInvoicesForOrderGiver } from '../services/ordergiverservices/invoiceService';
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Input } from "./ui/input";
import { Modal } from "./ui/modal";
import { Search, Clock, AlertCircle, CheckCircle, XCircle, MessageSquare, DollarSign, Calendar } from 'lucide-react';
import { t } from '../lib/i18n';
import { normalizeRequest } from '../lib/requestUtils';


const RequestList = () => {
  const navigate = useNavigate();
  const {
    requests: rawRequests,
    loading,
    stats,
    activeTab,
    setActiveTab,
    cancelUserRequest,
    markRequestAsCompleted,
    rateCompletedRequest,
    user
  } = useOrderGiver();
  // Normalize requests so components use consistent fields
  const requests = (rawRequests || []).map(r => normalizeRequest(r));

  const [searchTerm, setSearchTerm] = useState('');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(null);
  const [cancelRequestId, setCancelRequestId] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const location = useLocation();

  // Fetch invoices for this order giver
  useEffect(() => {
    if (!user?.uid) return;
    getInvoicesForOrderGiver(user.uid).then(setInvoices).catch(() => setInvoices([]));
  }, [user]);

  // Initialize search term from ?q= query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    setSearchTerm(q);
  }, [location.search]);

  const getStatusBadge = (statusOrStatut) => {
    const statusMap = {
      // legacy french statuses
      en_attente: {
        text: 'En attente',
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
        icon: <Clock className="h-4 w-4 mr-1" />
      },
      approuvée: {
        text: 'Approuvée',
        className: 'bg-green-100 text-green-800 hover:bg-green-200',
        icon: <CheckCircle className="h-4 w-4 mr-1" />
      },
      rejetée: {
        text: 'Rejetée',
        className: 'bg-red-100 text-red-800 hover:bg-red-200',
        icon: <XCircle className="h-4 w-4 mr-1" />
      },
      // english statuses
      pending: {
        text: 'Pending',
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
        icon: <Clock className="h-4 w-4 mr-1" />
      },
      approved: {
        text: 'Approved',
        className: 'bg-green-100 text-green-800 hover:bg-green-200',
        icon: <CheckCircle className="h-4 w-4 mr-1" />
      },
      rejected: {
        text: 'Rejected',
        className: 'bg-red-100 text-red-800 hover:bg-red-200',
        icon: <XCircle className="h-4 w-4 mr-1" />
      },
      in_progress: {
        text: 'In Progress',
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
        icon: <Clock className="h-4 w-4 mr-1" />
      },
      completed: {
        text: 'Completed',
        className: 'bg-green-100 text-green-800 hover:bg-green-200',
        icon: <CheckCircle className="h-4 w-4 mr-1" />
      }
    };
    return statusMap[statusOrStatut] || { text: statusOrStatut, className: 'bg-gray-100' };
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch =
      (request.title || request.titre || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.description || '')?.toLowerCase().includes(searchTerm.toLowerCase());

    const currentStatus = request.status || request.statut;
    const matchesTab = activeTab === 'all' ? true : currentStatus === activeTab;

    return matchesSearch && matchesTab;
  });

  const handleViewRequest = (requestId) => {
    navigate(`/requests/${requestId}`);
  };

  const handleViewQuotes = (requestId) => {
    navigate(`/requests/${requestId}#quotes`);
  };

  const handleViewMessages = (requestId) => {
    navigate(`/messages?requestId=${requestId}`);
  };

  const handleCancelRequest = async (e, requestId) => {
    e.stopPropagation();
    setCancelRequestId(requestId);
  };

  const handleCompleteRequest = async (e, requestId) => {
    e.stopPropagation();
    if (window.confirm(t('Mark this request as completed?'))) {
      await markRequestAsCompleted(requestId);
    }
  };

  const handleRateRequest = async (e, request) => {
    e.stopPropagation();
    if (rating > 0) {
      await rateCompletedRequest(request.id, rating, review);
      setShowRatingModal(null);
      setRating(0);
      setReview('');
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (filteredRequests.length === 0) {
    return (
      <div className="space-y-4">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder={t('Search requests...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
        </div>

        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" aria-label="Toutes les demandes">
            <span>{t('Toutes')}</span>
            <span className="ml-2 text-xs font-medium rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">{requests.length}</span>
          </TabsTrigger>
          <TabsTrigger value="pending" aria-label="Demandes en attente">
            <span>{t('En attente')}</span>
            <span className="ml-2 text-xs font-medium rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">{requests.filter(r => (r.status || r.statut) === 'pending').length}</span>
          </TabsTrigger>
          <TabsTrigger value="in_progress" aria-label="Demandes en cours">
            <span>{t('En cours')}</span>
            <span className="ml-2 text-xs font-medium rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">{requests.filter(r => (r.status || r.statut) === 'in_progress').length}</span>
          </TabsTrigger>
          <TabsTrigger value="completed" aria-label="Demandes terminées">
            <span>{t('Terminées')}</span>
            <span className="ml-2 text-xs font-medium rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">{requests.filter(r => (r.status || r.statut) === 'completed').length}</span>
          </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">{t('No requests found')}</h3>
          <p className="mt-2 text-sm text-gray-500">
            {searchTerm 
              ? t('No requests match your search. Try a different search term.')
              : activeTab === 'all'
                ? t("You haven't created any service requests yet.")
                : t("You don't have any {status} requests.", { status: activeTab.replace('_', ' ') })}
          </p>
          <div className="mt-6">
            <Button
              onClick={() => navigate('/requests/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Create a new service request"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              {t('New Request')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Search requests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" aria-label="All requests">
            <span>All</span>
            <span className="ml-2 text-xs font-medium rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">{requests.length}</span>
          </TabsTrigger>
          <TabsTrigger value="pending" aria-label="Pending requests">
            <span>Pending</span>
            <span className="ml-2 text-xs font-medium rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">{requests.filter(r => r.status === 'pending').length}</span>
          </TabsTrigger>
          <TabsTrigger value="in_progress" aria-label="In-progress requests">
            <span>In Progress</span>
            <span className="ml-2 text-xs font-medium rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">{requests.filter(r => r.status === 'in_progress').length}</span>
          </TabsTrigger>
          <TabsTrigger value="completed" aria-label="Completed requests">
            <span>Completed</span>
            <span className="ml-2 text-xs font-medium rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">{requests.filter(r => r.status === 'completed').length}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {filteredRequests.map((request) => {
          const currentStatus = request.status || request.statut;
          const status = getStatusBadge(currentStatus);
          const hasAcceptedQuote = !!request.acceptedQuote;
          const isPending = currentStatus === 'pending' || currentStatus === 'en_attente';
          const isInProgress = currentStatus === 'in_progress' || currentStatus === 'en_cours';
          const isCompleted = currentStatus === 'completed' || currentStatus === 'approuvée' || currentStatus === 'terminee';

          // Find invoice for this request
          const invoice = invoices.find(inv => inv.projectId === request.projectId || inv.requestId === request.id);
          return (
            <Card
              key={request.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleViewRequest(request.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {request.title || request.titre || t('Demande sans titre')}
                    <Badge className={status.className}>
                      {status.icon}
                      {status.text}
                    </Badge>
                  </CardTitle>
                  <div className="text-sm text-gray-500 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDistanceToNow(request.createdAt, { addSuffix: true })}
                  </div>
                </div>
                {/* Accepted Quote & Invoice Status */}
                {request.acceptedQuote && (
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      {t('Accepted Quote')}: €{request.acceptedQuote.price || request.acceptedQuote.amount || '-'}
                    </Badge>
                    {invoice && (
                      <Badge className={
                        invoice.status === 'paid'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }>
                        {t('Invoice')}: {invoice.status === 'paid' ? t('Paid') : t('Pending Payment')}
                      </Badge>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-gray-600 line-clamp-2">
                  {request.description || t('Aucune description fournie')}
                </p>
                
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <Badge variant="outline">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    {request.scheduledDate || t('No date set')}
                  </Badge>
                  
                  { (request.serviceType || request.typeService) && (
                    <Badge variant="outline">
                      {request.serviceType || request.typeService}
                    </Badge>
                  )}
                  
                  {(typeof request.budget === 'number' || typeof request.prix === 'number') && (
                    <Badge variant="outline">
                      <DollarSign className="h-3.5 w-3.5 mr-1" />
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(request.budget || request.prix)}
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-2 pb-4 flex justify-between items-center">
                <div className="flex space-x-2">
                  {isPending && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewQuotes(request.id);
                      }}
                    >
                      {t('View Quotes')} ({request.quotes?.length || 0})
                    </Button>
                  )}
                  
                  {isInProgress && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewMessages(request.id);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {t('Message Provider')}
                    </Button>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {isPending && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => handleCancelRequest(e, request.id)}
                    >
                      {t('Cancel')}
                    </Button>
                  )}
                  
                  {isInProgress && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={(e) => handleCompleteRequest(e, request.id)}
                    >
                      {t('Mark as Completed')}
                    </Button>
                  )}
                </div>
              </CardFooter>
              
              {isCompleted && !request.rating && (
                <div className="border-t p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{t('Rate this service')}</h4>
                      <p className="text-xs text-gray-500">{t('Let us know about your experience')}</p>
                    </div>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRatingModal(showRatingModal === request.id ? null : request.id);
                            setRating(star);
                          }}
                          className={`text-${star <= rating ? 'yellow-400' : 'gray-300'} hover:text-yellow-400`}
                        >
                          <svg
                            className="h-5 w-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {showRatingModal === request.id && (
                    <div className="mt-3 space-y-3">
                      <textarea
                        rows="3"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder={t('Share your experience (optional)')}
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRatingModal(null);
                          }}
                        >
                          {t('Cancel')}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => handleRateRequest(e, request)}
                        >
                          {t('Submit Review')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Cancel confirmation modal */}
      <Modal
        open={!!cancelRequestId}
        onClose={() => setCancelRequestId(null)}
        title={t('Cancel Request')}
        icon={<XCircle className="h-5 w-5 text-red-600" />}
        footer={(
          <>
            <Button variant="outline" onClick={() => setCancelRequestId(null)}>
              {t('Keep Request')}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (cancelRequestId) {
                  await cancelUserRequest(cancelRequestId);
                }
                setCancelRequestId(null);
              }}
            >
              {t('Yes, cancel')}
            </Button>
          </>
        )}
      >
        <p className="text-sm text-gray-600">{t('Are you sure you want to cancel this request?')}</p>
      </Modal>
    </div>
  );
};

export default RequestList;
