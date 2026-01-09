import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { useOrderGiver } from '../../contexts/OrderGiverContext';
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import { Search, Clock, Check, X, MessageSquare, DollarSign, AlertCircle, CheckCircle, Clock as ClockIcon, FileText } from 'lucide-react';
import { Skeleton } from "../../components/ui/skeleton";
import StripePayment from "../../components/StripePayment";
import { t } from '../../lib/i18n';

const Quotes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    quotes, 
    loading, 
    loadQuotes, 
    acceptQuote, 
    rejectQuote,
    getRequestById,
    createInvoiceForQuote,
    payInvoice
  } = useOrderGiver();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [requestDetails, setRequestDetails] = useState({});
  const [showPayModal, setShowPayModal] = useState(false);
  const [paying, setPaying] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  // Load quotes on component mount and when activeTab changes
  useEffect(() => {
    loadQuotes(activeTab);
  }, [activeTab]);

  // Load request details when selectedQuote changes
  useEffect(() => {
    if (selectedQuote) {
      const fetchRequestDetails = async () => {
        try {
          const request = await getRequestById(selectedQuote.requestId);
          setRequestDetails(request);
        } catch (error) {
          console.error('Error fetching request details:', error);
        }
      };
      fetchRequestDetails();
    }
  }, [selectedQuote]);

  // Handle quote selection from URL hash
  useEffect(() => {
    if (location.hash) {
      const quoteId = location.hash.replace('#', '');
      const quote = quotes.find(q => q.id === quoteId);
      if (quote) {
        setSelectedQuote(quote);
      }
    }
  }, [location.hash, quotes]);

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.requestTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.providerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.message?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch && quote.status === activeTab;
  });

  const handleAcceptQuote = async (e, quoteId) => {
    e.stopPropagation();
    if (window.confirm(t('Are you sure you want to accept this quote?'))) {
      try {
        await acceptQuote(quoteId);
        await loadQuotes(activeTab);
        // Show success message
      } catch (error) {
        console.error('Error accepting quote:', error);
        // Show error message
      }
    }
  };

  const handleRejectQuote = async (e, quoteId) => {
    e.stopPropagation();
    if (window.confirm(t('Are you sure you want to reject this quote?'))) {
      try {
        await rejectQuote(quoteId);
        await loadQuotes(activeTab);
        // Show success message
      } catch (error) {
        console.error('Error rejecting quote:', error);
        // Show error message
      }
    }
  };

  const handleViewRequest = (requestId) => {
    navigate(`/requests/${requestId}`);
  };

  const handleMessageProvider = (providerId) => {
    navigate(`/messages?providerId=${providerId}`);
  };

  const handlePayNow = async () => {
    try {
      setPaying(true);
      const inv = await createInvoiceForQuote(selectedQuote.id);
      setInvoice(inv);
      await payInvoice(inv.id);
      setShowPayModal(false);
      await loadQuotes('accepted');
      setPaymentSuccessData({
        providerName: selectedQuote.providerName,
        amount: selectedQuote.amount ?? selectedQuote.price ?? 0,
        requestTitle: selectedQuote.requestTitle,
        invoiceId: inv?.id
      });
      setShowPaymentSuccess(true);
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setPaying(false);
    }
  };

  const handleAcceptOnly = async () => {
    try {
      setAccepting(true);
      await acceptQuote(selectedQuote.id);
      setShowAcceptModal(false);
      await loadQuotes('accepted');
    } catch (error) {
      console.error('Error accepting quote:', error);
    } finally {
      setAccepting(false);
    }
  };

  const handleAcceptAndPay = async () => {
    try {
      setAccepting(true);
      await acceptQuote(selectedQuote.id);
      setShowAcceptModal(false);
      setShowPayModal(true);
    } catch (error) {
      console.error('Error accepting quote:', error);
    } finally {
      setAccepting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { 
        text: t('Pending'), 
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
        icon: <ClockIcon className="h-4 w-4 mr-1" />
      },
      accepted: { 
        text: t('Accepted'), 
        className: 'bg-green-100 text-green-800 hover:bg-green-200',
        icon: <CheckCircle className="h-4 w-4 mr-1" />
      },
      rejected: { 
        text: t('Rejected'), 
        className: 'bg-red-100 text-red-800 hover:bg-red-200',
        icon: <X className="h-4 w-4 mr-1" />
      },
      expired: { 
        text: t('Expired'), 
        className: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
        icon: <ClockIcon className="h-4 w-4 mr-1" />
      }
    };
    return statusMap[status] || { text: t(status), className: 'bg-gray-100' };
  };

  if (loading && quotes.length === 0) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-semibold mb-4 md:mb-0" style={{ color: 'var(--text-dark)' }}>{t('Quotes')}</h1>
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder={t('Search quotes...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full bg-[var(--card-white)] border border-[var(--border-gray)]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">{t('Pending')}</TabsTrigger>
          <TabsTrigger value="accepted">{t('Accepted')}</TabsTrigger>
          <TabsTrigger value="rejected">{t('Rejected')}</TabsTrigger>
          <TabsTrigger value="expired">{t('Expired')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          {filteredQuotes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <AlertCircle className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">{t('No quotes found')}</h3>
                <p className="text-sm text-gray-500">
                  {activeTab === 'pending' 
                    ? t('You don’t have any pending quotes at the moment.')
                    : t('You don’t have any quotes for this status.')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quote List */}
              <div className="lg:col-span-1 space-y-4">
                {filteredQuotes.map((quote) => {
                  const status = getStatusBadge(quote.status);
                  
                  return (
                    <Card 
                      key={quote.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
                        selectedQuote?.id === quote.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedQuote(quote)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg flex-1 truncate">
                            {quote.requestTitle || t('Untitled Request')}
                          </CardTitle>
                          <Badge className={status.className}>
                            {status.icon}
                            {status.text}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <span className="font-medium">{t('Provider')}:</span>
                          <span className="ml-2">{quote.providerName || t('Unknown')}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                          <span className="font-semibold text-gray-900">{Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(quote.amount ?? quote.price ?? 0)}</span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-2">
                          {quote.note || quote.message || t('No message provided')}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-2 pb-4">
                        <div className="w-full flex justify-between items-center text-xs text-gray-500">
                          <span>
                            {t('Submitted')} {
                              (() => {
                                const d = (quote?.createdAt && typeof quote.createdAt === 'object' && typeof quote.createdAt.toDate === 'function')
                                  ? quote.createdAt.toDate()
                                  : (quote?.createdAt instanceof Date
                                      ? quote.createdAt
                                      : null);
                                return d ? format(d, 'MMM d, yyyy') : '—';
                              })()
                            }
                          </span>
                          {quote.status === 'pending' && (
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={(e) => handleRejectQuote(e, quote.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <X className="h-3.5 w-3.5 mr-1" />
                                {t('Reject')}
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={(e) => { e.stopPropagation(); setSelectedQuote(quote); setShowAcceptModal(true); }}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                {t('Accept')}
                              </Button>
                            </div>
                          )}
                          {quote.status === 'accepted' && (
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                onClick={() => { setSelectedQuote(quote); setShowPayModal(true); }}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                {t('Pay Now')}
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>

              {/* Quote Details */}
              <div className="lg:col-span-2">
                {selectedQuote ? (
                  <Card>
                    <CardHeader className="border-b">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">
                            {selectedQuote.requestTitle || t('Quote Details')}
                          </CardTitle>
                          <div className="flex items-center mt-2">
                            <Badge className={getStatusBadge(selectedQuote.status).className}>
                              {getStatusBadge(selectedQuote.status).icon}
                              {getStatusBadge(selectedQuote.status).text}
                            </Badge>
                            <span className="text-sm text-gray-500 ml-2">
                              {t('Submitted')} {
                                (() => {
                                  const v = selectedQuote?.createdAt;
                                  const d = (v && typeof v === 'object' && typeof v.toDate === 'function')
                                    ? v.toDate()
                                    : (v instanceof Date ? v : null);
                                  return d ? format(d, 'MMM d, yyyy') : '—';
                                })()
                              }
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewRequest(selectedQuote.requestId)}
                          >
                            {t('View Request')}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleMessageProvider(selectedQuote.providerId)}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {t('Message')}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="font-medium text-gray-900 mb-3">{t('Provider Details')}</h3>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-500">{t('Provider')}</p>
                              <p className="text-sm font-medium">{selectedQuote.providerName || t('N/A')}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">{t('Company')}</p>
                              <p className="text-sm font-medium">{selectedQuote.companyName || t('N/A')}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">{t('Email')}</p>
                              <p className="text-sm font-medium">{selectedQuote.providerEmail || t('N/A')}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">{t('Phone')}</p>
                              <p className="text-sm font-medium">
                                {selectedQuote.phoneNumber || t('N/A')}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-medium text-gray-900 mb-3">{t('Quote Details')}</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">{t('Quote Amount')}</span>
                              <span className="text-sm font-semibold">
                                ${(() => {
                                  const amt = selectedQuote?.amount ?? selectedQuote?.price ?? 0;
                                  return (amt && amt.toLocaleString?.()) || amt;
                                })()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">{t('Estimated Completion')}</p>
                              <p className="text-sm font-medium">
                                {(() => {
                                  const v = selectedQuote?.estimatedCompletion;
                                  const d = (v && typeof v === 'object' && typeof v.toDate === 'function')
                                    ? v.toDate()
                                    : (v instanceof Date ? v : null);
                                  return d ? format(d, 'MMM d, yyyy') : t('Not specified');
                                })()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">{t('Expires On')}</p>
                              <p className="text-sm font-medium">
                                {(() => {
                                  const v = selectedQuote?.expiresAt;
                                  const d = (v && typeof v === 'object' && typeof v.toDate === 'function')
                                    ? v.toDate()
                                    : (v instanceof Date ? v : null);
                                  return d ? format(d, 'MMM d, yyyy') : t('Not specified');
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8">
                        <h3 className="font-medium text-gray-900 mb-3">{t('Message from Provider')}</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-700">
                            {selectedQuote.note || selectedQuote.message || t('No message provided')}
                          </p>
                        </div>
                      </div>

                      {selectedQuote.attachments && selectedQuote.attachments.length > 0 && (
                        <div className="mt-6">
                          <h3 className="font-medium text-gray-900 mb-3">Attachments</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {selectedQuote.attachments.map((attachment, index) => (
                              <a 
                                key={index} 
                                href={attachment.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center">
                                  <div className="p-2 bg-blue-50 rounded-lg mr-3">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div className="truncate">
                                    <p className="text-sm font-medium truncate">
                                      {attachment.name || `${t('Document')} ${index + 1}`}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : t('Unknown size')}
                                    </p>
                                  </div>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="border-t pt-4 flex justify-end space-x-3">
                      {selectedQuote.status === 'pending' && (
                        <>
                          <Button 
                            variant="outline" 
                            onClick={(e) => handleRejectQuote(e, selectedQuote.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-2" />
                            {t('Reject Quote')}
                          </Button>
                          <Button 
                            onClick={() => navigate(`/checkout?quoteId=${selectedQuote.id}`, { state: { quote: selectedQuote } })}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {t('Accept & Pay')}
                          </Button>
                        </>
                      )}
                      {selectedQuote.status === 'accepted' && (
                        <div className="w-full flex items-center justify-between">
                          <Alert className="bg-green-50 border-green-200 w-full mr-3">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <AlertTitle>{t('Quote Accepted')}</AlertTitle>
                            <AlertDescription className="text-green-700">
                              {t("You've accepted this quote.")}
                            </AlertDescription>
                          </Alert>
                          <Button onClick={() => setShowPayModal(true)} className="bg-blue-600 hover:bg-blue-700">{t('Pay Now')}</Button>
                        </div>
                      )}
                      {selectedQuote.status === 'rejected' && (
                        <div className="w-full">
                          <Alert variant="destructive">
                            <X className="h-5 w-5" />
                            <AlertTitle>{t('Quote Rejected')}</AlertTitle>
                            <AlertDescription>
                              {t('You rejected this quote on')} {format(selectedQuote.updatedAt?.toDate(), 'MMM d, yyyy')}.
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <div className="text-center p-12">
                      <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                        <AlertCircle className="h-12 w-12 mx-auto" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">{t('No quote selected')}</h3>
                      <p className="text-sm text-gray-500">
                        {t('Select a quote from the list to view details and take action.')}
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showPayModal && selectedQuote && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-4.41 0-8-1.79-8-4V6c0-2.21 3.59-4 8-4s8 1.79 8 4v8c0 2.21-3.59 4-8 4z"/></svg>
                {t('Payment Summary')}
              </h3>
              <button onClick={() => setShowPayModal(false)} className="text-white hover:text-blue-100 text-2xl">×</button>
            </div>
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-block bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold">{t('Provider')}</span>
                <span className="font-medium text-gray-900">{selectedQuote.providerName}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 flex items-center gap-1">
                    <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-4.41 0-8-1.79-8-4V6c0-2.21 3.59-4 8-4s8 1.79 8 4v8c0 2.21-3.59 4-8 4z"/></svg>
                    {t('Client Paid')}
                  </span>
                  <span className="font-bold text-blue-700 text-lg">€{invoice?.clientAmount?.toFixed(2) ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 flex items-center gap-1">
                    <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-4.41 0-8-1.79-8-4V6c0-2.21 3.59-4 8-4s8 1.79 8 4v8c0 2.21-3.59 4-8 4z"/></svg>
                    {t('Provider Receives')}
                  </span>
                  <span className="font-bold text-green-700">€{invoice?.providerAmount?.toFixed(2) ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 flex items-center gap-1">
                    <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-4.41 0-8-1.79-8-4V6c0-2.21 3.59-4 8-4s8 1.79 8 4v8c0 2.21-3.59 4-8 4z"/></svg>
                    {t('Commission')}
                  </span>
                  <span className="font-bold text-yellow-600">€{invoice?.commission?.toFixed(2) ?? '-'}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowPayModal(false)}>{t('Close')}</Button>
                <Button onClick={handlePayNow} disabled={paying} className="bg-blue-600 hover:bg-blue-700 shadow-md">{paying ? t('Processing...') : t('Confirm & Pay')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAcceptModal && selectedQuote && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">{t('Accept & Pay')}</h3>
            <p className="text-sm text-gray-700">{t('Enter payment details to accept this quote.')}</p>
            <div className="mt-4 text-sm text-gray-600 space-y-2">
              <div className="flex justify-between"><span>{t('Provider')}</span><span className="font-medium">{selectedQuote.providerName}</span></div>
              <div className="flex justify-between"><span>{t('Client pays')}</span><span className="font-medium">€{invoice?.clientAmount?.toFixed(2) ?? '-'}</span></div>
              <div className="flex justify-between"><span>{t('Provider receives')}</span><span className="font-medium">€{invoice?.providerAmount?.toFixed(2) ?? '-'}</span></div>
              <div className="flex justify-between"><span>{t('Commission')}</span><span className="font-medium">€{invoice?.commission?.toFixed(2) ?? '-'}</span></div>
            </div>
            <div className="mt-4">
              <StripePayment
                amount={invoice?.clientAmount ?? (selectedQuote.amount ?? selectedQuote.price ?? 0)}
                providerName={selectedQuote.providerName}
                requestTitle={selectedQuote.requestTitle}
                onSuccess={async () => {
                  try {
                    setAccepting(true);
                    await acceptQuote(selectedQuote.id);
                    const inv = await createInvoiceForQuote(selectedQuote.id);
                    await payInvoice(inv.id);
                    setShowAcceptModal(false);
                    await loadQuotes('accepted');
                    setPaymentSuccessData({
                      providerName: selectedQuote.providerName,
                      amount: invoice?.clientAmount ?? selectedQuote.amount ?? selectedQuote.price ?? 0,
                      requestTitle: selectedQuote.requestTitle,
                      invoiceId: inv?.id,
                      providerAmount: invoice?.providerAmount,
                      commission: invoice?.commission
                    });
                    setShowPaymentSuccess(true);
                  } catch (e) {
                    console.error('Accept & Pay failed:', e);
                  } finally {
                    setAccepting(false);
                  }
                }}
                onError={(msg) => {
                  console.error('Payment error:', msg);
                }}
              />
            </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={() => setShowAcceptModal(false)}>{t('Cancel')}</Button>
          </div>
        </div>
      </div>
      )}

      {showPaymentSuccess && paymentSuccessData && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-400 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                {t('Payment Successful')}
              </h3>
              <button onClick={() => setShowPaymentSuccess(false)} className="text-white hover:text-green-100 text-2xl">×</button>
            </div>
            <div className="p-6">
              <p className="text-base text-gray-700 mb-4">{t('Your payment has been processed and the quote has been accepted.')}</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700">{t('Provider')}</span>
                  <span className="font-medium text-gray-900">{paymentSuccessData.providerName}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700">{t('Request')}</span>
                  <span className="font-medium text-gray-900">{paymentSuccessData.requestTitle}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-700 font-medium flex items-center gap-1">{t('Client Paid')}</span>
                  <span className="font-bold text-blue-700 text-lg">€{paymentSuccessData.amount?.toFixed?.(2) ?? paymentSuccessData.amount}</span>
                </div>
                {paymentSuccessData.providerAmount !== undefined && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-700 font-medium flex items-center gap-1">{t('Provider Received')}</span>
                    <span className="font-bold text-green-700">€{paymentSuccessData.providerAmount?.toFixed?.(2) ?? paymentSuccessData.providerAmount}</span>
                  </div>
                )}
                {paymentSuccessData.commission !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-600 font-medium flex items-center gap-1">{t('Commission')}</span>
                    <span className="font-bold text-yellow-600">€{paymentSuccessData.commission?.toFixed?.(2) ?? paymentSuccessData.commission}</span>
                  </div>
                )}
                {paymentSuccessData.invoiceId && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-700">{t('Invoice ID')}</span>
                    <span className="font-mono text-gray-900">{paymentSuccessData.invoiceId}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => { setShowPaymentSuccess(false); }}>{t('Close')}</Button>
                <Button onClick={() => { setShowPaymentSuccess(false); }}>{t('Go to Projects')}</Button>
                <Button variant="outline" className="border-blue-500 text-blue-700" onClick={() => alert('Download coming soon!')}>{t('Download Invoice')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quotes;
