import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
// modal removed in favor of full-page detail view
import { getProviderServices } from '../../services/providerservices/serviceCatalogService';
import { getProviderProfile } from '../../services/providerservices/providerService';

const ProviderServicesAdmin = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  // removed modal state; using route-based detail page

  useEffect(() => {
    const load = async () => {
      try {
        const [p, s] = await Promise.all([
          getProviderProfile(providerId),
          getProviderServices(providerId)
        ]);
        setProvider(p);
        setServices(s);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [providerId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex-1">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Provider Services</h2>
          <p className="text-gray-600 mt-2">View services published by this provider.</p>
          <div className="mt-3 text-sm text-gray-700">
            <div><span className="text-gray-500">Provider:</span> <span className="font-medium">{provider?.displayName || providerId}</span></div>
            <div><span className="text-gray-500">Email:</span> <span>{provider?.email || '—'}</span></div>
            <div><span className="text-gray-500">Service Type:</span> <span>{provider?.serviceType || '—'}</span></div>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
          <Link to={`/admin/providers`} className="btn btn-outline">All Providers</Link>
        </div>
      </div>

      <Card className="border border-gray-200 rounded-lg shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="text-lg font-semibold text-gray-900">Services</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-600">Loading...</div>
          ) : services.length === 0 ? (
            <div className="text-sm text-gray-600">No services found for this provider.</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2">Title</th>
                    <th className="text-left px-4 py-2">Category</th>
                    <th className="text-left px-4 py-2">Price</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Tags</th>
                    <th className="text-left px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s.id} className="border-t">
                      <td className="px-4 py-2 font-medium text-gray-900">{s.title}</td>
                      <td className="px-4 py-2 text-gray-700">{s.category || '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{s.currency || 'USD'}{s.price || 0}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${s.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                          {s.status || 'draft'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{Array.isArray(s.tags) ? s.tags.join(', ') : '—'}</td>
                      <td className="px-4 py-2">
                        <Link to={`/admin/providers/${providerId}/services/${s.id}`} className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal removed; detail now uses dedicated route */}
    </div>
  );
};

export default ProviderServicesAdmin;