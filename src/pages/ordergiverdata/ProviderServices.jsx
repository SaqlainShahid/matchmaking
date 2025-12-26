import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getUserById } from '../../services/userService';
import { getProviderServices } from '../../services/providerservices/serviceCatalogService';
import { getOrCreateConversation } from '../../services/messageService';
import StripePayment from '../../components/StripePayment';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Modal } from '../../components/ui/modal';
import { CheckCircle2 } from 'lucide-react';
import { FiArrowLeft, FiMessageSquare, FiShoppingCart, FiTag, FiDollarSign } from 'react-icons/fi';
import { t } from '../../lib/i18n';

const ProviderServices = () => {
  const navigate = useNavigate();
  const { providerId } = useParams();
  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const p = await getUserById(providerId);
        setProvider(p);
        const s = await getProviderServices(providerId, { status: 'published' });
        setServices(s || []);
      } catch (e) {
        console.error('Failed to load provider/services:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [providerId]);

  const providerName = useMemo(() => provider?.displayName || provider?.companyName || t('Provider'), [provider]);

  const handleMessageProvider = async () => {
    try {
      await getOrCreateConversation(providerId).catch(() => {});
      navigate(`/messages?providerId=${providerId}`);
    } catch (e) {
      console.error('Could not initiate conversation:', e);
    }
  };

  const handleBuy = (service) => {
    setSelectedService(service);
    setShowPayment(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/providers')}>
            <FiArrowLeft className="h-4 w-4 mr-1" /> {t('Back')}
          </Button>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-dark)' }}>{providerName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{t('Role:')} {(provider?.role || 'provider').replace('_',' ')}</Badge>
          {provider?.verified && <Badge className="text-xs">{t('Verified')}</Badge>}
          <Button onClick={handleMessageProvider}>
            <FiMessageSquare className="h-4 w-4 mr-1" /> {t('Message Provider')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('Loading services…')}</div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-600">{t('No published services')}</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((svc) => (
            <Card key={svc.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg truncate">{svc.title || t('Untitled Service')}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  {svc.category && (
                    <Badge variant="outline" className="text-xs flex items-center">
                      <FiTag className="h-3 w-3 mr-1 text-gray-500" /> {svc.category}
                    </Badge>
                  )}
                  <Badge className="text-xs flex items-center">
                    <FiDollarSign className="h-3 w-3 mr-1" /> {Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(svc.price ?? 0)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-700 line-clamp-3">{svc.description || t('No description provided.')}</p>
                {Array.isArray(svc.tags) && svc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {svc.tags.map((t, idx) => (
                      <Badge key={`${svc.id}-tag-${idx}`} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => handleBuy(svc)}>
                    <FiShoppingCart className="h-4 w-4 mr-1" /> {t('Buy Now')}
                  </Button>
                  <Button variant="outline" onClick={handleMessageProvider}>
                    <FiMessageSquare className="h-4 w-4 mr-1" /> {t('Message')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      <Modal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        title={`${t('Purchase')} ${selectedService?.title || t('Service')}`}
        footer={null}
      >
        {selectedService && (
          <div className="space-y-3">
            <StripePayment
              amount={selectedService.price ?? 0}
              providerName={providerName}
              requestTitle={selectedService.title || 'Service'}
              onSuccess={() => {
                setShowPayment(false);
                setShowPaymentSuccess(true);
              }}
              onError={(msg) => {
                console.error('Payment error:', msg);
              }}
            />
          </div>
        )}
      </Modal>

      {/* Payment Success Modal */}
      <Modal
        open={showPaymentSuccess}
        onClose={() => setShowPaymentSuccess(false)}
        title={t('Payment Successful')}
        icon={<CheckCircle2 className="text-emerald-600" />}
        footer={(
          <>
            <Button variant="outline" onClick={() => setShowPaymentSuccess(false)}>{t('Close')}</Button>
            <Button onClick={() => { setShowPaymentSuccess(false); navigate('/projects'); }}>{t('Go to Projects')}</Button>
          </>
        )}
      >
        <div className="space-y-2 text-sm">
          <p className="text-gray-700">{t('Your payment has been processed successfully. A project will be created and the provider will be notified.')}</p>
          {selectedService && (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('Service')}</span>
                <span className="font-medium text-gray-900">{selectedService.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('Amount')}</span>
                <span className="font-medium text-gray-900">${(selectedService.price ?? 0).toLocaleString?.() || (selectedService.price ?? 0)} {selectedService.currency || 'USD'}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ProviderServices;