import React, { useEffect, useState } from 'react';
import { getAllDisputes, resolveDispute } from '../../services/adminService';
import { t } from '../../lib/i18n';

const Disputes = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllDisputes().then(setDisputes).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleResolve = async (id, resolution) => {
    await resolveDispute(id, resolution);
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: 'resolved', resolution } : d));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900">{t('Disputes & Feedback')}</h3>
        <p className="text-sm text-gray-600">{t('Review complaints and resolve issues.')}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">{t('Request')}</th>
              <th className="text-left px-4 py-2">{t('From')}</th>
              <th className="text-left px-4 py-2">{t('Message')}</th>
              <th className="text-left px-4 py-2">{t('Status')}</th>
              <th className="text-left px-4 py-2">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={5}>{t('Loading...')}</td></tr>
            ) : disputes.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={5}>{t('No disputes found.')}</td></tr>
            ) : disputes.map(d => (
              <tr key={d.id} className="border-t">
                <td className="px-4 py-2">{d.requestId}</td>
                <td className="px-4 py-2">{d.userId}</td>
                <td className="px-4 py-2">{d.message}</td>
                <td className="px-4 py-2">{d.status || 'open'}</td>
                <td className="px-4 py-2 space-x-2">
                  <button className="text-green-700 hover:underline" onClick={() => handleResolve(d.id, 'refund_approved')}>{t('Approve Refund')}</button>
                  <button className="text-yellow-700 hover:underline" onClick={() => handleResolve(d.id, 'provider_penalized')}>{t('Penalize Provider')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default Disputes;