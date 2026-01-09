import React, { useEffect, useState } from 'react';
import { getAllInvoices } from '../../services/adminService';
import { Card } from '../../components/ui/card';
import { t } from '../../lib/i18n';

const Revenue = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllInvoices().then(setInvoices).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const commissions = invoices?.map(i => i.commission ?? (i.amount * 0.2));
  const totalRevenue = commissions?.reduce((sum, c) => sum + (c ?? 0), 0).toFixed(2);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="mb-6 p-6 bg-gradient-to-r from-yellow-100 to-blue-100">
        <h2 className="text-2xl font-bold text-yellow-800 mb-2">{t('Total Revenue')}</h2>
        <p className="text-3xl font-semibold text-yellow-700">€{totalRevenue}</p>
      </Card>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('Revenue History')}</h3>
        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2">{t('Date')}</th>
                <th className="text-left py-2">{t('Client')}</th>
                <th className="text-left py-2">{t('Provider')}</th>
                <th className="text-left py-2">{t('Commission')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6" colSpan={4}>{t('Loading...')}</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td className="px-4 py-6" colSpan={4}>{t('No revenue found.')}</td></tr>
              ) : invoices.map(i => (
                <tr key={i.id} className="border-t">
                  <td className="py-2">{i.updatedAt?.toDate?.().toLocaleDateString?.() ?? '-'}</td>
                  <td className="py-2">{i.clientId ?? '-'}</td>
                  <td className="py-2">{i.providerName ?? '-'}</td>
                  <td className="py-2 text-yellow-700 font-semibold">€{(i.commission ?? (i.amount * 0.2))?.toFixed?.(2) ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
export default Revenue;
