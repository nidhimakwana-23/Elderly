import { useState, useRef, useEffect, useCallback } from 'react';
import { useFamilyMember } from '../context/FamilyMemberContext';
import { askChatbot } from '../api/chatbot';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  confidence?: number;
  isLoading?: boolean;
}

// ─── Markdown-like renderer ───────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    // Bold: **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text*
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Bullet points: lines starting with - or •
    .replace(/^[-•]\s(.+)/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc list-inside space-y-1 my-2">$1</ul>')
    // Headers: ### text
    .replace(/^###\s(.+)/gm, '<h3 class="font-bold text-sm mt-3 mb-1">$1</h3>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-teal-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ─── Single message bubble ────────────────────────────────────────────────────
function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-4`}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mr-3 shadow-md">
          <span className="text-white text-base">💊</span>
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed ${
          isUser
            ? 'bg-teal-600 text-white rounded-tr-none'
            : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
        }`}
      >
        {message.isLoading ? (
          <TypingDots />
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div>
            <div
              className="prose prose-sm max-w-none text-gray-800"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
            />
            {/* Intent & confidence badge */}
            {message.intent && (
              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-2 text-[11px] text-gray-400">
                <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 font-mono">
                  <span>🎯</span> {message.intent}
                </span>
                {typeof message.confidence === 'number' && (
                  <span className="text-gray-400">
                    {Math.round(message.confidence * 100)}% match
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ml-3 shadow-md">
          <span className="text-white text-base">👤</span>
        </div>
      )}
    </div>
  );
}

// ─── Main CareChatbot Page Component ──────────────────────────────────────────
export function CareChatbot() {
  const { activeMemberId, activeMemberName, isSelf } = useFamilyMember();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Storage key based on active patient
  const storageKey = `care_chatbot_history_${activeMemberId ?? 'default'}`;

  const getWelcomeContent = useCallback(() => {
    return isSelf
      ? "Hello! 👋 I'm your dedicated Care Assistant powered by the health intent classifier. I query your actual records directly to answer questions like:\n\n- **Did I take my medicine today?**\n- **Which medicines did I miss?**\n- **Am I taking my medicines on time?**"
      : `Hello! 👋 I'm the Care Assistant for ${activeMemberName}. I query their verified medical records to give factual answers to questions like:\n\n- **Did ${activeMemberName} take their medicine today?**\n- **Which medicines were missed?**\n- **Is ${activeMemberName} taking medicines on time?**`;
  }, [isSelf, activeMemberName]);

  // Load conversation history on mount or when active member changes
  useEffect(() => {
    if (!activeMemberId) return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      // Ignore parse errors and fall back to welcome
    }

    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: getWelcomeContent(),
      },
    ]);
  }, [activeMemberId, storageKey, getWelcomeContent]);

  // Save messages to localStorage when updated (excluding loading bubbles)
  useEffect(() => {
    if (!activeMemberId || messages.length === 0) return;
    const clean = messages.filter((m) => !m.isLoading);
    try {
      localStorage.setItem(storageKey, JSON.stringify(clean));
    } catch {
      // Storage quota or disabled
    }
  }, [messages, activeMemberId, storageKey]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [input]);

  // Clear chat
  const handleClearChat = () => {
    localStorage.removeItem(storageKey);
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: getWelcomeContent(),
      },
    ]);
    setError(null);
  };

  // Send message to /api/chatbot/ask
  const sendMessage = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend ?? input).trim();
      if (!text || isLoading || !activeMemberId) return;

      setError(null);
      setInput('');

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
      };

      const loadingMsgId = `assistant-${Date.now()}`;
      const loadingMsg: Message = {
        id: loadingMsgId,
        role: 'assistant',
        content: '',
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setIsLoading(true);

      try {
        const result = await askChatbot({
          question: text,
          patientId: activeMemberId,
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsgId
              ? {
                  id: loadingMsgId,
                  role: 'assistant',
                  content: result.answer,
                  intent: result.intent,
                  confidence: result.confidence,
                  isLoading: false,
                }
              : m,
          ),
        );
      } catch (err: any) {
        const errorMsg =
          err.response?.data?.error ||
          err.message ||
          'Failed to retrieve answer. Please try again.';

        setError(errorMsg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsgId
              ? {
                  id: loadingMsgId,
                  role: 'assistant',
                  content: `⚠️ ${errorMsg}`,
                  isLoading: false,
                }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, activeMemberId],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick suggestion prompts
  const quickPrompts = isSelf
    ? [
        'Did I take my medicine today?',
        'Which medicines did I miss?',
        'Am I taking medicines on time?',
        'Show me my blood pressure trend',
      ]
    : [
        `Did ${activeMemberName} take medicine today?`,
        `Which medicines did ${activeMemberName} miss?`,
        `Is ${activeMemberName} taking medicines on time?`,
        `Show me ${activeMemberName}'s blood pressure trend`,
      ];

  if (!activeMemberId) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-gradient-to-br from-teal-50 via-emerald-50 to-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">💬</span>
          </div>
          <p className="text-gray-600 text-sm font-medium">Loading active member profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-gradient-to-br from-teal-50 via-emerald-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center shadow">
            <span className="text-xl">🩺</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-800 text-sm">Care Chatbot</h2>
              <span className="text-[10px] bg-teal-100 text-teal-800 font-medium px-2 py-0.5 rounded-full">
                ML Classifier
              </span>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1 font-medium">
              Viewing: <span className="font-semibold text-teal-700">{activeMemberName}</span>
              {isSelf && (
                <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-medium">
                  You
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleClearChat}
            className="text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg border border-gray-200 transition-colors"
            title="Clear current conversation"
          >
            Clear chat
          </button>
          <span
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
              isLoading ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            {isLoading ? 'Querying records...' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-0">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {/* Error banner */}
        {error && (
          <div className="mx-4 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts (visible when conversation is minimal) */}
      {messages.length <= 1 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2 justify-center">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => {
                setInput(prompt);
                textareaRef.current?.focus();
              }}
              className="text-xs bg-white border border-teal-200 text-teal-700 px-3 py-1.5 rounded-full hover:bg-teal-50 transition-colors shadow-sm"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="bg-white border-t border-gray-100 px-4 py-4 shadow-md">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all">
            <textarea
              id="care-chatbot-input"
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about today's medicines, adherence, timing… (Enter to send)"
              className="w-full bg-transparent text-sm text-gray-800 resize-none focus:outline-none leading-relaxed max-h-32 placeholder-gray-400"
              rows={1}
              disabled={isLoading}
            />
          </div>

          <button
            id="care-chatbot-send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-teal-600 to-emerald-600 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all shadow-md"
            title="Send (Enter)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          Powered by ML Intent Classifier · Answers derived deterministically from medical records
        </p>
      </div>
    </div>
  );
}
