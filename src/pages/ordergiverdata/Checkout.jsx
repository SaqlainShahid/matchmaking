import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import StripePayment from '../../components/StripePayment';
import { useOrderGiver } from '../../contexts/OrderGiverContext';
import { Modal } from "../../components/ui/modal";
import { Button } from "../../components/ui/button";
import { CheckCircle2 } from 'lucide-react';

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { acceptQuote, createInvoiceForQuote, payInvoice, loadQuotes, getQuoteById } = useOrderGiver();
  const [quote, setQuote] = useState(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paidInvoiceId, setPaidInvoiceId] = useState(null);
  const params = new URLSearchParams(location.search);
  const quoteId = params.get('quoteId');

  useEffect(() => {
    const fetch = async () => {
      try {
        if (quoteId && !location.state?.quote) {
          const q = await getQuoteById(quoteId);
          setQuote(q);
        }
      } catch (e) {
        console.error('Error loading quote for checkout:', e);
      }
    };
    fetch();
  }, [quoteId, location.state, getQuoteById]);

  useEffect(() => {
    // Try to read the selected quote from navigation state
    const stateQuote = location.state?.quote;
    if (stateQuote) {
      setQuote(stateQuote);
    }
  }, [location.state]);

  if (!quote) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold mb-2">Checkout</h1>
        <p className="text-gray-600">No quote selected. Go back to Quotes and choose a quote to pay.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Accept & Pay</h1>
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-700">
          <span>Provider</span>
          <span className="font-medium">{quote.providerName}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-700">
          <span>Request</span>
          <span className="font-medium">{quote.requestTitle}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-900">
          <span>Amount</span>
          <span className="font-semibold">${(quote.amount ?? quote.price ?? 0).toLocaleString?.() || (quote.amount ?? quote.price ?? 0)}</span>
        </div>
      </div>
      <div className="bg-white border rounded-lg p-4">
        <StripePayment
          amount={quote.amount ?? quote.price ?? 0}
          providerName={quote.providerName}
          requestTitle={quote.requestTitle}
          onSuccess={async () => {
            try {
              await acceptQuote(quote.id);
              const inv = await createInvoiceForQuote(quote.id);
              await payInvoice(inv.id);
              await loadQuotes('accepted');
              setPaidInvoiceId(inv.id);
              setShowPaymentSuccess(true);
            } catch (e) {
              console.error('Checkout failed:', e);
            }
          }}
          onError={(msg) => {
            console.error('Payment error:', msg);
          }}
        />
      </div>

      {/* Payment Success Modal */}
      <Modal
        open={showPaymentSuccess}
        onClose={() => setShowPaymentSuccess(false)}
        title="Payment Successful"
        icon={<CheckCircle2 className="text-emerald-600" />}
        footer={(
          <>
            <Button variant="outline" onClick={() => setShowPaymentSuccess(false)}>Close</Button>
            <Button onClick={() => { setShowPaymentSuccess(false); navigate('/projects'); }}>Go to Projects</Button>
          </>
        )}
      >
        <div className="space-y-2 text-sm">
          <p className="text-gray-700">Your payment has been processed successfully and your project has been created.</p>
          {paidInvoiceId && (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice ID</span>
                <span className="font-medium text-gray-900">{paidInvoiceId}</span>
              </div>
            </div>
          )}
          <p className="text-gray-600">You can view your active project in the Projects page.</p>
        </div>
      </Modal>
    </div>
  );
};

export default Checkout;