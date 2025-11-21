import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { getServiceById, publishService, unpublishService, deleteServiceById } from '../../services/providerservices/serviceCatalogService';
import { getProviderProfile } from '../../services/providerservices/providerService';
import { t } from '../../lib/i18n';

const ProviderServiceDetailAdmin = () => {
  const { providerId, serviceId } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const formatDate = (ts) => {
    try {
      if (!ts) return '—';
      if (typeof ts.toDate === 'function') return ts.toDate().toLocaleString();
      return new Date(ts).toLocaleString();
    } catch (_) {
      return '—';
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        getProviderProfile(providerId),
        getServiceById(serviceId)
      ]);
      setProvider(p || null);
      setService(s || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [providerId, serviceId]);

  const handlePublishToggle = async () => {
    if (!service) return;
    setActionLoading(true);
    try {
      if (service.status === 'published') {
        await unpublishService(service.id);
      } else {
        await publishService(service.id);
      }
      await load();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!service) return;
    const confirmed = window.confirm(t('Delete this service? This action cannot be undone.'));
    if (!confirmed) return;
    setActionLoading(true);
    try {
      await deleteServiceById(service.id);
      navigate(`/admin/providers/${providerId}/services`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="text-sm text-gray-600">
        <Link to="/admin/providers" className="text-green-700 hover:underline">{t('Providers')}</Link>
        <span className="mx-2">/</span>
        <Link to={`/admin/providers/${providerId}/services`} className="text-green-700 hover:underline">{t('Services')}</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{service?.title || t('Service Detail')}</span>
      </nav>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('Service Detail')}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>{t('Back')}</Button>
          <Link to={`/admin/providers/${providerId}/services`} className="btn btn-outline">{t('All')} {t('Services')}</Link>
        </div>
      </div>

      <Card className="border border-gray-200 rounded-lg shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">{service?.title || '—'}</CardTitle>
            {service && (
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${service.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                  {service.status || t('draft')}
                </span>
                <Button onClick={handlePublishToggle} disabled={actionLoading}>
                  {service.status === 'published' ? t('Unpublish') : t('Publish')}
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>{t('Delete')}</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="text-sm text-gray-600">{t('Loading')}</div>
          ) : !service ? (
            <div className="text-sm text-red-600">{t('Service not found.')}</div>
          ) : (
            <>
              {/* Meta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">{t('Category')}</div>
                  <div className="text-gray-900 font-medium">{service.category || '—'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">{t('Price')}</div>
                  <div className="text-gray-900 font-medium">{service.currency || 'USD'}{service.price || 0}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">{t('Tags')}</div>
                  <div className="text-gray-900 font-medium">{Array.isArray(service.tags) && service.tags.length > 0 ? service.tags.join(', ') : '—'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">{t('Provider')}</div>
                  <div className="text-gray-900">{provider?.displayName || providerId}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">{t('Created')}</div>
                  <div className="text-gray-900">{formatDate(service.createdAt)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">{t('Updated')}</div>
                  <div className="text-gray-900">{formatDate(service.updatedAt)}</div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="text-sm text-gray-600">{t('Description')}</div>
                <div className="text-gray-900 whitespace-pre-line">{service.description || '—'}</div>
              </div>

              {/* Images */}
              {Array.isArray(service.images) && service.images.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">{t('Images')}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {service.images.map((url, idx) => (
                      <a key={`${service.id}-${url}-${idx}`} href={url} target="_blank" rel="noreferrer" className="block">
                        <img src={url} alt="service" className="w-full h-28 object-cover rounded-md border border-gray-200" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* IDs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <div>{t('Service ID')}</div>
                  <div className="text-gray-900 font-mono">{service.id}</div>
                </div>
                <div>
                  <div>{t('Provider ID')}</div>
                  <div className="text-gray-900 font-mono">{providerId}</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProviderServiceDetailAdmin;