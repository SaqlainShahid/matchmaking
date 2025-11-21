import React, { useMemo, useState } from 'react';
import { useProvider } from '../../contexts/ProviderContext';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useLocation, useNavigate } from 'react-router-dom';
import { Modal } from "../../components/ui/modal";
import { CheckCircle2 } from 'lucide-react';
import { isImageUrl, thumbnailUrl } from '../../services/cloudinaryService';
import { t } from '../../lib/i18n';

const Requests = () => {
  const ctx = useProvider();
  const requests = ctx?.requests || [];
  const createQuote = ctx?.createQuote || (async () => {});
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const searchParam = (params.get('q') || '').toLowerCase();
  const openParam = params.get('open') || '';
  const [filters, setFilters] = useState({ serviceType: '', urgency: '', location: '', date: 'all', q: '' });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ amount: '', duration: '', note: '', package: 'standard', deliverySpeed: '2_days', revisions: 1, includeMaterials: false });
  const [, setFiles] = useState([]);
  const [showQuoteSuccess, setShowQuoteSuccess] = useState(false);
  const [quoteSuccessInfo, setQuoteSuccessInfo] = useState(null);

  const filtered = useMemo(() => {
    const now = new Date();
    const withinRange = (date) => {
      if (!date) return true;
      const ts = (date?.toDate?.() || (date instanceof Date ? date : null));
      if (!ts) return true;
      const diffMs = now - ts;
      const dayMs = 24 * 60 * 60 * 1000;
      switch (filters.date) {
        case '24h': return diffMs <= dayMs;
        case '7d': return diffMs <= 7 * dayMs;
        case '30d': return diffMs <= 30 * dayMs;
        default: return true;
      }
    };
    return requests.filter(r => {
      const matchSearch = (filters.q || searchParam)
        ? ((r.title || '').toLowerCase().includes((filters.q || searchParam)) || (r.description || '').toLowerCase().includes((filters.q || searchParam)))
        : true;
      const matchType = filters.serviceType ? r.serviceType === filters.serviceType : true;
      const matchUrgency = filters.urgency ? (r.priority === filters.urgency) : true;
      const matchLocation = filters.location ? String(r?.location?.address || '').toLowerCase().includes(filters.location.toLowerCase()) : true;
      const matchDate = withinRange(r.createdAt);
      const notAssignedToOthers = !(r.providerAssigned && r.providerId && r.providerId !== ctx?.user?.uid);
      return matchSearch && matchType && matchUrgency && matchLocation && matchDate && notAssignedToOthers;
    });
  }, [requests, filters, searchParam, ctx?.user?.uid]);

  const PRIORITY_LABELS = {
    urgence_depannage: t('Urgence / Dépannage'),
    urgent_sur_devis: t('Urgent sur devis'),
    travaux_importants: t('Travaux plus importants')
  };
  const TRADE_LABELS = {
    plomberie_chauffage: t('Plomberie & Chauffage'),
    electricite_domotique: t('Électricité & Domotique'),
    menuiserie_amenagement: t('Menuiserie & Aménagement'),
    maconnerie_gros_oeuvre: t('Maçonnerie & Gros Œuvre'),
    peinture_finitions: t('Peinture & Finitions'),
    sols_revetements: t('Sols & Revêtements'),
    chauffage_ventilation_climatisation: t('Chauffage, Ventilation & Climatisation'),
    serrurerie_securite: t('Serrurerie & Sécurité'),
    toiture_couverture: t('Toiture & Couverture'),
    jardin_exterieur: t('Jardin & Extérieur'),
    renovation_energetique_isolation: t('Rénovation Énergétique & Isolation'),
    services_complementaires_coordination: t('Services Complémentaires & Coordination')
  };

  // Open details modal from query param
  React.useEffect(() => {
    if (openParam) {
      const found = requests.find(r => r.id === openParam);
      if (found) {
        setSelectedRequest(found);
        setShowDetails(true);
      }
    }
  }, [openParam, requests]);

  const submitInlineQuote = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      await createQuote(selectedRequest.id, {
        amount: quoteForm.amount,
        duration: quoteForm.duration,
        note: quoteForm.note,
        package: quoteForm.package,
        deliverySpeed: quoteForm.deliverySpeed,
        revisions: quoteForm.revisions,
        includeMaterials: quoteForm.includeMaterials,
        attachments: []
      });
      setShowQuoteModal(false);
      setQuoteSuccessInfo({
        requestId: selectedRequest.id,
        amount: quoteForm.amount,
        duration: quoteForm.duration,
        package: quoteForm.package
      });
      setShowQuoteSuccess(true);
    } catch (err) {
      console.error('Quote submission failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('Requests')}</h2>
        <p className="text-gray-600 mt-2">{t('Browse open requests and submit professional quotes')}</p>
      </div>

      {/* Filters */}
      <Card className="border border-gray-200 rounded-lg shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="text-lg font-semibold text-gray-900">{t('Filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input className="border rounded-md p-2" placeholder={t('Search')} value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
            <select className="border rounded-md p-2" value={filters.serviceType} onChange={(e) => setFilters({ ...filters, serviceType: e.target.value })}>
              <option value="">{t('All Services')}</option>
              <option value="plomberie_chauffage">Plomberie & Chauffage</option>
              <option value="electricite_domotique">Électricité & Domotique</option>
              <option value="menuiserie_amenagement">Menuiserie & Aménagement</option>
              <option value="maconnerie_gros_oeuvre">Maçonnerie & Gros Œuvre</option>
              <option value="peinture_finitions">Peinture & Finitions</option>
              <option value="sols_revetements">Sols & Revêtements</option>
              <option value="chauffage_ventilation_climatisation">Chauffage, Ventilation & Climatisation</option>
              <option value="serrurerie_securite">Serrurerie & Sécurité</option>
              <option value="toiture_couverture">Toiture & Couverture</option>
              <option value="jardin_exterieur">Jardin & Extérieur</option>
              <option value="renovation_energetique_isolation">Rénovation Énergétique & Isolation</option>
              <option value="services_complementaires_coordination">Services Complémentaires & Coordination</option>
            </select>
            <select className="border rounded-md p-2" value={filters.urgency} onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}>
              <option value="">{t('Any Urgency')}</option>
              <option value="urgence_depannage">{t('Urgence / Dépannage')}</option>
              <option value="urgent_sur_devis">{t('Urgent sur devis')}</option>
              <option value="travaux_importants">{t('Travaux plus importants')}</option>
            </select>
            <input className="border rounded-md p-2" placeholder={t('Location')} value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} />
            <select className="border rounded-md p-2" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })}>
              <option value="all">{t('All Dates')}</option>
              <option value="24h">{t('Last 24h')}</option>
              <option value="7d">{t('Last 7 days')}</option>
              <option value="30d">{t('Last 30 days')}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 rounded-lg shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">{t('All Requests')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-gray-500">{t('No requests found')}</div>
            ) : (
              filtered.map((req) => (
                <div key={req.id} className="p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{req.title || t('Service Request')}</p>
                    <p className="text-sm text-gray-500">{TRADE_LABELS[req.serviceType] || req.serviceType} • {PRIORITY_LABELS[req.priority] || req.priority} • {String(req?.location?.address || '').slice(0, 40)}{String(req?.location?.address || '').length > 40 ? '…' : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setSelectedRequest(req); setShowDetails(true); }}>{t('View')}</Button>
                    <Button onClick={() => { setSelectedRequest(req); setShowQuoteModal(true); }}>{t('Submit Quote')}</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      {/* Request Details Modal */}
      {showDetails && selectedRequest && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full sm:max-w-lg md:max-w-2xl lg:max-w-3xl p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-900">{selectedRequest.title || t('Request Details')}</h3>
            <p className="text-sm text-gray-700 mt-2">{selectedRequest.description || t('No description provided.')}</p>
            <div className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center">
                  <span className="w-28 text-gray-500">{t('Service')}</span>
                  <span className="text-gray-900">{selectedRequest.serviceType || '—'}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-28 text-gray-500">{t('Urgency')}</span>
                  <span className="text-gray-900">{selectedRequest.priority || '—'}</span>
                </div>
                <div className="md:col-span-2 flex items-center">
                  <span className="w-28 text-gray-500">{t('Location')}</span>
                  <span className="text-gray-900">{String(selectedRequest?.location?.address || '—')}</span>
                </div>
              </div>
            </div>
            {Array.isArray(selectedRequest.attachments) && selectedRequest.attachments.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">{t('Attachments')}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedRequest.attachments.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group border rounded-md p-2 flex items-center gap-3 hover:bg-gray-50"
                    >
                      {isImageUrl(url) ? (
                        <img
                          src={thumbnailUrl(url, { width: 120, height: 90 })}
                          alt={`Attachment ${i + 1}`}
                          className="h-16 w-20 object-cover rounded"
                        />
                      ) : (
                        <div className="h-16 w-20 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-xs">
                          {t('DOC')}
                        </div>
                      )}
                      <span className="text-blue-600 truncate group-hover:underline">{t('Attachment')} {i + 1}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDetails(false)}>{t('Close')}</Button>
              <Button onClick={() => { setShowDetails(false); setShowQuoteModal(true); }}>{t('Submit Quote')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Quote Modal */}
      {showQuoteModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full sm:max-w-lg md:max-w-2xl lg:max-w-3xl p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-900">{t('Submit Professional Quote')}</h3>
            <p className="text-sm text-gray-700 mt-2">{t('Provide a clear offer including timing and scope.')}</p>
            <form onSubmit={submitInlineQuote} className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">{t('Amount (USD)')}</label>
                  <input className="border rounded-md p-2 w-full" type="number" placeholder="0.00" value={quoteForm.amount} onChange={(e) => setQuoteForm({ ...quoteForm, amount: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">{t('Delivery Speed')}</label>
                  <select className="border rounded-md p-2 w-full" value={quoteForm.deliverySpeed} onChange={(e) => setQuoteForm({ ...quoteForm, deliverySpeed: e.target.value })}>
                    <option value="24_hours">{t('24 hours')}</option>
                    <option value="2_days">{t('2 days')}</option>
                    <option value="3_5_days">{t('3-5 days')}</option>
                    <option value="1_week">{t('1 week')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">{t('Estimated Duration')}</label>
                  <input className="border rounded-md p-2 w-full" placeholder={t('e.g., 2 days')} value={quoteForm.duration} onChange={(e) => setQuoteForm({ ...quoteForm, duration: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">{t('Package')}</label>
                  <select className="border rounded-md p-2 w-full" value={quoteForm.package} onChange={(e) => setQuoteForm({ ...quoteForm, package: e.target.value })}>
                    <option value="basic">{t('Basic')}</option>
                    <option value="standard">{t('Standard')}</option>
                    <option value="premium">{t('Premium')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">{t('Revisions')}</label>
                  <input className="border rounded-md p-2 w-full" type="number" min="0" max="5" value={quoteForm.revisions} onChange={(e) => setQuoteForm({ ...quoteForm, revisions: Number(e.target.value) })} />
                </div>
                <div className="flex items-center space-x-2 md:col-span-2">
                  <input id="materials" type="checkbox" checked={quoteForm.includeMaterials} onChange={(e) => setQuoteForm({ ...quoteForm, includeMaterials: e.target.checked })} />
                  <label htmlFor="materials" className="text-sm text-gray-700">{t('Include materials in the cost')}</label>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t('Notes')}</label>
                <textarea className="border rounded-md p-2 w-full" rows="3" placeholder={t('Describe scope, terms, and additional details')} value={quoteForm.note} onChange={(e) => setQuoteForm({ ...quoteForm, note: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t('Attachments')}</label>
                <input className="border rounded-md p-2 w-full text-sm" type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowQuoteModal(false)}>{t('Cancel')}</Button>
                <Button type="submit">{t('Send Quote')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <Modal
        open={showQuoteSuccess}
        onClose={() => setShowQuoteSuccess(false)}
        title={t('Quote Sent')}
        icon={<CheckCircle2 className="text-emerald-600" />}
        footer={(
          <>
            <Button variant="outline" onClick={() => setShowQuoteSuccess(false)}>{t('Close')}</Button>
            <Button onClick={() => { setShowQuoteSuccess(false); navigate('/provider/quotes'); }}>{t('Go to Quotes')}</Button>
          </>
        )}
      >
        <div className="space-y-2 text-sm">
          <p className="text-gray-700">{t('Your quote has been sent successfully.')}</p>
          {quoteSuccessInfo && (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('Request')}</span>
                <span className="font-medium text-gray-900">{quoteSuccessInfo.requestId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('Amount')}</span>
                <span className="font-semibold text-gray-900">${quoteSuccessInfo.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('Package')}</span>
                <span className="text-gray-900">{quoteSuccessInfo.package}</span>
              </div>
            </div>
          )}
          <p className="text-gray-600">{t('You can track status under "Your Quotes".')}</p>
        </div>
      </Modal>
    </div>
  );
};

export default Requests;