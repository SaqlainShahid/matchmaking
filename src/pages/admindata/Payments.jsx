import React, { useEffect, useState } from 'react';
import { getAllInvoices, markInvoicePaid, syncStripe } from '../../services/adminService';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card } from '../../components/ui/card';
import { t } from '../../lib/i18n';


const Payments = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllInvoices().then(setInvoices).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const total = invoices.reduce((sum, i) => sum + (Number(i.amount || 0)), 0);

  // Prepare chart data: group by date
  const chartData = (invoices || [])
    .filter(i => i.updatedAt && i.updatedAt.toDate)
    .map(i => ({
      date: i.updatedAt.toDate().toLocaleDateString(),
      amount: i.amount ? Number(i.amount) : 0,
      commission: i.commission ? Number(i.commission) : (i.amount ? Number((i.amount * 0.2).toFixed(2)) : 0)
    }));

  const handlePaid = async (id) => {
    await markInvoicePaid(id);
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'paid' } : i));
  };

  const handleStripeSync = async () => {
    await syncStripe();
    // Ideally refresh invoices here
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="mb-6 p-6 bg-gradient-to-r from-blue-100 to-green-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-blue-800 mb-2">{t('Total Payments')}</h2>
          <p className="text-3xl font-semibold text-blue-700">€{total.toFixed(2)}</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition" onClick={handleStripeSync}>{t('Sync Stripe')}</button>
      </Card>
      <Card className="mb-6 p-6">
        <h3 className="text-lg font-semibold mb-4">{t('Payments Trend')}</h3>
        <div className="w-full h-64" style={{ minWidth: 0, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} angle={-30} textAnchor="end" height={50} />
              <YAxis fontSize={12} />
              <Tooltip formatter={v => `€${v}`} />
              <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} name={t('Payments')} dot={false} />
              <Line type="monotone" dataKey="commission" stroke="#eab308" strokeWidth={2} name={t('Commission')} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('Payment History')}</h3>
        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">{t('Invoice')}</th>
                <th className="text-left px-4 py-2">{t('Request')}</th>
                <th className="text-left px-4 py-2">{t('Amount')}</th>
                <th className="text-left px-4 py-2">{t('Commission')}</th>
                <th className="text-left px-4 py-2">{t('Status')}</th>
                <th className="text-left px-4 py-2">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6" colSpan={6}>{t('Loading...')}</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td className="px-4 py-6" colSpan={6}>{t('No invoices found.')}</td></tr>
              ) : invoices.map(i => (
                <tr key={i.id} className="border-t">
                  <td className="px-4 py-2">{i.id}</td>
                  <td className="px-4 py-2">{i.requestId || '—'}</td>
                  <td className="px-4 py-2 text-blue-700 font-semibold">€{Number(i.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-2 text-yellow-600">€{(i.commission ?? (i.amount * 0.2))?.toFixed?.(2) ?? '-'}</td>
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
      </Card>
    </div>
  );
};

export default Payments;