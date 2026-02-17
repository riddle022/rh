import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User, Loader2, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useNotification } from '../context/NotificationContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AssistenteIA = ({ permissions: _permissions }: { permissions: any }) => {
  const { confirm: confirmAction } = useNotification();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/comercial-assistant`;
      const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const history = messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: history,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao obter resposta do assistente');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = async () => {
    const confirmed = await confirmAction({
      title: 'Limpar Conversa',
      message: 'Deseja limpar todo o histórico de conversa?',
      variant: 'danger'
    });
    if (confirmed) {
      setMessages([]);
    }
  };


  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400 flex items-center gap-3">
              <Bot className="w-8 h-8" />
              Assistente Comercial IA
            </h1>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Chat
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center mb-4 mx-auto shadow-lg shadow-cyan-500/30">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-gray-500 text-sm">
                    Faça uma pergunta para começar
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-4 ${message.role === 'assistant' ? 'items-start' : 'items-start'
                      }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg ${message.role === 'assistant'
                        ? 'bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-cyan-500/30'
                        : 'bg-gradient-to-br from-gray-600 to-gray-700'
                        }`}
                    >
                      {message.role === 'assistant' ? (
                        <Bot className="w-5 h-5 text-white" />
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-200">
                          {message.role === 'assistant' ? 'Assistente' : 'Você'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div
                        className={`prose prose-invert max-w-none ${message.role === 'assistant'
                          ? 'text-gray-300'
                          : 'text-gray-300 bg-[#151B2D] p-4 rounded-lg border border-gray-700'
                          }`}
                      >
                        {message.content.split('\n').map((line, i) => {
                          if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
                            return (
                              <p key={i} className="font-bold text-cyan-400 my-2">
                                {line.replace(/\*\*/g, '')}
                              </p>
                            );
                          }
                          if (line.trim().startsWith('###')) {
                            return (
                              <h3 key={i} className="text-lg font-bold text-gray-200 mt-4 mb-2">
                                {line.replace(/###/g, '').trim()}
                              </h3>
                            );
                          }
                          if (line.trim().startsWith('##')) {
                            return (
                              <h2 key={i} className="text-xl font-bold text-cyan-400 mt-6 mb-3">
                                {line.replace(/##/g, '').trim()}
                              </h2>
                            );
                          }
                          if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                            return (
                              <p key={i} className="ml-4 my-1">
                                {line}
                              </p>
                            );
                          }
                          return line.trim() ? (
                            <p key={i} className="my-2">
                              {line}
                            </p>
                          ) : (
                            <br key={i} />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/30">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-200">Assistente</span>
                        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <div className="flex gap-1">
                          <div
                            className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                            style={{ animationDelay: '0ms' }}
                          />
                          <div
                            className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          />
                          <div
                            className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          />
                        </div>
                        <span className="text-sm">Analisando dados...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="border-t border-gray-700 p-4">
            <div className="flex gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua pergunta... (Shift+Enter para nova linha)"
                disabled={loading}
                rows={1}
                className="flex-1 px-4 py-3 bg-[#151B2D] border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-6 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/30 transition-all duration-200 flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span className="hidden sm:inline">Enviar</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              <MessageSquare className="w-3 h-3 inline mr-1" />
              Pressione Enter para enviar, Shift+Enter para nova linha
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
