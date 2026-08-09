import { useState, useRef, useEffect, useCallback } from 'react';
import { useFamilyMember } from '../context/FamilyMemberContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

// ─── Markdown-like renderer (no external dep) ─────────────────────────────────
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
          className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
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
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-3 shadow-md">
          <span className="text-white text-base">🩺</span>
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-none'
            : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
        }`}
      >
        {message.isStreaming && message.content === '' ? (
          <TypingDots />
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        )}
        {message.isStreaming && message.content !== '' && (
          <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center ml-3 shadow-md">
          <span className="text-white text-base">👤</span>
        </div>
      )}
    </div>
  );
}

// ─── Main AiChat Component ────────────────────────────────────────────────────
// API calls go through Vite's /api proxy (configured in vite.config.ts → localhost:3001)

export function AiChat() {
  const { activeMemberId, activeMemberName, isSelf } = useFamilyMember();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Re-initialize welcome message whenever activeMemberId or activeMemberName changes
  useEffect(() => {
    if (!activeMemberId) return;

    abortRef.current?.abort();
    setIsLoading(false);
    setError(null);

    const welcomeContent = isSelf
      ? "Hello! 👋 I'm your personal health assistant. I have access to your health records and medicine logs. Feel free to ask me anything — like:\n\n- **How am I doing with my medicines?**\n- **What do my sugar levels look like recently?**\n- **What should I eat given my health condition?**"
      : `Hello! 👋 I'm the health assistant for ${activeMemberName}. I have access to their health records and medicine logs. Feel free to ask me anything — like:\n\n- **How is ${activeMemberName} doing with their medicines?**\n- **What do ${activeMemberName}'s sugar levels look like recently?**\n- **What should ${activeMemberName} eat given their health condition?**`;

    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: welcomeContent,
      },
    ]);
  }, [activeMemberId, activeMemberName, isSelf]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !activeMemberId) return;

    setError(null);
    setInput('');

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages([...updatedMessages, assistantMsg]);
    setIsLoading(true);

    abortRef.current = new AbortController();

    try {
      const response = await fetch(`/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: activeMemberId,
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const rawChunk = decoder.decode(value, { stream: true });

        // Parse SSE: each line is "data: ...\n\n"
        const lines = rawChunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();

          if (payload === '[DONE]') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, isStreaming: false } : m,
              ),
            );
            return;
          }

          try {
            const parsed = JSON.parse(payload) as { text?: string; error?: string };
            if (parsed.error) {
              setError(parsed.error);
              break;
            }
            if (parsed.text) {
              accumulatedText += parsed.text;
              const snapshot = accumulatedText;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: snapshot } : m,
                ),
              );
            }
          } catch {
            // Non-JSON line, skip
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message ?? 'Something went wrong. Please try again.');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: '⚠️ Sorry, I encountered an error. Please try again.', isStreaming: false }
              : m,
          ),
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, activeMemberId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsLoading(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
    );
  };

  // Loading state if activeMemberId is not yet available
  if (!activeMemberId) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🤖</span>
          </div>
          <p className="text-gray-600 text-sm font-medium">Loading active member profile…</p>
        </div>
      </div>
    );
  }

  // ─── Chat UI ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow">
            <span className="text-xl">🩺</span>
          </div>
          <div>
            <h2 className="font-bold text-gray-800 text-sm">Health AI Assistant</h2>
            <p className="text-xs text-gray-500 flex items-center gap-1 font-medium">
              Viewing: <span className="font-semibold text-indigo-600">{activeMemberName}</span>
              {isSelf && (
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">
                  You
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${isLoading ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            {isLoading ? 'Analysing...' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Messages */}
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

      {/* Quick prompts (shown when only welcome message is present) */}
      {messages.length === 1 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2 justify-center">
          {(isSelf
            ? [
                'How am I doing with my medicines?',
                'Analyse my recent sugar levels',
                'What diet should I follow?',
                'Am I skipping any medicines?',
              ]
            : [
                `How is ${activeMemberName} doing with medicines?`,
                `Analyse ${activeMemberName}'s recent sugar levels`,
                `What diet is recommended for ${activeMemberName}?`,
                `Is ${activeMemberName} skipping any medicines?`,
              ]
          ).map((prompt) => (
            <button
              key={prompt}
              onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
              className="text-xs bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-50 transition-colors shadow-sm"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="bg-white border-t border-gray-100 px-4 py-4 shadow-md">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-transparent transition-all">
            <textarea
              id="chat-input"
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about medicines, health trends, diet tips… (Enter to send)"
              className="w-full bg-transparent text-sm text-gray-800 resize-none focus:outline-none leading-relaxed max-h-32 placeholder-gray-400"
              rows={1}
              disabled={isLoading}
            />
          </div>

          {isLoading ? (
            <button
              id="stop-btn"
              onClick={handleStop}
              className="flex-shrink-0 w-11 h-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors shadow"
              title="Stop"
            >
              ⏹
            </button>
          ) : (
            <button
              id="send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all shadow-md"
              title="Send (Enter)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          Powered by Google Gemini · Data is fetched live from patient records
        </p>
      </div>
    </div>
  );
}

