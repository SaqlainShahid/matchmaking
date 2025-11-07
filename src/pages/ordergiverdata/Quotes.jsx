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
    if (window.confirm('Are you sure you want to accept this quote?')) {
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
    if (window.confirm('Are you sure you want to reject this quote?')) {
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
        text: 'Pending', 
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
        icon: <ClockIcon className="h-4 w-4 mr-1" />
      },
      accepted: { 
        text: 'Accepted', 
        className: 'bg-green-100 text-green-800 hover:bg-green-200',
        icon: <CheckCircle className="h-4 w-4 mr-1" />
      },
      rejected: { 
        text: 'Rejected', 
        className: 'bg-red-100 text-red-800 hover:bg-red-200',
        icon: <X className="h-4 w-4 mr-1" />
      },
      expired: { 
        text: 'Expired', 
        className: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
        icon: <ClockIcon className="h-4 w-4 mr-1" />
      }
    };
    return statusMap[status] || { text: status, className: 'bg-gray-100' };
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
        <h1 className="text-2xl font-semibold mb-4 md:mb-0" style={{ color: 'var(--text-dark)' }}>Quotes</h1>
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search quotes..."
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
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          {filteredQuotes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <AlertCircle className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No {activeTab} quotes found</h3>
                <p className="text-sm text-gray-500">
                  {activeTab === 'pending' 
                    ? 'You don\'t have any pending quotes at the moment.'
                    : `You don't have any ${activeTab} quotes.`}
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
                            {quote.requestTitle || 'Untitled Request'}
                          </CardTitle>
                          <Badge className={status.className}>
                            {status.icon}
                            {status.text}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <span className="font-medium">Provider:</span>
                          <span className="ml-2">{quote.providerName || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                          <span className="font-semibold text-gray-900">${(quote.amount ?? quote.price ?? 0).toLocaleString?.() || (quote.amount ?? quote.price ?? 0)}</span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-2">
                          {quote.note || quote.message || 'No message provided'}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-2 pb-4">
                        <div className="w-full flex justify-between items-center text-xs text-gray-500">
                          <span>
                            Submitted {
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
                                Reject
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={(e) => { e.stopPropagation(); setSelectedQuote(quote); setShowAcceptModal(true); }}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Accept
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
                                Pay Now
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
                            {selectedQuote.requestTitle || 'Quote Details'}
                          </CardTitle>
                          <div className="flex items-center mt-2">
                            <Badge className={getStatusBadge(selectedQuote.status).className}>
                              {getStatusBadge(selectedQuote.status).icon}
                              {getStatusBadge(selectedQuote.status).text}
                            </Badge>
                            <span className="text-sm text-gray-500 ml-2">
                              Submitted {
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
                            View Request
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleMessageProvider(selectedQuote.providerId)}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="font-medium text-gray-900 mb-3">Provider Details</h3>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-500">Provider</p>
                              <p className="text-sm font-medium">{selectedQuote.providerName || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Company</p>
                              <p className="text-sm font-medium">{selectedQuote.companyName || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Email</p>
                              <p className="text-sm font-medium">{selectedQuote.providerEmail || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Phone</p>
                              <p className="text-sm font-medium">
                                {selectedQuote.phoneNumber || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-medium text-gray-900 mb-3">Quote Details</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Quote Amount</span>
                              <span className="text-sm font-semibold">
                                ${(() => {
                                  const amt = selectedQuote?.amount ?? selectedQuote?.price ?? 0;
                                  return (amt && amt.toLocaleString?.()) || amt;
                                })()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Estimated Completion</p>
                              <p className="text-sm font-medium">
                                {(() => {
                                  const v = selectedQuote?.estimatedCompletion;
                                  const d = (v && typeof v === 'object' && typeof v.toDate === 'function')
                                    ? v.toDate()
                                    : (v instanceof Date ? v : null);
                                  return d ? format(d, 'MMM d, yyyy') : 'Not specified';
                                })()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Expires On</p>
                              <p className="text-sm font-medium">
                                {(() => {
                                  const v = selectedQuote?.expiresAt;
                                  const d = (v && typeof v === 'object' && typeof v.toDate === 'function')
                                    ? v.toDate()
                                    : (v instanceof Date ? v : null);
                                  return d ? format(d, 'MMM d, yyyy') : 'Not specified';
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8">
                        <h3 className="font-medium text-gray-900 mb-3">Message from Provider</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-700">
                            {selectedQuote.note || selectedQuote.message || 'No message provided.'}
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
                                      {attachment.name || `Document ${index + 1}`}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Unknown size'}
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
                            Reject Quote
                          </Button>
                          <Button 
                            onClick={() => navigate(`/checkout?quoteId=${selectedQuote.id}`, { state: { quote: selectedQuote } })}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Accept & Pay
                          </Button>
                        </>
                      )}
                      {selectedQuote.status === 'accepted' && (
                        <div className="w-full flex items-center justify-between">
                          <Alert className="bg-green-50 border-green-200 w-full mr-3">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <AlertTitle>Quote Accepted</AlertTitle>
                            <AlertDescription className="text-green-700">
                              You've accepted this quote.
                            </AlertDescription>
                          </Alert>
                          <Button onClick={() => setShowPayModal(true)} className="bg-blue-600 hover:bg-blue-700">Pay Now</Button>
                        </div>
                      )}
                      {selectedQuote.status === 'rejected' && (
                        <div className="w-full">
                          <Alert variant="destructive">
                            <X className="h-5 w-5" />
                            <AlertTitle>Quote Rejected</AlertTitle>
                            <AlertDescription>
                              You've rejected this quote on {format(selectedQuote.updatedAt?.toDate(), 'MMM d, yyyy')}.
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
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No quote selected</h3>
                      <p className="text-sm text-gray-500">
                        Select a quote from the list to view details and take action.
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
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Demo Payment</h3>
            <p className="text-sm text-gray-700">You are paying for the accepted quote.</p>
            <div className="mt-4 text-sm text-gray-600 space-y-2">
              <div className="flex justify-between"><span>Provider</span><span className="font-medium">{selectedQuote.providerName}</span></div>
              <div className="flex justify-between"><span>Amount</span><span className="font-medium">${(selectedQuote.amount ?? selectedQuote.price ?? 0).toLocaleString?.() || (selectedQuote.amount ?? selectedQuote.price ?? 0)}</span></div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowPayModal(false)}>Close</Button>
              <Button onClick={handlePayNow} disabled={paying} className="bg-blue-600 hover:bg-blue-700">{paying ? 'Processing...' : 'Confirm Payment'}</Button>
            </div>
          </div>
        </div>
      )}

      {showAcceptModal && selectedQuote && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Accept & Pay</h3>
            <p className="text-sm text-gray-700">Enter payment details to accept this quote.</p>
            <div className="mt-4 text-sm text-gray-600 space-y-2">
              <div className="flex justify-between"><span>Provider</span><span className="font-medium">{selectedQuote.providerName}</span></div>
              <div className="flex justify-between"><span>Amount</span><span className="font-medium">${(selectedQuote.amount ?? selectedQuote.price ?? 0).toLocaleString?.() || (selectedQuote.amount ?? selectedQuote.price ?? 0)}</span></div>
            </div>
            <div className="mt-4">
              <StripePayment
                amount={(selectedQuote.amount ?? selectedQuote.price ?? 0)}
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
                      amount: selectedQuote.amount ?? selectedQuote.price ?? 0,
                      requestTitle: selectedQuote.requestTitle,
                      invoiceId: inv?.id
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
            <Button variant="outline" onClick={() => setShowAcceptModal(false)}>Cancel</Button>
          </div>
        </div>
      </div>
      )}

      {showPaymentSuccess && paymentSuccessData && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2 text-green-700">Payment Successful</h3>
            <p className="text-sm text-gray-700">Your payment has been processed and the quote has been accepted.</p>
            <div className="mt-4 text-sm text-gray-700 space-y-2">
              <div className="flex justify-between"><span>Provider</span><span className="font-medium">{paymentSuccessData.providerName}</span></div>
              <div className="flex justify-between"><span>Request</span><span className="font-medium">{paymentSuccessData.requestTitle}</span></div>
              <div className="flex justify-between"><span>Amount</span><span className="font-semibold">${(paymentSuccessData.amount ?? 0).toLocaleString?.() || paymentSuccessData.amount}</span></div>
              {paymentSuccessData.invoiceId && (
                <div className="flex justify-between"><span>Invoice ID</span><span className="font-mono">{paymentSuccessData.invoiceId}</span></div>
              )}
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => { setShowPaymentSuccess(false); }}>Close</Button>
              <Button onClick={() => { setShowPaymentSuccess(false); /* Optional: navigate to projects */ }}>Go to Projects</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quotes;
