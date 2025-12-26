import React, { useEffect, useState, useRef } from 'react';
import { Modal } from './ui/modal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { uploadChatAttachment, getOrCreateConversation, subscribeToMessages, sendMessage, setTyping, uploadChatAttachment as uploadAttachment } from '../services/messageService';
import { isImageUrl, thumbnailUrl } from '../services/cloudinaryService';
import { t } from '../lib/i18n';

export default function ChatModal({ open, onClose, otherUserId, otherUserName, requestId }) {
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    let unsub = null;

    (async () => {
      setLoading(true);
      try {
        const conv = await getOrCreateConversation(otherUserId);
        setConversationId(conv.id);
        unsub = subscribeToMessages(conv.id, (list) => {
          setMessages(list || []);
          // scroll to bottom
          setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 100);
        });
      } catch (err) {
        console.error('Failed to init conversation', err);
      } finally {
        setLoading(false);
      }
    })();

    return () => { if (typeof unsub === 'function') unsub(); };
  }, [open, otherUserId]);

  const handleSend = async (e) => {
    e?.preventDefault?.();
    if (!text && attachments.length === 0) return;
    if (!conversationId) return;
    setSending(true);
    try {
      // Ensure attachments are uploaded metadata objects
      const uploaded = [];
      for (const f of attachments) {
        if (f.url) { uploaded.push(f); continue; }
        const meta = await uploadAttachment(f.file || f);
        uploaded.push(meta);
      }
      await sendMessage(conversationId, text || '', requestId || null, uploaded);
      setText('');
      setAttachments([]);
    } catch (err) {
      console.error('Send failed', err);
      alert(t('Failed to send message'));
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const mapped = files.map(f => ({ file: f, name: f.name, size: f.size, type: f.type }));
    setAttachments(prev => [...prev, ...mapped]);
    e.target.value = '';
  };

  const removeAttachment = (idx) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  return (
    <Modal open={open} onClose={onClose} title={otherUserName ? `${t('Message')} ${otherUserName}` : t('Message')} footer={(
      <>
        <Button variant="outline" onClick={onClose}>{t('Close')}</Button>
        <Button onClick={handleSend} disabled={sending || (!text && attachments.length === 0)}>{sending ? t('Sending...') : t('Send')}</Button>
      </>
    )}>
      <div className="flex flex-col space-y-4">
        <div ref={listRef} className="max-h-72 overflow-y-auto space-y-3 p-2 border rounded-md bg-white">
          {loading ? (
            <p className="text-sm text-gray-500">{t('Loading messages...')}</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-500">{t('No messages yet. Start the conversation')}</p>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`flex ${m.senderId === otherUserId ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[70%] p-3 rounded-lg ${m.senderId === otherUserId ? 'bg-gray-100 text-gray-900' : 'bg-blue-600 text-white'}`}>
                  {m.text && <div className="whitespace-pre-wrap">{m.text}</div>}
                  {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {m.attachments.map((a, i) => (
                        <a key={i} href={a.url} target="_blank" rel="noreferrer" className="block border rounded overflow-hidden">
                          {isImageUrl(a.url) ? (
                            <img src={thumbnailUrl(a.url, { width: 240, height: 160 })} alt={a.name} className="w-full h-28 object-cover" />
                          ) : (
                            <div className="p-2 text-sm text-gray-700">{a.name}</div>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSend} className="space-y-2">
          <div className="flex items-center space-x-2">
            <Input placeholder={t('Write a message...')} value={text} onChange={(e) => { setText(e.target.value); setTyping(conversationId, Boolean(e.target.value)); }} />
            <input ref={fileRef} type="file" className="hidden" multiple onChange={handleFileChange} />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>{t('Attach')}</Button>
            <Button type="submit" disabled={sending || (!text && attachments.length === 0)}>{sending ? t('Sending...') : t('Send')}</Button>
          </div>
          {attachments.length > 0 && (
            <div className="flex gap-2">
              {attachments.map((a, i) => (
                <div key={i} className="p-2 border rounded flex items-center gap-2">
                  <div className="text-sm text-gray-700">{a.name}</div>
                  <button type="button" onClick={() => removeAttachment(i)} className="text-red-600">✕</button>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
}