import React, { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { getAllUsers } from '../../services/adminService';
import { getOrCreateConversation, subscribeToMessages, sendMessage, setTyping } from '../../services/messageService';
import { t } from '../../lib/i18n';

const AdminMessages = () => {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const unsubRef = useRef(null);

  useEffect(() => {
    const loadUsers = async () => {
      try { const list = await getAllUsers(); setUsers(Array.isArray(list) ? list : []); } catch (e) { console.error(e); }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    const setupConversation = async () => {
      if (!selectedUser) return;
      try {
        const convo = await getOrCreateConversation(selectedUser.id);
        const id = convo?.id || convo?.conversationId || convo;
        setConversationId(id);
      } catch (e) { console.error(e); }
    };
    setupConversation();
  }, [selectedUser]);

  useEffect(() => {
    if (!conversationId) return;
    if (unsubRef.current) { try { unsubRef.current(); } catch (e) { console.error(e); } }
    unsubRef.current = subscribeToMessages(conversationId, (list) => {
      setMessages(Array.isArray(list) ? list : []);
    });
    return () => { if (unsubRef.current) { try { unsubRef.current(); } catch (e) { console.error(e); } } };
  }, [conversationId]);

  const onSend = async () => {
    if (!conversationId || !text.trim()) return;
    setSending(true);
    try { await sendMessage(conversationId, text.trim()); setText(''); } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const filteredUsers = users.filter((u) => {
    const q = query.toLowerCase();
    return !q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.id || '').toLowerCase().includes(q);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-4">
        <Card className="card">
          <CardHeader className="card-header">
            <CardTitle>{t('Utilisateurs')}</CardTitle>
          </CardHeader>
          <CardContent className="card-content space-y-3">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Rechercher des utilisateurs par nom ou e-mail')} />
            <ScrollArea className="h-[420px]">
              <ul className="space-y-2">
                {filteredUsers.map((u) => (
                  <li key={u.id}>
                    <button
                      className={`w-full flex items-center gap-3 p-2 rounded-md border ${selectedUser?.id===u.id?'bg-gray-100':''}`}
                      onClick={() => setSelectedUser(u)}
                    >
                      <Avatar className="h-8 w-8"><AvatarFallback>{(u.name||u.email||'U')[0].toUpperCase()}</AvatarFallback></Avatar>
                      <div className="text-left">
                        <div className="text-sm font-medium text-gray-900">{u.name || u.email || u.id}</div>
                        <div className="text-xs text-gray-500">{u.role || t('Utilisateur')}</div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2 space-y-4">
        <Card className="card">
          <CardHeader className="card-header">
            <CardTitle>{t('Conversation')}</CardTitle>
          </CardHeader>
          <CardContent className="card-content">
            {!selectedUser ? (
              <div className="text-sm text-gray-500">{t('Sélectionnez un utilisateur pour démarrer une conversation.')}</div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9"><AvatarFallback>{(selectedUser.name||selectedUser.email||'U')[0].toUpperCase()}</AvatarFallback></Avatar>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{selectedUser.name || selectedUser.email || selectedUser.id}</div>
                        <div className="text-xs text-gray-500">{selectedUser.role || t('User')}</div>
                  </div>
                </div>
                <div className="border rounded-lg">
                  <ScrollArea className="h-[360px] p-3">
                    <div className="space-y-2">
                      {messages.length === 0 ? (
                        <div className="text-sm text-gray-500">{t('Aucun message pour le moment')}</div>
                      ) : messages.map((m) => (
                        <div key={m.id || m.createdAt} className={`max-w-[70%] p-2 rounded-md ${m.senderId===selectedUser.id?'bg-gray-100':'bg-blue-50 ml-auto'}`}>
                          <div className="text-sm text-gray-800 whitespace-pre-wrap">
                            {typeof m.text === 'string' ? m.text : (m.text && m.text.text ? m.text.text : '')}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1">{new Date(m.createdAt || Date.now()).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="p-3 border-t flex items-center gap-2">
                    <Input
                      value={text}
                      onChange={(e) => { setText(e.target.value); try { setTyping(conversationId, true); } catch (e) { console.error(e); } }}
                      placeholder={t('Tapez votre message…')}
                    />
                    <Button onClick={onSend} disabled={sending || !text.trim()} className="btn-primary">{t('Envoyer')}</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminMessages;