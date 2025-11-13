import React, { useEffect, useState } from 'react';
import { getChatHistory } from '../services/geminiService';

interface ChatRow {
  id: number;
  role: string;
  message: string;
  metadata: any;
  created_at: string;
}

interface Session {
  id: string; // generated id for the session
  messages: ChatRow[];
  lastUpdated: string;
}

interface Props {
  onLoadConversation: (rows: ChatRow[]) => void;
  onNewConversation: () => void;
  // Optional: called when sidebar should be closed (mobile)
  onClose?: () => void;
  className?: string;
}

const SessionPreview: React.FC<{ session: Session; onClick: () => void }> = ({ session, onClick }) => {
  const last = session.messages[session.messages.length - 1];
  const preview = (last && last.message) ? last.message.slice(0, 80) : 'Empty conversation';
  const date = new Date(session.lastUpdated).toLocaleString();

  return (
    <button onClick={onClick} className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition">
      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{preview}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{date}</div>
    </button>
  );
};

const ConversationSidebar: React.FC<Props> = ({ onLoadConversation, onNewConversation, onClose, className }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const rows = await getChatHistory();
        if (!mounted) return;
        // rows are ordered ASC by created_at
        const CHUNK_MS = 30 * 60 * 1000; // 30 minutes gap = new session
        const built: Session[] = [];
        let cur: Session | null = null;

        for (const r of rows) {
          const created = new Date(r.created_at).getTime();
          if (!cur) {
            cur = { id: String(r.id), messages: [r], lastUpdated: r.created_at };
            continue;
          }
          const lastCreated = new Date(cur.lastUpdated).getTime();
          if (created - lastCreated > CHUNK_MS) {
            built.push(cur);
            cur = { id: String(r.id), messages: [r], lastUpdated: r.created_at };
          } else {
            cur.messages.push(r);
            cur.lastUpdated = r.created_at;
          }
        }
        if (cur) built.push(cur);

        setSessions(built.reverse()); // newest first
      } catch (e) {
        console.error('Failed to load chat sessions:', e);
      } finally {
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const baseClasses = 'w-80 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-full p-3';

  return (
    <aside className={`${baseClasses} ${className ? className : 'hidden md:flex'} flex-col`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Conversations</h3>
        <button onClick={() => { onNewConversation(); onClose && onClose(); }} className="text-sm px-2 py-1 bg-red-600 text-white rounded">New</button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {!loading && sessions.length === 0 && (
          <div className="text-sm text-gray-500">No conversations yet. Start a new chat.</div>
        )}

        {sessions.map(sess => (
          <div key={sess.id} className="border border-transparent hover:border-gray-200 dark:hover:border-gray-800 rounded">
            <SessionPreview session={sess} onClick={() => { onLoadConversation(sess.messages); onClose && onClose(); }} />
          </div>
        ))}
      </div>
    </aside>
  );
};

export default ConversationSidebar;
