import React, { useEffect, useState } from 'react';
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
    if (window.confirm('Delete request?')) {
      await deleteRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Requests Oversight</h3>
          <select className="border rounded-md px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="in_progress">In Progress</option>
            <option value="paid">Paid</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">Title</th>
              <th className="text-left px-4 py-2">Category</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Provider</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={5}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={5}>No requests found.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.title || r.description || '—'}</td>
                <td className="px-4 py-2">{r.category || r.serviceType || '—'}</td>
                <td className="px-4 py-2">{r.status || 'pending'}</td>
                <td className="px-4 py-2">{r.providerId || '—'}</td>
                <td className="px-4 py-2 space-x-2">
                  <select className="border rounded-md px-2 py-1" defaultValue={r.status} onChange={e => handleStatus(r.id, e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="in_progress">In Progress</option>
                    <option value="paid">Paid</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button className="text-red-700 hover:underline" onClick={() => handleDelete(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Requests;