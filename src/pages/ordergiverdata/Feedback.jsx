import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { submitFeedback, getMyFeedback } from '../../services/feedbackService';

const Feedback = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [list, setList] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try { const items = await getMyFeedback(); setList(items); } catch (_) {}
  };

  const onSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!subject.trim() || !message.trim()) { setError('Please provide subject and message'); return; }
    setSubmitting(true);
    try {
      await submitFeedback({ subject, message, rating: Number(rating), role: 'order_giver' });
      setSubject(''); setMessage(''); setRating(5); setSuccess('Feedback submitted. Thank you!');
      await load();
    } catch (e) { setError(e?.message || 'Failed to submit feedback'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-content">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Feedback</h2>
          <p className="text-gray-600 mt-1">Share your experience with the platform or specific interactions.</p>
        </div>
      </div>

      <Card className="card">
        <CardHeader className="card-header">
          <CardTitle>Submit Feedback</CardTitle>
        </CardHeader>
        <CardContent className="card-content">
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <div className="text-red-700 text-sm">{error}</div>}
            {success && <div className="text-green-700 text-sm">{success}</div>}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="E.g., Quote negotiation UX" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Rating</label>
              <select className="border rounded-md px-3 py-2 text-sm" value={rating} onChange={(e) => setRating(e.target.value)}>
                {[5,4,3,2,1].map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Message</label>
              <textarea className="w-full border rounded-md px-3 py-2 text-sm min-h-[120px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your feedback or suggestions..." />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={submitting} className="btn-primary">Submit</Button>
              {submitting && <span className="text-sm text-gray-500">Submitting...</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="card">
        <CardHeader className="card-header">
          <CardTitle>Your Feedback</CardTitle>
        </CardHeader>
        <CardContent className="card-content">
          {list.length === 0 ? (
            <div className="text-gray-500 text-sm">You have not submitted any feedback yet.</div>
          ) : (
            <ul className="space-y-3">
              {list.map((f) => (
                <li key={f.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">{f.subject}</div>
                    <div className="text-xs text-gray-500">Rating: {f.rating ?? '—'}</div>
                  </div>
                  <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{f.message}</div>
                  <div className="text-xs text-gray-500 mt-1">Status: {f.status || 'new'}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Feedback;