import React, { useEffect, useState } from 'react';
import { getAllQuotes, setQuoteStatus } from '../../services/adminService';
import { getInvoicesForRequest } from '../../services/ordergiverservices/invoiceService';
import { t } from '../../lib/i18n';
import { Badge } from '../../components/ui/badge';

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getAllQuotes().then(async (allQuotes) => {
      // For each quote, fetch invoice for its requestId
      const quotesWithInvoices = await Promise.all(
        allQuotes.map(async (q) => {
          const invoices = await getInvoicesForRequest(q.requestId);
          return { ...q, invoice: invoices[0] || null };
        })
      );
      setQuotes(quotesWithInvoices);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = quotes.filter(q => filter === 'all' ? true : q.status === filter);

  const handleStatus = async (id, status) => {
    await setQuoteStatus(id, status);
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900">{t('Quotes')}</h3>
        <select className="border rounded-md px-3 py-2 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">{t('All')}</option>
          <option value="submitted">{t('Submitted')}</option>
          <option value="approved">{t('Approved')}</option>
          <option value="rejected">{t('Rejected')}</option>
          <option value="accepted">{t('Accepted')}</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">{t('Request')}</th>
              <th className="text-left px-4 py-2">{t('Provider')}</th>
              <th className="text-left px-4 py-2">{t('Amount')}</th>
              <th className="text-left px-4 py-2">{t('Status')}</th>
              <th className="text-left px-4 py-2">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={5}>{t('Loading...')}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={5}>{t('No quotes found')}</td></tr>
            ) : filtered.map(q => (
              <tr key={q.id} className="border-t">
                <td className="px-4 py-2">{q.requestId}</td>
                <td className="px-4 py-2">{q.providerId}</td>
                <td className="px-4 py-2">{Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(q.amount || 0))}</td>
                <td className="px-4 py-2">
                  {q.status || 'submitted'}
                  {q.invoice && (
                    <div className="flex flex-col gap-1 mt-1">
                      <Badge className={
                        q.invoice.status === 'paid'
                          ? 'bg-blue-100 text-blue-800 border-blue-200 ml-1'
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200 ml-1'
                      }>
                        {t('Invoice')}: {q.invoice.status === 'paid' ? t('Paid') : t('Pending Payment')}
                      </Badge>
                      <span className="text-xs text-gray-700">
                        {t('Client paid')}: €{q.invoice.clientAmount?.toFixed(2) ?? '-'} | {t('Provider receives')}: €{q.invoice.providerAmount?.toFixed(2) ?? '-'} | {t('Commission')}: €{q.invoice.commission?.toFixed(2) ?? '-'}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">
                  <select className="border rounded-md px-2 py-1" defaultValue={q.status} onChange={e => handleStatus(q.id, e.target.value)}>
                    <option value="submitted">{t('Submitted')}</option>
                    <option value="approved">{t('Approved')}</option>
                    <option value="rejected">{t('Rejected')}</option>
                    <option value="accepted">{t('Accepted')}</option>
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