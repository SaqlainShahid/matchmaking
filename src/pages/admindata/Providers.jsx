import React, { useEffect, useState } from 'react';
import { getProvidersPendingVerification, verifyProvider, rejectProvider, getProviderDocuments } from '../../services/adminService';

const Providers = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState(null);

  useEffect(() => {
    getProvidersPendingVerification().then(setProviders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openDocs = async (providerId) => {
    const docs = await getProviderDocuments(providerId);
    setSelectedDocs({ providerId, docs });
  };

  const handleVerify = async (providerId) => {
    await verifyProvider(providerId);
    setProviders(prev => prev.filter(p => (p.id || p.uid) !== providerId));
  };

  const handleReject = async (providerId) => {
    await rejectProvider(providerId);
    setProviders(prev => prev.filter(p => (p.id || p.uid) !== providerId));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900">Provider Verification</h3>
        <p className="text-sm text-gray-600">Review documents and approve or reject providers.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Service</th>
              <th className="text-left px-4 py-2">Docs</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={5}>Loading...</td></tr>
            ) : providers.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={5}>No providers pending verification.</td></tr>
            ) : providers.map(p => (
              <tr key={p.id || p.uid} className="border-t">
                <td className="px-4 py-2">{p.displayName || '—'}</td>
                <td className="px-4 py-2">{p.email}</td>
                <td className="px-4 py-2">{p.serviceType || '—'}</td>
                <td className="px-4 py-2"><button className="text-blue-700 hover:underline" onClick={() => openDocs(p.id || p.uid)}>View</button></td>
                <td className="px-4 py-2 space-x-2">
                  <button className="text-green-700 hover:underline" onClick={() => handleVerify(p.id || p.uid)}>Approve</button>
                  <button className="text-red-700 hover:underline" onClick={() => handleReject(p.id || p.uid)}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDocs && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Documents</h4>
            <button className="text-gray-500" onClick={() => setSelectedDocs(null)}>Close</button>
          </div>
          <ul className="mt-2 list-disc list-inside text-sm text-blue-700">
            {selectedDocs.docs.map((d, idx) => (
              <li key={idx}><a href={d.url} target="_blank" rel="noreferrer">{d.name || d.url}</a></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Providers;