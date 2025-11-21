import React, { useEffect, useState } from 'react';
import { getAllInvoices, markInvoicePaid, syncStripe } from '../../services/adminService';
import { t } from '../../lib/i18n';

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
          <h3 className="font-semibold text-gray-900">{t('Payments & Invoices')}</h3>
          <button className="text-blue-700 hover:underline" onClick={handleStripeSync}>{t('Sync Stripe')}</button>
        </div>
        <p className="text-sm text-gray-600">{t('Total Revenue')}: <span className="font-semibold">${Number(total).toFixed(2)}</span></p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">{t('Invoice')}</th>
              <th className="text-left px-4 py-2">{t('Request')}</th>
              <th className="text-left px-4 py-2">{t('Amount')}</th>
              <th className="text-left px-4 py-2">{t('Status')}</th>
              <th className="text-left px-4 py-2">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={5}>{t('Loading...')}</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={5}>{t('No invoices found.')}</td></tr>
            ) : invoices.map(i => (
              <tr key={i.id} className="border-t">
                <td className="px-4 py-2">{i.id}</td>
                <td className="px-4 py-2">{i.requestId || '—'}</td>
                <td className="px-4 py-2">${Number(i.amount || 0).toFixed(2)}</td>
                <td className="px-4 py-2">{i.status || 'pending'}</td>
                <td className="px-4 py-2">
                  {i.status !== 'paid' && (
                    <button className="text-green-700 hover:underline" onClick={() => handlePaid(i.id)}>{t('Mark Paid')}</button>
                  )}
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

export default Payments;