'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Send,
  Code2,
  Paperclip,
  Smile,
  Hash,
  AtSign,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getChannelMessages,
  sendChannelMessageAction,
  getDirectMessages,
  sendDirectMessageAction,
} from '@/lib/chat-actions';
import { toast } from 'sonner';

interface RealtimeChatViewProps {
  channel?: {
    _id: string;
    name: string;
    type: string;
    topic?: string;
  };
  serverId?: string;
  directChat?: {
    _id: string;
    targetUser: {
      _id: string;
      user_name?: string;
      name?: string;
      image?: string;
      avatar?: string;
    };
  };
  currentUser: {
    _id?: string;
    id?: string;
    user_name?: string;
    name?: string;
    image?: string;
    avatar?: string;
  };
}

export const RealtimeChatView: React.FC<RealtimeChatViewProps> = ({
  channel,
  serverId,
  directChat,
  currentUser,
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  // Code snippet dialog state
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [codeLang, setCodeLang] = useState('typescript');
  const [codeSnippetContent, setCodeSnippetContent] = useState('');
  const [codeComment, setCodeComment] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeId = channel?._id || directChat?._id || '';
  const isDirect = !!directChat;

  const signalingUrl =
    process.env.NEXT_PUBLIC_SIGNALING_URL ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:10000'
      : 'https://nerdshive.online');

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // 1. Fetch initial message history
  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!activeId) return;
      setLoading(true);
      try {
        let history = [];
        if (isDirect && directChat?._id) {
          history = await getDirectMessages(directChat._id);
        } else if (channel?._id) {
          history = await getChannelMessages(channel._id);
        }
        if (active) {
          setMessages(history);
          setLoading(false);
          setTimeout(() => scrollToBottom(false), 50);
        }
      } catch (err) {
        console.error('Failed to load message history:', err);
        if (active) setLoading(false);
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [activeId, isDirect, directChat?._id, channel?._id, scrollToBottom]);

  // 2. Setup Socket.io connection & subscriptions
  useEffect(() => {
    if (!activeId) return;

    const socket = io(signalingUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('channel:join', {
        channelId: activeId,
        user: currentUser,
      });
    });

    // Receive incoming message
    socket.on('channel:message_received', ({ channelId, message }: any) => {
      if (channelId === activeId) {
        setMessages((prev) => {
          // Deduplicate if already present
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        scrollToBottom(true);
      }
    });

    // Receive typing status
    socket.on('channel:typing_status', ({ channelId, user, isTyping }: any) => {
      if (channelId === activeId) {
        const uid = user?._id || user?.id;
        const currentUid = currentUser?._id || currentUser?.id;
        if (uid && uid !== currentUid) {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            if (isTyping) {
              next.set(uid, user?.user_name || user?.name || 'A developer');
            } else {
              next.delete(uid);
            }
            return next;
          });
        }
      }
    });

    return () => {
      socket.emit('channel:leave', { channelId: activeId });
      socket.disconnect();
    };
  }, [activeId, currentUser, signalingUrl, scrollToBottom]);

  // 3. Handle Typing Indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (socketRef.current) {
      socketRef.current.emit('channel:typing', {
        channelId: activeId,
        user: currentUser,
        isTyping: true,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('channel:typing', {
            channelId: activeId,
            user: currentUser,
            isTyping: false,
          });
        }
      }, 2000);
    }
  };

  // 4. Send Text Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeId) return;

    const messageText = inputText.trim();
    setInputText('');

    // Optimistic message
    const tempId = 'temp_' + Date.now();
    const optimisticMessage = {
      _id: tempId,
      message: messageText,
      senderId: {
        _id: currentUser._id || currentUser.id,
        user_name: currentUser.user_name || currentUser.name,
        avatar: currentUser.avatar,
        image: currentUser.image,
      },
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom(true);

    try {
      let res;
      if (isDirect && directChat) {
        res = await sendDirectMessageAction({
          chatRoomId: directChat._id,
          receiverId: directChat.targetUser._id,
          message: messageText,
        });
      } else if (channel && serverId) {
        res = await sendChannelMessageAction({
          channelId: channel._id,
          serverId,
          message: messageText,
        });
      }

      if (res?.success && res.message) {
        // Broadcast over socket to peers
        if (socketRef.current) {
          socketRef.current.emit('channel:message', {
            channelId: activeId,
            message: res.message,
          });
        }
        // Replace optimistic with real DB record
        setMessages((prev) =>
          prev.map((m) => (m._id === tempId ? res.message : m))
        );
      } else if (res?.error) {
        toast.error(res.error);
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
      }
    } catch (err) {
      toast.error('Failed to dispatch message');
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    }
  };

  // 5. Send Code Snippet
  const handleSendCodeSnippet = async () => {
    if (!codeSnippetContent.trim() || !activeId) return;

    const snippet = {
      language: codeLang,
      code: codeSnippetContent.trim(),
    };
    const comment = codeComment.trim() || `Shared a ${codeLang} snippet:`;

    setCodeModalOpen(false);
    setCodeSnippetContent('');
    setCodeComment('');

    try {
      if (channel && serverId) {
        const res = await sendChannelMessageAction({
          channelId: channel._id,
          serverId,
          message: comment,
          codeSnippet: snippet,
        });

        if (res?.success && res.message) {
          setMessages((prev) => [...prev, res.message]);
          scrollToBottom(true);
          if (socketRef.current) {
            socketRef.current.emit('channel:message', {
              channelId: activeId,
              message: res.message,
            });
          }
        }
      }
    } catch (err) {
      toast.error('Failed to share snippet');
    }
  };

  const channelTitle = isDirect
    ? directChat?.targetUser?.user_name || directChat?.targetUser?.name || 'Direct Message'
    : channel?.name || 'channel';

  const typingArray = Array.from(typingUsers.values());

  return (
    <div className="flex flex-col h-full bg-[#313338] text-gray-100 select-text">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#1f2023] bg-[#313338] shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-lg">
            {isDirect ? <AtSign className="w-5 h-5 text-indigo-400" /> : <Hash className="w-5 h-5 text-gray-400" />}
          </span>
          <div>
            <h1 className="font-bold text-base text-gray-100 flex items-center gap-2">
              {channelTitle}
              {isDirect && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-normal">
                  Online
                </span>
              )}
            </h1>
            {!isDirect && channel?.topic && (
              <p className="text-xs text-gray-400">{channel.topic}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Code Snippet Modal Button */}
          {!isDirect && (
            <Dialog open={codeModalOpen} onOpenChange={setCodeModalOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-[#2b2d31] border-[#383a40] hover:bg-[#383a40] text-gray-200 text-xs flex items-center gap-1.5"
                >
                  <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Share Code</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#313338] border-[#383a40] text-gray-100 sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-gray-100 flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-indigo-400" />
                    Share Code Snippet in #{channelTitle}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                      Language
                    </label>
                    <Select value={codeLang} onValueChange={setCodeLang}>
                      <SelectTrigger className="bg-[#1e1f22] border-[#383a40] text-gray-200">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2b2d31] border-[#383a40] text-gray-200">
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="rust">Rust</SelectItem>
                        <SelectItem value="go">Go</SelectItem>
                        <SelectItem value="sql">SQL</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="bash">Bash / Shell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                      Optional Message
                    </label>
                    <Input
                      value={codeComment}
                      onChange={(e) => setCodeComment(e.target.value)}
                      placeholder="e.g. Here is the bug repro..."
                      className="bg-[#1e1f22] border-[#383a40] text-gray-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                      Code Snippet
                    </label>
                    <textarea
                      value={codeSnippetContent}
                      onChange={(e) => setCodeSnippetContent(e.target.value)}
                      rows={8}
                      placeholder="// Paste code here..."
                      className="w-full bg-[#1e1f22] border border-[#383a40] rounded-md p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={() => setCodeModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSendCodeSnippet}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      disabled={!codeSnippetContent.trim()}
                    >
                      Post Snippet
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400 animate-pulse">
            Loading real-time message stream...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
            <div className="w-14 h-14 rounded-full bg-[#2b2d31] flex items-center justify-center mb-3">
              {isDirect ? <AtSign className="w-7 h-7 text-indigo-400" /> : <Hash className="w-7 h-7 text-indigo-400" />}
            </div>
            <h3 className="font-bold text-lg text-gray-200">Welcome to #{channelTitle}!</h3>
            <p className="text-xs text-gray-400 max-w-sm mt-1">
              This is the start of the #{channelTitle} channel. Send a message or share a snippet to kick off the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const sender = msg.senderId;
            const senderName = sender?.user_name || sender?.name || 'Anonymous Dev';
            const senderAvatar = sender?.image || sender?.avatar || '';
            const isCurrentUser =
              sender?._id === currentUser._id || sender?._id === currentUser.id;

            const timeString = msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';

            return (
              <div
                key={msg._id || index}
                className="flex items-start gap-3.5 group hover:bg-[#2b2d31]/40 px-3 py-1.5 -mx-3 rounded-lg transition-colors"
              >
                <Avatar className="w-10 h-10 mt-0.5 ring-2 ring-[#232428]">
                  <AvatarImage src={senderAvatar} />
                  <AvatarFallback className="bg-indigo-600 text-xs font-bold text-white">
                    {senderName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm text-gray-100 hover:underline cursor-pointer">
                      {senderName}
                    </span>
                    <span className="text-[11px] text-gray-400 font-normal">
                      {timeString}
                    </span>
                  </div>

                  {/* Message Text */}
                  {msg.message && (
                    <p className="text-sm text-gray-200 mt-0.5 leading-relaxed break-words whitespace-pre-wrap">
                      {msg.message}
                    </p>
                  )}

                  {/* Formatted Code Snippet Block */}
                  {msg.codeSnippet?.code && (
                    <div className="mt-2 rounded-lg border border-[#383a40] bg-[#1e1f22] overflow-hidden max-w-2xl">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-[#2b2d31] border-b border-[#383a40] text-xs text-gray-400 font-mono">
                        <span>{msg.codeSnippet.language || 'code'}</span>
                        <CopyCodeButton code={msg.codeSnippet.code} />
                      </div>
                      <pre className="p-3 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                        <code>{msg.codeSnippet.code}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator Bar */}
      <div className="px-6 h-5 text-xs text-gray-400 italic">
        {typingArray.length > 0 && (
          <div className="flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>
              {typingArray.join(', ')} {typingArray.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}
      </div>

      {/* Chat Input Box */}
      <div className="p-4 pt-1">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 bg-[#383a40] rounded-lg px-4 py-2.5 shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all"
        >
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={`Message #${channelTitle}...`}
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-400 focus:outline-none"
          />

          <Button
            type="submit"
            size="icon"
            disabled={!inputText.trim()}
            className="w-8 h-8 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-30 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

// Copy code button helper
const CopyCodeButton: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 hover:text-gray-200 transition-colors"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
};
