import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../lib/i18n';
import { getAllRequests, updateRequestStatus, deleteRequest } from '../../services/adminService';
import { normalizeRequest } from '../../lib/requestUtils';
import Modal from '../../components/ui/modal';

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    getAllRequests().then((rs) => setRequests((rs || []).map(r => normalizeRequest(r)))).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = requests
    .filter(r => statusFilter === 'all' ? true : (r.status || r.statut) === statusFilter)
    .filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      const fields = [
        r.title, r.titre, r.description,
        r.typeService, r.serviceType,
        r.createdByName, r.entrepriseNom, r.createdBy,
        r.provider, r.providerId
      ].filter(Boolean).join(' ').toLowerCase();
      return fields.includes(q) || (r.id || '').toLowerCase().includes(q);
    });

  // Reset to page 1 when filters change
  useEffect(() => setCurrentPage(1), [search, statusFilter, requests]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Prefer normalized fields where possible (migrate away from legacy entreprise fields)
  const normalize = (r) => ({
    ...r,
    title: r.title || r.titre || r.description || '—',
    serviceType: r.serviceType || r.typeService || '—',
    displayName: r.createdByName || r.entrepriseNom || r.createdBy || '—',
    statusVal: r.status || r.statut || '—'
  });

  const handleStatus = async (id, status) => {
    await updateRequestStatus(id, status);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const openDeleteModal = (id) => setDeleteTarget(id);

  const confirmDelete = async (id) => {
    try {
      setDeleting(true);
      await deleteRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };


  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">{t('Requests Oversight')}</h3>
            <p className="text-sm text-gray-600">{t('Application supervision')}</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="search"
              placeholder={t('Search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm w-48"
            />

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
            ) : paged.map((r, idx) => (
              <tr key={r.id} className={`border-t ${(idx + (currentPage-1)*pageSize) % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}>
                <td className="px-4 py-2">{r.title || r.titre || r.description || '—'}</td>
                <td className="px-4 py-2">{r.typeService || r.serviceType || '—'}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    (r.status || r.statut) === 'pending' ? 'bg-yellow-50 text-yellow-800' :
                    (r.status || r.statut) === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                    (r.status || r.statut) === 'rejected' ? 'bg-red-50 text-red-700' :
                    (r.status || r.statut) === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                    (r.status || r.statut) === 'completed' ? 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {t(statusLabel(r.status || r.statut))}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {r.createdByName ? (
                    r.createdByName
                  ) : r.entrepriseNom ? (
                    r.entrepriseNom
                  ) : r.createdBy ? (
                    <Link className="text-blue-700 hover:underline" to={`/admin/users/${r.createdBy}`}>
                      {`${(r.createdBy || '').slice(0, 8)}...`}
                    </Link>
                  ) : '—'}
                </td>
                <td className="px-4 py-2 space-x-2">
                  <select className="border rounded-md px-2 py-1" defaultValue={r.status || r.statut} onChange={e => handleStatus(r.id, e.target.value)}>
                    <option value="pending">{t('Pending')}</option>
                    <option value="approved">{t('Approved')}</option>
                    <option value="rejected">{t('Rejected')}</option>
                    <option value="in_progress">{t('In Progress')}</option>
                    <option value="completed">{t('Completed')}</option>
                  </select>
                  <button className="text-red-700 hover:underline" onClick={() => openDeleteModal(r.id)}>{t('Delete')}</button>
                </td>

              </tr>
            ))}          </tbody>
        </table>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-sm text-gray-600">{t('Showing')} {(filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1)} - {Math.min(currentPage * pageSize, filtered.length)} {t('of')} {filtered.length}</div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border rounded-md" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>{'‹'}</button>
          <div className="text-sm">{currentPage} / {totalPages}</div>
          <button className="px-3 py-1 border rounded-md" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>{'›'}</button>
        </div>
      </div>

      {deleteTarget && (
        <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('Delete request?')}>
          <p className="text-sm text-gray-700">{t('Are you sure you want to delete this request?')}</p>
          <div className="mt-4 flex justify-end gap-2">
            <button className="px-3 py-2 border rounded-md" onClick={() => setDeleteTarget(null)}>{t('Cancel')}</button>
            <button className="px-3 py-2 bg-red-600 text-white rounded-md" onClick={() => confirmDelete(deleteTarget)} disabled={deleting}>{deleting ? t('Deleting...') : t('Delete')}</button>
          </div>
        </Modal>
      )}

    </div>
  );
};


export default Requests;

// Utility to display a status label (supports both 'status' and legacy 'statut')
function statusLabel(value) {
  switch (value) {
    case 'en_attente': return 'En attente';
    case 'approuvée': return 'Approuvée';
    case 'rejetée': return 'Rejetée';
    case 'pending': return 'Pending';
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    case 'in_progress': return 'In Progress';
    case 'completed': return 'Completed';
    default: return value || '—';
  }
}