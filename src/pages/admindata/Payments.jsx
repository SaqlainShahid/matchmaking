import React, { useEffect, useState } from 'react';
import { getAllInvoices, markInvoicePaid, syncStripe } from '../../services/adminService';

const Payments = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllInvoices().then(setInvoices).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const total = invoices.reduce((sum, i) => sum + (Number(i.amount || 0)), 0);

  const handlePaid = async (id) => {
    await markInvoicePaid(id);
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'paid' } : i));
  };

  const handleStripeSync = async () => {
    await syncStripe();
    // Ideally refresh invoices here
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Payments & Invoices</h3>
          <button className="text-blue-700 hover:underline" onClick={handleStripeSync}>Sync Stripe</button>
        </div>
        <p className="text-sm text-gray-600">Total Revenue: <span className="font-semibold">${Number(total).toFixed(2)}</span></p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">Invoice</th>
              <th className="text-left px-4 py-2">Request</th>
              <th className="text-left px-4 py-2">Amount</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={5}>Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={5}>No invoices found.</td></tr>
            ) : invoices.map(i => (
              <tr key={i.id} className="border-t">
                <td className="px-4 py-2">{i.id}</td>
                <td className="px-4 py-2">{i.requestId || '—'}</td>
                <td className="px-4 py-2">${Number(i.amount || 0).toFixed(2)}</td>
                <td className="px-4 py-2">{i.status || 'pending'}</td>
                <td className="px-4 py-2">
                  {i.status !== 'paid' && (
                    <button className="text-green-700 hover:underline" onClick={() => handlePaid(i.id)}>Mark Paid</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payments;