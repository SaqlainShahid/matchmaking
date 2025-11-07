import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
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
  deleteMessage,
  archiveConversation
} from '../../services/messageService';
import { getUserById } from '../../services/userService';
import { auth } from '../../firebaseConfig';
import { 
  FiSearch, 
  FiPaperclip, 
  FiSend, 
  FiMoreVertical,
  FiImage,
  FiFile,
  FiDownload,
  FiArchive,
  FiTrash2,
  FiClock,
  FiCheck,
  FiCheckCircle
} from 'react-icons/fi';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';

const Messages = () => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const requestId = params.get('requestId');
  const providerId = params.get('providerId');

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [otherNames, setOtherNames] = useState({});
  const [otherProfiles, setOtherProfiles] = useState({});
  const [otherUser, setOtherUser] = useState(null);
  const [typingOther, setTypingOther] = useState(false);
  const [files, setFiles] = useState([]);
  const [typingTimer, setTypingTimer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const ids = (conv.participants || []).filter(Boolean);
    const selfId = auth.currentUser?.uid;
    const otherId = ids.find(id => id !== selfId) || ids[0];
    const otherName = otherNames[otherId] || '';
    return otherName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Enhanced conversation subscription with error handling (supports Active/Archived tabs)
  useEffect(() => {
    let unsub = null;
    const loadConversations = async () => {
      setIsLoading(true);
      try {
        const subscribe = activeTab === 'archived' ? subscribeToArchivedConversations : subscribeToUserConversations;
        unsub = subscribe(async (list) => {
          setConversations(list);
          
          // Preload participant profiles
          const names = {};
          const profiles = {};
          const selfId = auth.currentUser?.uid;
          
          await Promise.all(
            list.map(async (c) => {
              const ids = (c.participants || []).filter(Boolean);
              const otherId = ids.find(id => id !== selfId) || ids[0];
              if (otherId && !names[otherId]) {
                try {
                  const other = await getUserById(otherId);
                  const display = other?.displayName || other?.companyName || 'Unknown User';
                  names[otherId] = display;
                  profiles[otherId] = { 
                    name: display, 
                    photoURL: other?.photoURL || '', 
                    companyName: other?.companyName || '',
                    role: other?.role || 'user'
                  };
                } catch (error) {
                  console.warn('Failed to load user:', otherId, error);
                  names[otherId] = 'Unknown User';
                  profiles[otherId] = { name: 'Unknown User', photoURL: '', companyName: '' };
                }
              }
            })
          );
          
          setOtherNames(names);
          setOtherProfiles(profiles);
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Error subscribing to conversations:', error);
        setIsLoading(false);
      }
    };

    loadConversations();
    
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [activeTab]);

  // Auto-open conversation when providerId is provided
  useEffect(() => {
    const openWithProvider = async () => {
      if (!providerId) return;
      try {
        const conv = await getOrCreateConversation(providerId);
        setActiveConvId(conv.id);
      } catch (error) {
        console.error('Error opening conversation:', error);
      }
    };
    openWithProvider();
  }, [providerId]);

  // Enhanced message subscription with typing indicators
  useEffect(() => {
    if (!activeConvId) { 
      setMessages([]); 
      return; 
    }

    const unsubMessages = subscribeToMessages(activeConvId, (list) => {
      setMessages(list);
      // Mark messages as read when they become visible
      const unreadIds = list
        .filter(m => m.senderId !== auth.currentUser?.uid && !m.read)
        .map(m => m.id);
      if (unreadIds.length > 0) {
        markMessagesAsRead(activeConvId, unreadIds).catch(console.error);
      }
    });

    const unsubConversation = subscribeToConversation(activeConvId, (conv) => {
      try {
        const ids = (conv.participants || []).filter(Boolean);
        const selfId = auth.currentUser?.uid;
        const otherId = ids.find(id => id !== selfId) || ids[0];
        const isTyping = conv?.typing?.[otherId] || false;
        setTypingOther(!!isTyping);
      } catch (error) {
        console.error('Error in conversation subscription:', error);
      }
    });

    return () => {
      if (typeof unsubMessages === 'function') unsubMessages();
      if (typeof unsubConversation === 'function') unsubConversation();
    };
  }, [activeConvId]);

  // Enhanced conversation opening
  const openConversation = useCallback(async (convId) => {
    setActiveConvId(convId);
    try {
      const conv = conversations.find(c => c.id === convId);
      if (conv) {
        const ids = (conv.participants || []).filter(Boolean);
        const selfId = auth.currentUser?.uid;
        const otherId = ids.find(id => id !== selfId) || ids[0];
        if (otherId) {
          const other = await getUserById(otherId);
          setOtherUser(other ? { 
            id: otherId, 
            name: other.displayName || other.companyName || 'Unknown User', 
            photoURL: other.photoURL || '', 
            companyName: other.companyName || '',
            role: other.role || 'user'
          } : { id: otherId, name: 'Unknown User' });
        }
      }
    } catch (error) {
      console.error('Error opening conversation:', error);
    }
  }, [conversations]);

  // Enhanced message sending with file handling
  const handleSend = async (e) => {
    e.preventDefault();
    if (!activeConvId || (!text.trim() && files.length === 0)) return;
    
    try {
      let attachments = [];
      if (files.length) {
        attachments = await Promise.all(
          files.map(f => uploadChatAttachment(f).catch(error => {
            console.error('Error uploading file:', error);
            return null;
          }))
        );
        attachments = attachments.filter(Boolean);
      }

      await sendMessage(activeConvId, text.trim(), requestId || null, attachments);
      setText('');
      setFiles([]);
      setTyping(activeConvId, false);
      if (typingTimer) clearTimeout(typingTimer);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Enhanced typing indicator
  const handleTyping = (val) => {
    setText(val);
    if (!activeConvId) return;
    
    try { 
      setTyping(activeConvId, true); 
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
    
    if (typingTimer) clearTimeout(typingTimer);
    const t = setTimeout(() => { 
      try { 
        setTyping(activeConvId, false); 
      } catch (error) {
        console.error('Error clearing typing indicator:', error);
      }
    }, 1000);
    setTypingTimer(t);
  };

  // File handling
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
    e.target.value = ''; // Reset input
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Message actions
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await deleteMessage(activeConvId, messageId);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleArchiveConversation = async (convId) => {
    try {
      await archiveConversation(convId);
    } catch (error) {
      console.error('Error archiving conversation:', error);
    }
  };

  // Format timestamp for messages
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else if (isThisWeek(date)) {
      return format(date, 'EEE');
    } else {
      return format(date, 'MMM dd');
    }
  };

  // Format conversation timestamp
  const formatConversationTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM dd');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600">Communicate with your service providers</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {conversations.length} Conversations
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations Sidebar */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-4 border-b space-y-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant={activeTab === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('active')}>Active</Button>
              <Button variant={activeTab === 'archived' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('archived')}>Archived</Button>
            </div>
          </CardHeader>
          
          <ScrollArea className="flex-1">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Loading conversations...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-400 mb-2">No conversations</div>
                  <div className="text-sm text-gray-500">Start a conversation with a service provider</div>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const ids = (conv.participants || []).filter(Boolean);
                  const selfId = auth.currentUser?.uid;
                  const otherId = ids.find(id => id !== selfId) || ids[0];
                  const profile = otherProfiles[otherId];
                  const unreadCount = Number(conv?.unreadCount?.[auth.currentUser?.uid] || 0);
                  
                  return (
                    <button
                      key={conv.id}
                      onClick={() => openConversation(conv.id)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        activeConvId === conv.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
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
                              {profile?.name || 'Unknown User'}
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {unreadCount > 0 && (
                                <Badge variant="destructive" className="h-5 px-1.5 text-xs min-w-[20px] flex items-center justify-center">
                                  {unreadCount}
                                </Badge>
                              )}
                              <div className="text-xs text-gray-400 whitespace-nowrap">
                                {formatConversationTime(conv.lastMessageAt)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-600 truncate mb-1">
                            {conv.lastMessage?.text || 'No messages yet'}
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
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader className="pb-4 border-b">
            {otherUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={otherUser.photoURL} />
                    <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white">
                      {String(otherUser.name).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {otherUser.name}
                      {typingOther && (
                        <Badge variant="outline" className="text-xs animate-pulse">
                          Typing...
                        </Badge>
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
                    Archive
                  </Button>
                </div>
              </div>
            ) : (
              <CardTitle>Select a conversation</CardTitle>
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
                        <div className="text-lg font-semibold mb-2">No messages yet</div>
                        <div className="text-sm">Start the conversation by sending a message</div>
                      </div>
                    ) : (
                      messages.map((message, index) => {
                        const isOwn = message.senderId === auth.currentUser?.uid;
                        const showAvatar = index === 0 || messages[index - 1]?.senderId !== message.senderId;
                        const showTime = index === messages.length - 1 || 
                                       messages[index + 1]?.senderId !== message.senderId ||
                                       new Date(messages[index + 1]?.createdAt?.toDate?.() || messages[index + 1]?.createdAt) - 
                                       new Date(message.createdAt?.toDate?.() || message.createdAt) > 300000; // 5 minutes

                        return (
                          <div
                            key={message.id}
                            className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} ${
                              showAvatar ? 'mb-4' : 'mb-1'
                            }`}
                          >
                            {showAvatar && !isOwn && (
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src={otherUser?.photoURL} />
                                <AvatarFallback className="text-xs">
                                  {String(otherUser?.name || '?').charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            
                            <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                              <div
                                className={`relative group px-4 py-2 rounded-2xl ${
                                  isOwn
                                    ? 'bg-blue-600 text-white rounded-br-md'
                                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                                }`}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setSelectedMessage(message);
                                }}
                              >
                                <div className="text-sm whitespace-pre-wrap break-words">{message.text}</div>
                                
                                {/* Attachments */}
                                {message.attachments?.length > 0 && (
                                  <div className="mt-2 space-y-2">
                                    {message.attachments.map((attachment, i) => (
                                      <div key={i} className="flex items-center gap-2 p-2 bg-black/10 rounded">
                                        {attachment.type?.startsWith('image/') ? (
                                          <div className="relative">
                                            <img 
                                              src={attachment.url} 
                                              alt={attachment.name} 
                                              className="max-w-[200px] rounded-lg cursor-pointer"
                                              onClick={() => window.open(attachment.url, '_blank')}
                                            />
                                            <FiImage className="absolute top-2 right-2 text-white bg-black/50 rounded p-1" size={16} />
                                          </div>
                                        ) : (
                                          <a
                                            href={attachment.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm hover:underline"
                                          >
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
                                  <div className={`flex items-center gap-1 mt-1 text-xs ${
                                    isOwn ? 'text-blue-100 justify-end' : 'text-gray-500'
                                  }`}>
                                    <FiClock className="h-3 w-3" />
                                    {formatMessageTime(message.createdAt)}
                                    {isOwn && (
                                      Array.isArray(message.readBy) && otherUser?.id && message.readBy.includes(otherUser.id) ? (
                                        <span className="flex items-center gap-1 text-xs text-blue-100">
                                          <FiCheckCircle className="h-3 w-3" />
                                          Seen
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
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <form onSubmit={handleSend} className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      multiple
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FiPaperclip className="h-4 w-4" />
                    </Button>
                    
                    <Input
                      placeholder="Type your message..."
                      value={text}
                      onChange={(e) => handleTyping(e.target.value)}
                      className="flex-1"
                    />
                    
                    <Button 
                      type="submit" 
                      disabled={!text.trim() && files.length === 0}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <FiSend className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-lg font-semibold mb-2">No conversation selected</div>
                  <div className="text-sm">Choose a conversation from the list to start messaging</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message Context Menu */}
      {selectedMessage && (
        <div 
          className="fixed inset-0 z-50"
          onClick={() => setSelectedMessage(null)}
        >
          <div 
            className="absolute bg-white border rounded-lg shadow-lg py-1 z-50"
            style={{
              left: selectedMessage.clientX,
              top: selectedMessage.clientY
            }}
          >
            <button
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
              onClick={() => handleDeleteMessage(selectedMessage.id)}
            >
              <FiTrash2 className="h-4 w-4" />
              Delete Message
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;