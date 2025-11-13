import React, { useEffect, useState } from 'react';
import { useProvider } from '../../contexts/ProviderContext';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useLocation, useNavigate } from 'react-router-dom';
import { uploadProviderFile } from '../../services/providerservices/providerService';
import { db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { Modal } from "../../components/ui/modal";
import { CheckCircle2 } from 'lucide-react';

const Quotes = () => {
  const ctx = useProvider();
  const quotes = ctx?.quotes || [];
  const createQuote = ctx?.createQuote || (async () => {});
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ requestId: '', amount: '', duration: '', note: '', package: 'standard', deliverySpeed: '2_days', revisions: 1, includeMaterials: false });
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [requestSummary, setRequestSummary] = useState(null);
  const [showQuoteSuccess, setShowQuoteSuccess] = useState(false);
  const [quoteSuccessInfo, setQuoteSuccessInfo] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestId = params.get('requestId');
    if (requestId) {
      setForm(prev => ({ ...prev, requestId }));
    }
  }, [location.search]);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        if (!form.requestId) { setRequestSummary(null); return; }
        const snap = await getDoc(doc(db, 'requests', form.requestId));
        if (snap.exists()) {
          const data = snap.data();
          setRequestSummary({ id: snap.id, ...data });
        } else {
          setRequestSummary(null);
        }
      } catch (e) {
        console.error('Error loading request summary:', e);
      }
    };
    loadSummary();
  }, [form.requestId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requestId || !form.amount) return;
    setSubmitting(true);
    try {
      let attachments = [];
      if (files.length) {
        const uploaded = await Promise.all(files.map(f => uploadProviderFile(f, 'quotes')));
        attachments = uploaded.map(u => u.url);
      }
      await createQuote(form.requestId, {
        amount: form.amount,
        duration: form.duration,
        note: form.note,
        package: form.package,
        deliverySpeed: form.deliverySpeed,
        revisions: form.revisions,
        includeMaterials: form.includeMaterials,
        attachments
      });
      setForm({ requestId: '', amount: '', duration: '', note: '' });
      setFiles([]);
      setShowQuoteModal(false);
      setQuoteSuccessInfo({
        requestId: form.requestId,
        amount: form.amount,
        duration: form.duration,
        package: form.package
      });
      setShowQuoteSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Quotes</h2>
        <p className="text-gray-600 mt-2">Send and track your quotes</p>
      </div>

      <Card className="border border-gray-200 rounded-lg shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-gray-900">Send Quote</CardTitle>
          <Button onClick={() => setShowQuoteModal(true)} className="bg-blue-600 hover:bg-blue-700">New Quote</Button>
        </CardHeader>
        <CardContent>
          {requestSummary && (
            <div className="mb-4 bg-blue-50 border border-blue-100 rounded-md p-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-blue-900">Request Summary</span>
                <span className="text-blue-800">{requestSummary.serviceType} • {requestSummary.priority}</span>
              </div>
              <div className="text-blue-900 mt-1">{String(requestSummary?.location?.address || '')}</div>
              <div className="text-blue-800 mt-2">{(requestSummary.description || '').slice(0, 160)}{(requestSummary.description || '').length > 160 ? '…' : ''}</div>
            </div>
          )}
          {showQuoteModal && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg w-full sm:max-w-lg md:max-w-2xl lg:max-w-3xl p-6">
                <h3 className="text-lg font-semibold mb-4">Create Professional Quote</h3>
                {requestSummary && (
                  <div className="mb-4 bg-gray-50 border border-gray-100 rounded-md p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Request</span>
                      <span>{requestSummary.serviceType} • {requestSummary.priority}</span>
                    </div>
                    <div className="text-gray-700 mt-1">{String(requestSummary?.location?.address || '')}</div>
                    <div className="text-gray-600 mt-2">{(requestSummary.description || '').slice(0, 120)}{(requestSummary.description || '').length > 120 ? '…' : ''}</div>
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Request ID</label>
                      <input className="border rounded-md p-2 w-full" placeholder="Request ID" value={form.requestId} onChange={(e) => setForm({ ...form, requestId: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Package</label>
                      <select className="border rounded-md p-2 w-full" value={form.package} onChange={(e) => setForm({ ...form, package: e.target.value })}>
                        <option value="basic">Basic</option>
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Amount (USD)</label>
                      <input className="border rounded-md p-2 w-full" type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Delivery Speed</label>
                      <select className="border rounded-md p-2 w-full" value={form.deliverySpeed} onChange={(e) => setForm({ ...form, deliverySpeed: e.target.value })}>
                        <option value="24_hours">24 hours</option>
                        <option value="2_days">2 days</option>
                        <option value="3_5_days">3-5 days</option>
                        <option value="1_week">1 week</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Estimated Duration</label>
                      <input className="border rounded-md p-2 w-full" placeholder="e.g., 2 days" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Revisions</label>
                      <input className="border rounded-md p-2 w-full" type="number" min="0" max="5" value={form.revisions} onChange={(e) => setForm({ ...form, revisions: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input id="materials" type="checkbox" checked={form.includeMaterials} onChange={(e) => setForm({ ...form, includeMaterials: e.target.checked })} />
                    <label htmlFor="materials" className="text-sm text-gray-700">Include materials in the cost</label>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Notes</label>
                    <textarea className="border rounded-md p-2 w-full" rows="3" placeholder="Describe scope, terms, and additional details" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Attachments</label>
                    <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" type="button" onClick={() => setShowQuoteModal(false)}>Cancel</Button>
                    <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Send Quote'}</Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-gray-200 rounded-lg shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="text-lg font-semibold text-gray-900">Your Quotes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {quotes.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No quotes yet</div>
            ) : (
              quotes.map((q) => (
                <div key={q.id} className="p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">Request: {q.requestId}</p>
                    <p className="text-sm text-gray-500">Amount: ${q.amount} • Status: {q.status}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/provider/messages?otherUserId=${q.clientId}`)}>Message</Button>
                    <div className="text-xs text-gray-400">{q.createdAt?.toLocaleString?.() || ''}</div>
                  </div>
                </div>
              ))
            )}
          </div>
      </CardContent>
      </Card>

      {/* Success Modal */}
      <Modal
        open={showQuoteSuccess}
        onClose={() => setShowQuoteSuccess(false)}
        title="Quote Sent"
        icon={<CheckCircle2 className="text-emerald-600" />}
        footer={(
          <>
            <Button variant="outline" onClick={() => setShowQuoteSuccess(false)}>Close</Button>
            <Button onClick={() => { setShowQuoteSuccess(false); navigate('/provider/quotes'); }}>Go to Quotes</Button>
          </>
        )}
      >
        <div className="space-y-2 text-sm">
          <p className="text-gray-700">Your quote has been sent successfully.</p>
          {quoteSuccessInfo && (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Request</span>
                <span className="font-medium text-gray-900">{quoteSuccessInfo.requestId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="font-semibold text-gray-900">${quoteSuccessInfo.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Package</span>
                <span className="text-gray-900">{quoteSuccessInfo.package}</span>
              </div>
            </div>
          )}
          <p className="text-gray-600">You can track status under "Your Quotes".
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Quotes;