import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProvidersPendingVerification, getProvidersForVerification, verifyProvider, rejectProvider, getProviderDocuments } from '../../services/adminService';

const Providers = () => {
  const [providersPending, setProvidersPending] = useState([]);
  const [providersVerified, setProvidersVerified] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState(null);
  const [tab, setTab] = useState('pending');

  useEffect(() => {
    const load = async () => {
      try {
        const [pending, approved] = await Promise.all([
          getProvidersPendingVerification(),
          getProvidersForVerification('approved')
        ]);
        setProvidersPending(pending);
        setProvidersVerified(approved);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openDocs = async (providerId) => {
    const docs = await getProviderDocuments(providerId);
    setSelectedDocs({ providerId, docs });
  };

  const handleVerify = async (providerId) => {
    await verifyProvider(providerId);
    setProvidersPending(prev => prev.filter(p => (p.id || p.uid) !== providerId));
    const moved = providersPending.find(p => (p.id || p.uid) === providerId);
    if (moved) setProvidersVerified(prev => [{ ...moved, verificationStatus: 'approved', verified: true }, ...prev]);
  };

  const handleReject = async (providerId) => {
    await rejectProvider(providerId);
    setProvidersPending(prev => prev.filter(p => (p.id || p.uid) !== providerId));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">Providers</h3>
            <p className="text-sm text-gray-600">Review pending and verified providers.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-1.5 rounded-md text-sm border ${tab==='pending' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
              onClick={() => setTab('pending')}
            >Pending ({providersPending.length})</button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm border ${tab==='approved' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
              onClick={() => setTab('approved')}
            >Verified ({providersVerified.length})</button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Service</th>
              <th className="text-left px-4 py-2">Docs</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={5}>Loading...</td></tr>
            ) : (tab === 'pending' ? providersPending : providersVerified).length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={6}>{tab==='pending' ? 'No providers pending verification.' : 'No verified providers found.'}</td></tr>
            ) : (tab === 'pending' ? providersPending : providersVerified).map(p => (
              <tr key={p.id || p.uid} className="border-t">
                <td className="px-4 py-2">{p.displayName || '—'}</td>
                <td className="px-4 py-2">{p.email}</td>
                <td className="px-4 py-2">{p.serviceType || '—'}</td>
                <td className="px-4 py-2"><button className="text-blue-700 hover:underline" onClick={() => openDocs(p.id || p.uid)}>View</button></td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${p.verified || p.verificationStatus === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-800'}`}>
                    {p.verified || p.verificationStatus === 'approved' ? 'Verified' : 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-2 space-x-2">
                  <Link className="text-blue-700 hover:underline" to={`/admin/providers/${p.id || p.uid}/services`}>View Services</Link>
                  {tab === 'pending' ? (
                    <>
                      <button className="text-green-700 hover:underline" onClick={() => handleVerify(p.id || p.uid)}>Approve</button>
                      <button className="text-red-700 hover:underline" onClick={() => handleReject(p.id || p.uid)}>Reject</button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {selectedDocs && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Documents</h4>
            <button className="text-gray-500" onClick={() => setSelectedDocs(null)}>Close</button>
          </div>
          <ul className="mt-2 list-disc list-inside text-sm text-blue-700">
            {selectedDocs.docs.map((d, idx) => (
              <li key={`${selectedDocs.providerId}-${d.url}-${idx}`}><a href={d.url} target="_blank" rel="noreferrer">{d.name || d.url}</a></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Providers;