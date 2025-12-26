import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProvider } from '../../contexts/ProviderContext';
import { 
  subscribeToUserConversations,
  subscribeToArchivedConversations,
  subscribeToMessages,
  subscribeToConversation,
  getOrCreateConversation,
  sendMessage,
  markMessagesAsRead,
  uploadChatAttachment,
  setTyping,
  archiveConversation
} from '../../services/messageService';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "../../components/ui/avatar";
import { getUserById } from '../../services/userService';
import { auth } from '../../firebaseConfig';
import { 
  FiSearch, FiPaperclip, FiSend, FiImage, FiFile, FiDownload, FiClock, FiCheck, FiCheckCircle, FiArchive, FiTrash2
} from 'react-icons/fi';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { t } from '../../lib/i18n';

const Messages = () => {
  const ctx = useProvider();
  const user = ctx?.user;
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const otherUserId = params.get('otherUserId');

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherNames, setOtherNames] = useState({});
  const [otherProfiles, setOtherProfiles] = useState({});
  const [text, setText] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [typingOther, setTypingOther] = useState(false);
  const [files, setFiles] = useState([]);
  const [typingTimer, setTypingTimer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to conversations
  useEffect(() => {
    let unsub = null;
    const loadConversations = async () => {
      setIsLoading(true);
      try {
        const subscribe = activeTab === 'archived' ? subscribeToArchivedConversations : subscribeToUserConversations;
        unsub = subscribe(async (list) => {
          setConversations(list);
          // Preload other participant names
          const names = {};
          const profiles = {};
          for (const c of list) {
            const otherId = (c.participants || []).find(p => p !== (auth.currentUser?.uid || user?.uid));
            if (otherId && !names[otherId]) {
              try {
                const other = await getUserById(otherId);
                const display = other?.displayName || other?.companyName || other?.email || otherId;
                names[otherId] = display;
                profiles[otherId] = { name: display, photoURL: other?.photoURL || '', companyName: other?.companyName || '' };
              } catch (_) {}
            }
          }
          setOtherNames(names);
          setOtherProfiles(profiles);
          setIsLoading(false);
        });
      } catch (e) { setIsLoading(false); /* user not authenticated yet */ }
    };
    loadConversations();
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [activeTab, user?.uid]);

  // If otherUserId provided, create or open conversation
  useEffect(() => {
    const openWithOther = async () => {
      if (!otherUserId) return;
      try {
        const conv = await getOrCreateConversation(otherUserId);
        setActiveConvId(conv.id);
        const other = await getUserById(otherUserId);
        setOtherUser(other ? { id: otherUserId, name: other.displayName || other.companyName || otherUserId, photoURL: other.photoURL || '', companyName: other.companyName || '' } : { id: otherUserId, name: otherUserId });
      } catch (e) { /* ignore */ }
    };
    openWithOther();
  }, [otherUserId]);

  // Subscribe to messages and typing state for active conversation
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    const unsubMsgs = subscribeToMessages(activeConvId, (list) => setMessages(list));
    const unsubConv = subscribeToConversation(activeConvId, (conv) => {
      try {
        const ids = (conv.participants || []).filter(Boolean);
        const selfId = auth.currentUser?.uid || user?.uid;
        const otherId = ids.find(id => id !== selfId) || ids[0];
        const isTyping = conv?.typing?.[otherId] || false;
        setTypingOther(!!isTyping);
      } catch (_) {}
    });
    return () => {
      if (typeof unsubMsgs === 'function') unsubMsgs();
      if (typeof unsubConv === 'function') unsubConv();
    };
  }, [activeConvId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!activeConvId || (!text.trim() && files.length === 0)) return;
    try {
      let attachments = [];
      if (files.length) {
        attachments = await Promise.all(files.map(f => uploadChatAttachment(f)));
      }
      await sendMessage(activeConvId, text.trim(), null, attachments);
      setText('');
      setFiles([]);
      setTyping(activeConvId, false);
    } catch (e) { console.error(e); }
  };

  const handleTyping = (val) => {
    setText(val);
    if (!activeConvId) return;
    try { setTyping(activeConvId, true); } catch (_) {}
    if (typingTimer) clearTimeout(typingTimer);
    const t = setTimeout(() => { try { setTyping(activeConvId, false); } catch (_) {} }, 1000);
    setTypingTimer(t);
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleArchiveConversation = async (convId) => {
    try { if (convId) await archiveConversation(convId); } catch (e) { console.error(e); }
  };

  const openConversation = async (convId) => {
    setActiveConvId(convId);
    // mark last 20 messages as read
    const ids = messages.slice(-20).map(m => m.id);
    try { if (ids.length) await markMessagesAsRead(convId, ids); } catch (_) {}
    try {
      const conv = conversations.find(c => c.id === convId);
      if (conv) {
        const ids = (conv.participants || []).filter(Boolean);
        const selfId = auth.currentUser?.uid || user?.uid;
        const otherId = ids.find(id => id !== selfId) || ids[0];
        if (otherId) {
          const other = await getUserById(otherId);
          setOtherUser(other ? { id: otherId, name: other.displayName || other.companyName || otherId, photoURL: other.photoURL || '', companyName: other.companyName || '' } : { id: otherId, name: otherId });
        }
      }
    } catch (_) {}
  };

  // Timestamp formatters
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return t('Yesterday');
    if (isThisWeek(date)) return format(date, 'EEE');
    return format(date, 'MMM dd');
  };

  const formatConversationTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return t('Yesterday');
    return format(date, 'MMM dd');
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const ids = (conv.participants || []).filter(Boolean);
    const selfId = auth.currentUser?.uid || user?.uid;
    const otherId = ids.find((id) => id !== selfId) || ids[0];
    const otherName = otherNames[otherId] || '';
    return otherName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('Messages')}</h2>
          <p className="text-gray-600">{t('Chat with order givers about requests and quotes')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations Sidebar */}
        <Card className="md:col-span-1 flex flex-col">
          <CardHeader className="pb-4 border-b space-y-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t('Search conversations...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant={activeTab === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('active')}>{t('Active')}</Button>
              <Button variant={activeTab === 'archived' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('archived')}>{t('Archived')}</Button>
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">{t('Loading conversations...')}</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-400 mb-2">{t('No conversations')}</div>
                  <div className="text-sm text-gray-500">{t('Start a conversation with an order giver')}</div>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const ids = (c.participants || []).filter(Boolean);
                  const selfId = auth.currentUser?.uid || user?.uid;
                  const otherId = ids.find(id => id !== selfId) || ids[0];
                  const profile = otherProfiles[otherId];
                  const unreadCount = Number(c?.unreadCount?.[selfId] || 0);

                  return (
                    <button
                      key={c.id}
                      onClick={() => openConversation(c.id)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        activeConvId === c.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage src={profile?.photoURL} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-sm">
                            {String(profile?.name || '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <div className="font-semibold text-gray-900 truncate text-sm">
                              {profile?.name || t('Unknown User')}
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {unreadCount > 0 && (
                                <span className="inline-block h-5 px-1.5 text-xs min-w-[20px] rounded-full bg-blue-600 text-white text-center">{unreadCount}</span>
                              )}
                              <div className="text-xs text-gray-400 whitespace-nowrap">
                                {formatConversationTime(c.lastMessageAt)}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 truncate mb-1">
                            {c.lastMessage?.text || t('No messages yet')}
                          </div>
                          {profile?.companyName && (
                            <div className="text-xs text-gray-500 truncate">
                              {profile.companyName}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Message Thread */}
        <Card className="md:col-span-2 flex flex-col">
          <CardHeader className="pb-4 border-b">
            {otherUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={otherUser.photoURL} />
                    <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white">
                      {String(otherUser.name || '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {otherUser.name}
                      {typingOther && (
                                      <span className="text-xs px-2 py-1 border rounded">{t('En train d\'écrire...')}</span>
                      )}
                    </CardTitle>
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      {otherUser.companyName && (
                        <>
                          <span>{otherUser.companyName}</span>
                          <span>•</span>
                        </>
                      )}
                      <span className="capitalize">{otherUser.role}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleArchiveConversation(activeConvId)}>
                    <FiArchive className="h-4 w-4 mr-1" />
                    {t('Archive')}
                  </Button>
                </div>
              </div>
            ) : (
              <CardTitle>{t('Sélectionnez une conversation')}</CardTitle>
            )}
          </CardHeader>

          <CardContent className="flex-1 p-0 flex flex-col">
            {activeConvId ? (
              <>
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <div className="text-lg font-semibold mb-2">{t('Aucun message pour le moment')}</div>
                        <div className="text-sm">{t('Commencez la conversation en envoyant un message')}</div>
                      </div>
                    ) : (
                      messages.map((message, index) => {
                        const isOwn = message.senderId === (auth.currentUser?.uid || user?.uid);
                        const showAvatar = index === 0 || messages[index - 1]?.senderId !== message.senderId;
                        const nextCreated = messages[index + 1]?.createdAt;
                        const nextTime = nextCreated?.toDate ? nextCreated.toDate() : (nextCreated ? new Date(nextCreated) : null);
                        const thisTime = message.createdAt?.toDate ? message.createdAt.toDate() : new Date(message.createdAt);
                        const showTime = index === messages.length - 1 || messages[index + 1]?.senderId !== message.senderId || (nextTime && thisTime && (nextTime - thisTime) > 300000);

                        return (
                          <div key={message.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} ${showAvatar ? 'mb-4' : 'mb-1'}`}>
                            {showAvatar && !isOwn && (
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src={otherUser?.photoURL} />
                                <AvatarFallback className="text-xs">
                                  {String(otherUser?.name || '?').charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}

                            <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                              <div className={`relative px-4 py-2 rounded-2xl ${isOwn ? 'bg-blue-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'}`}>
                                <div className="text-sm whitespace-pre-wrap break-words">{message.text}</div>

                                {/* Attachments */}
                                {message.attachments?.length > 0 && (
                                  <div className="mt-2 space-y-2">
                                    {message.attachments.map((attachment, i) => (
                                      <div key={i} className="flex items-center gap-2 p-2 bg-black/10 rounded">
                                        {attachment.type?.startsWith('image/') ? (
                                          <div className="relative">
                                            <img src={attachment.url} alt={attachment.name} className="max-w-[200px] rounded-lg cursor-pointer" onClick={() => window.open(attachment.url, '_blank')} />
                                            <FiImage className="absolute top-2 right-2 text-white bg-black/50 rounded p-1" size={16} />
                                          </div>
                                        ) : (
                                          <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:underline">
                                            <FiFile className="flex-shrink-0" />
                                            <span className="truncate max-w-[150px]">{attachment.name}</span>
                                            <FiDownload size={14} />
                                          </a>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Message status and time */}
                                {showTime && (
                                  <div className={`flex items-center gap-1 mt-1 text-xs ${isOwn ? 'text-blue-100 justify-end' : 'text-gray-500'}`}>
                                    <FiClock className="h-3 w-3" />
                                    {formatMessageTime(message.createdAt)}
                                    {isOwn && (
                                      Array.isArray(message.readBy) && otherUser?.id && message.readBy.includes(otherUser.id) ? (
                                        <span className="flex items-center gap-1 text-xs text-blue-100">
                                          <FiCheckCircle className="h-3 w-3" />
                                          {t('Seen')}
                                        </span>
                                      ) : (
                                        <FiCheck className="h-3 w-3" />
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {showAvatar && isOwn && (
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src={auth.currentUser?.photoURL} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs">
                                  {String(auth.currentUser?.displayName || auth.currentUser?.email || '?').charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="border-t p-4 bg-gray-50">
                  {/* File preview */}
                  {files.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border text-sm">
                          <FiFile className="text-gray-400" />
                          <span className="max-w-[120px] truncate">{file.name}</span>
                          <button type="button" onClick={() => removeFile(index)} className="text-gray-400 hover:text-red-500">
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSend} className="flex gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <FiPaperclip className="h-4 w-4" />
                    </Button>
                    <Input placeholder={t('Type your message...')} value={text} onChange={(e) => handleTyping(e.target.value)} className="flex-1" />
                    <Button type="submit" disabled={!text.trim() && files.length === 0} className="bg-blue-600 hover:bg-blue-700">
                      <FiSend className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-lg font-semibold mb-2">{t('Aucune conversation sélectionnée')}</div>
                  <div className="text-sm">{t('Choisissez une conversation dans la liste pour commencer à discuter')}</div>
                                    <Input placeholder={t('Tapez votre message…')} value={text} onChange={(e) => handleTyping(e.target.value)} className="flex-1" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Messages;