import React, { useEffect, useState } from 'react';
import { t } from '../../lib/i18n';
import { getAllRequests, updateRequestStatus, deleteRequest } from '../../services/adminService';

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    getAllRequests().then(setRequests).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = requests.filter(r => statusFilter === 'all' ? true : r.status === statusFilter);

  const handleStatus = async (id, status) => {
    await updateRequestStatus(id, status);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const handleDelete = async (id) => {
    if (window.confirm(t('Delete request?'))) {
      await deleteRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{t('Requests Oversight')}</h3>
          <select className="border rounded-md px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">{t('All')}</option>
            <option value="pending">{t('Pending')}</option>
            <option value="approved">{t('Approved')}</option>
            <option value="in_progress">{t('In Progress')}</option>
            <option value="paid">{t('Paid')}</option>
            <option value="completed">{t('Completed')}</option>
            <option value="rejected">{t('Rejected')}</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">{t('Title')}</th>
              <th className="text-left px-4 py-2">{t('Category')}</th>
              <th className="text-left px-4 py-2">{t('Status')}</th>
              <th className="text-left px-4 py-2">{t('Provider')}</th>
              <th className="text-left px-4 py-2">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={5}>{t('Loading')}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={5}>{t('No requests found.')}</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.title || r.description || '—'}</td>
                <td className="px-4 py-2">{r.category || r.serviceType || '—'}</td>
                <td className="px-4 py-2">{r.status || 'pending'}</td>
                <td className="px-4 py-2">{r.providerId || '—'}</td>
                <td className="px-4 py-2 space-x-2">
                  <select className="border rounded-md px-2 py-1" defaultValue={r.status} onChange={e => handleStatus(r.id, e.target.value)}>
                    <option value="pending">{t('Pending')}</option>
                    <option value="approved">{t('Approved')}</option>
                    <option value="in_progress">{t('In Progress')}</option>
                    <option value="paid">{t('Paid')}</option>
                    <option value="completed">{t('Completed')}</option>
                    <option value="rejected">{t('Rejected')}</option>
                  </select>
                  <button className="text-red-700 hover:underline" onClick={() => handleDelete(r.id)}>{t('Delete')}</button>
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

export default Requests;