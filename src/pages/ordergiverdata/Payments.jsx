import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useOrderGiver } from '../../contexts/OrderGiverContext';
import { Card } from '../../components/ui/card';
import { t } from '../../lib/i18n';

const Payments = () => {
  const { quotes, user } = useOrderGiver();
  const paidQuotes = quotes?.filter(q => q.status === 'accepted');
  // Prepare chart data: show by date
  const chartData = (paidQuotes || [])
    .filter(q => q.updatedAt?.toDate)
    .map(q => ({
      date: q.updatedAt.toDate().toLocaleDateString(),
      amount: q.amount?.toFixed?.(2) ? Number(q.amount.toFixed(2)) : 0,
      commission: q.commission?.toFixed?.(2)
        ? Number(q.commission.toFixed(2))
        : (q.amount ? Number((q.amount * 0.2).toFixed(2)) : 0)
    }));
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="mb-6 p-6 bg-gradient-to-r from-blue-100 to-green-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-blue-800 mb-2">{t('Total Payments')}</h2>
          <p className="text-3xl font-semibold text-blue-700">€{paidQuotes?.reduce((sum, q) => sum + (q.amount ?? 0), 0).toFixed(2)}</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition" onClick={() => alert('Withdraw functionality coming soon!')}>{t('Withdraw')}</button>
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
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2">{t('Date')}</th>
              <th className="text-left py-2">{t('Provider')}</th>
              <th className="text-left py-2">{t('Amount')}</th>
              <th className="text-left py-2">{t('Commission')}</th>
            </tr>
          </thead>
          <tbody>
            {paidQuotes?.map(q => (
              <tr key={q.id} className="border-t">
                <td className="py-2">{q.updatedAt?.toDate?.().toLocaleDateString?.() ?? '-'}</td>
                <td className="py-2">{q.providerName ?? '-'}</td>
                <td className="py-2 text-blue-700 font-semibold">€{q.amount?.toFixed?.(2) ?? '-'}</td>
                <td className="py-2 text-yellow-600">€{(q.commission ?? (q.amount * 0.2))?.toFixed?.(2) ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
export default Payments;
