import React, { useEffect, useState } from 'react';
import { getAllQuotes, setQuoteStatus } from '../../services/adminService';

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getAllQuotes().then(setQuotes).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = quotes.filter(q => filter === 'all' ? true : q.status === filter);

  const handleStatus = async (id, status) => {
    await setQuoteStatus(id, status);
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900">Quotes</h3>
        <select className="border rounded-md px-3 py-2 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="accepted">Accepted</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">Request</th>
              <th className="text-left px-4 py-2">Provider</th>
              <th className="text-left px-4 py-2">Amount</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={5}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={5}>No quotes found.</td></tr>
            ) : filtered.map(q => (
              <tr key={q.id} className="border-t">
                <td className="px-4 py-2">{q.requestId}</td>
                <td className="px-4 py-2">{q.providerId}</td>
                <td className="px-4 py-2">{q.amount}</td>
                <td className="px-4 py-2">{q.status || 'submitted'}</td>
                <td className="px-4 py-2">
                  <select className="border rounded-md px-2 py-1" defaultValue={q.status} onChange={e => handleStatus(q.id, e.target.value)}>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="accepted">Accepted</option>
                  </select>
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

export default Quotes;