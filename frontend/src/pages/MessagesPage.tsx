import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getUser, authHeaders } from '../auth';

interface Conversation {
  userId: string;
  userName: string;
  lastMessage: string;
  lastAt: string;
}

interface Message {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  text: string;
  createdAt: string;
}

export default function MessagesPage() {
  const { userId: chatUserId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const me = getUser();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherName, setOtherName] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!me) { navigate('/login'); return; }
    loadConversations();
  }, []);

  useEffect(() => {
    if (!chatUserId) return;
    loadMessages();
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [chatUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = () => {
    fetch('/api/messages', { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { conversations: Conversation[] }) => setConversations(data.conversations ?? []))
      .catch(() => {});
  };

  const loadMessages = () => {
    fetch(`/api/messages/${chatUserId}`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: { messages: Message[]; otherName: string }) => {
        setMessages(data.messages ?? []);
        setOtherName(data.otherName ?? '');
        loadConversations();
      })
      .catch(() => {});
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !chatUserId) return;
    setSending(true);
    try {
      await fetch(`/api/messages/${chatUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ text }),
      });
      setText('');
      loadMessages();
    } finally {
      setSending(false);
    }
  };

  if (!me) return null;

  return (
    <div className="messages-page">
      {/* Conversation list */}
      <aside className="conv-list">
        <h2>Messages</h2>
        {conversations.length === 0 ? (
          <p className="conv-empty">No conversations yet.<br />Message someone from their profile.</p>
        ) : (
          conversations.map(c => (
            <Link
              key={c.userId}
              to={`/messages/${c.userId}`}
              className={`conv-item ${chatUserId === c.userId ? 'active' : ''}`}
            >
              <div className="conv-avatar">{c.userName.charAt(0).toUpperCase()}</div>
              <div className="conv-info">
                <div className="conv-name">{c.userName}</div>
                <div className="conv-last">{c.lastMessage}</div>
              </div>
            </Link>
          ))
        )}
      </aside>

      {/* Thread */}
      <section className="thread">
        {!chatUserId ? (
          <div className="thread-empty">Select a conversation or message someone from their profile.</div>
        ) : (
          <>
            <div className="thread-header">
              <Link to={`/users/${chatUserId}`} className="thread-name">{otherName || '…'}</Link>
            </div>
            <div className="thread-messages">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`bubble ${msg.fromUserId === me.id ? 'bubble-me' : 'bubble-them'}`}
                >
                  <div className="bubble-text">{msg.text}</div>
                  <div className="bubble-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form className="thread-input" onSubmit={sendMessage}>
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Type a message…"
                autoFocus
              />
              <button type="submit" disabled={sending || !text.trim()}>Send</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
