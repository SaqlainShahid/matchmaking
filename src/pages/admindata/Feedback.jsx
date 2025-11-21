import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { getAllFeedback, setFeedbackStatus, addAdminNote } from '../../services/feedbackService';
import { t } from '../../lib/i18n';

const AdminFeedback = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState(''); // '', 'order_giver', 'service_provider'
  const [status, setStatus] = useState(''); // '', 'new', 'reviewed', 'resolved', 'dismissed'
  const [rating, setRating] = useState(''); // '', '1'...'5'
  const [noteById, setNoteById] = useState({});

  const load = async () => {
    setLoading(true); setError('');
    try {
      const filters = {};
      if (role) filters.role = role;
      if (status) filters.status = status;
      if (rating) filters.rating = Number(rating);
      const data = await getAllFeedback(filters);
      setItems(data || []);
    } catch (e) { setError(e?.message || 'Failed to load feedback'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [role, status, rating]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((i) => (
      (i.subject || '').toLowerCase().includes(q) ||
      (i.message || '').toLowerCase().includes(q) ||
      (i.userId || '').toLowerCase().includes(q)
    ));
  }, [items, query]);

  const updateStatus = async (id, next) => {
    try { await setFeedbackStatus(id, next); await load(); } catch (e) { /* noop */ }
  };

  const addNote = async (id) => {
    const note = noteById[id];
    if (!note?.trim()) return;
    try { await addAdminNote(id, note.trim()); setNoteById((p) => ({ ...p, [id]: '' })); await load(); } catch (e) { /* noop */ }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-content">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('Feedback Management')}</h2>
          <p className="text-gray-600 mt-1">{t('Review, triage, and resolve feedback from order givers and providers.')}</p>
        </div>
      </div>

      <Card className="card">
        <CardHeader className="card-header">
          <CardTitle>{t('Filters')}</CardTitle>
        </CardHeader>
        <CardContent className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('Search')}</label>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Subject, message, or userId')} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('Role')}</label>
              <select className="border rounded-md px-3 py-2 text-sm w-full" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">{t('All')}</option>
                <option value="order_giver">{t('Order Giver')}</option>
                <option value="service_provider">{t('Service Provider')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('Status')}</label>
              <select className="border rounded-md px-3 py-2 text-sm w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">{t('All')}</option>
                <option value="new">{t('New')}</option>
                <option value="reviewed">{t('Reviewed')}</option>
                <option value="resolved">{t('Resolved')}</option>
                <option value="dismissed">{t('Dismissed')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('Rating')}</label>
              <select className="border rounded-md px-3 py-2 text-sm w-full" value={rating} onChange={(e) => setRating(e.target.value)}>
                <option value="">{t('All')}</option>
                {[5,4,3,2,1].map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card">
        <CardHeader className="card-header">
          <CardTitle>{t('Feedback Items')}</CardTitle>
        </CardHeader>
        <CardContent className="card-content">
          {error && <div className="text-red-700 text-sm mb-2">{error}</div>}
          {loading ? (
            <div className="text-sm text-gray-500">{t('Loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-gray-500">{t('No feedback found.')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-700">
                    <th className="p-2">{t('Subject')}</th>
                    <th className="p-2">{t('Message')}</th>
                    <th className="p-2">{t('User')}</th>
                    <th className="p-2">{t('Role')}</th>
                    <th className="p-2">{t('Rating')}</th>
                    <th className="p-2">{t('Status')}</th>
                    <th className="p-2">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.id} className="border-t">
                      <td className="p-2 align-top font-medium text-gray-900">{f.subject}</td>
                      <td className="p-2 align-top text-gray-700 whitespace-pre-wrap">{f.message}</td>
                      <td className="p-2 align-top text-gray-600">{f.userId}</td>
                      <td className="p-2 align-top">{f.role || '—'}</td>
                      <td className="p-2 align-top">{f.rating ?? '—'}</td>
                      <td className="p-2 align-top">{f.status || 'new'}</td>
                      <td className="p-2 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" className="btn-secondary" onClick={() => updateStatus(f.id, 'reviewed')}>{t('Review')}</Button>
                          <Button size="sm" className="btn-success" onClick={() => updateStatus(f.id, 'resolved')}>{t('Resolve')}</Button>
                          <Button size="sm" className="btn-danger" onClick={() => updateStatus(f.id, 'dismissed')}>{t('Dismiss')}</Button>
                        </div>
                        <div className="mt-2">
                          <label className="block text-xs text-gray-600 mb-1">{t('Add admin note')}</label>
                          <div className="flex gap-2">
                            <Input value={noteById[f.id] || ''} onChange={(e) => setNoteById((p) => ({ ...p, [f.id]: e.target.value }))} placeholder={t('Internal note')} />
                            <Button size="sm" onClick={() => addNote(f.id)}>{t('Add')}</Button>
                          </div>
                          {Array.isArray(f.adminNotes) && f.adminNotes.length > 0 && (
                            <ul className="mt-2 space-y-1">{f.adminNotes.map((n, idx) => (<li key={idx} className="text-xs text-gray-600">• {n.note}</li>))}</ul>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFeedback;