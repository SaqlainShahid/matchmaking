import React from 'react';
import { useProvider } from '../../contexts/ProviderContext';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { t } from '../../lib/i18n';

const Invoices = () => {
  const ctx = useProvider();
  const invoices = ctx?.invoices || [];
  const setInvoicePaid = ctx?.setInvoicePaid || (async () => {});
  const createInvoice = ctx?.createInvoice || (async () => {});

  const total = invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

  const handleDownload = (inv) => {
    if (!inv?.invoiceUrl) return;
    try {
      const link = document.createElement('a');
      link.href = inv.invoiceUrl;
      link.target = '_blank';
      // Hint filename for browsers that support it
      link.download = `invoice_${inv.id}.pdf`;
      // Append to DOM before clicking so browsers honour the download filename
      document.body.appendChild(link);
      // Click then remove safely — don't assume parentNode is document.body (can be removed by navigation)
      link.click();
      // Defensive removal: only remove if still attached
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      } else if (typeof link.remove === 'function') {
        // As a last resort, try element.remove() which is safe if not attached
        try { link.remove(); } catch (_) {}
      }
    } catch (_) {
      // Fallback: open in new tab
      window.open(inv.invoiceUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('Invoices')}</h2>
        <p className="text-gray-600 mt-2">{t('Generate and download invoices')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">{t('Total Earnings')}</p>
          <p className="text-2xl font-semibold">${total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">{t('Invoices Count')}</p>
          <p className="text-2xl font-semibold">{invoices.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">{t('Last Invoice')}</p>
          <p className="text-2xl font-semibold">{invoices[0]?.date?.toLocaleDateString?.() || '—'}</p>
        </Card>
      </div>

      <Card className="border border-gray-200 rounded-lg shadow-sm">
        <CardHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="text-lg font-semibold text-gray-900">{t('Invoice List')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {invoices.length === 0 ? (
              <div className="p-6 text-center text-gray-500">{t('No invoices yet')}</div>
            ) : (
              invoices.map((inv) => (
                <div key={inv.id} className="p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{t('Project')} : {inv.projectId}</p>
                    <p className="text-sm text-gray-500">{t('Amount')}: ${inv.amount} • {t('Date')}: {inv.date?.toLocaleDateString?.() || ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={!inv.invoiceUrl} onClick={() => handleDownload(inv)}>{t('Download')}</Button>
                    <Button variant="outline" disabled={!inv.invoiceUrl}>{t('Send Email')}</Button>
                    {inv.status !== 'paid' && (
                      <Button onClick={() => setInvoicePaid(inv.id)}>{t('Mark Paid')}</Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;