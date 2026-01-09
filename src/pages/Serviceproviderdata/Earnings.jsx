import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useProvider } from '../../contexts/ProviderContext';
import { Card } from '../../components/ui/card';
import { t } from '../../lib/i18n';

const Earnings = () => {
  const { invoices, stats } = useProvider();
  // Prepare chart data: group by month or show by date
  const chartData = (invoices || [])
    .filter(inv => inv.date?.toDate)
    .map(inv => ({
      date: inv.date.toDate().toLocaleDateString(),
      amount: inv.providerAmount?.toFixed?.(2) ? Number(inv.providerAmount.toFixed(2)) : 0,
      commission: inv.commission?.toFixed?.(2) ? Number(inv.commission.toFixed(2)) : 0
    }));
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="mb-6 p-6 bg-gradient-to-r from-green-100 to-blue-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">{t('Total Earnings')}</h2>
          <p className="text-3xl font-semibold text-green-700">€{stats.earnings?.toFixed(2) ?? '0.00'}</p>
        </div>
        <button className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition" onClick={() => alert('Withdraw functionality coming soon!')}>{t('Withdraw')}</button>
      </Card>
      <Card className="mb-6 p-6">
        <h3 className="text-lg font-semibold mb-4">{t('Earnings Trend')}</h3>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} angle={-30} textAnchor="end" height={50} />
              <YAxis fontSize={12} />
              <Tooltip formatter={v => `€${v}`} />
              <Line type="monotone" dataKey="amount" stroke="#16a34a" strokeWidth={2} name={t('Earnings')} dot={false} />
              <Line type="monotone" dataKey="commission" stroke="#eab308" strokeWidth={2} name={t('Commission')} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('Earnings History')}</h3>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2">{t('Date')}</th>
              <th className="text-left py-2">{t('Client')}</th>
              <th className="text-left py-2">{t('Amount')}</th>
              <th className="text-left py-2">{t('Commission')}</th>
            </tr>
          </thead>
          <tbody>
            {invoices?.map(inv => (
              <tr key={inv.id} className="border-t">
                <td className="py-2">{inv.date?.toDate?.().toLocaleDateString?.() ?? '-'}</td>
                <td className="py-2">{inv.orderGiverId ?? '-'}</td>
                <td className="py-2 text-green-700 font-semibold">€{inv.providerAmount?.toFixed?.(2) ?? '-'}</td>
                <td className="py-2 text-yellow-600">€{inv.commission?.toFixed?.(2) ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
export default Earnings;
