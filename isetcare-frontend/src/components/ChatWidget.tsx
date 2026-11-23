import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, Send, X, MessageCircle } from 'lucide-react';
import { chatWithAssistant, type ChatMessage } from '../api/ai';
import { errorMessage } from '../api/client';

const ACCUEIL: ChatMessage = {
  role: 'model',
  text: "Bonjour ! Je suis l'assistant ISETCare. Posez-moi une question sur le signalement d'une panne, le suivi d'une réclamation ou l'utilisation du site.",
};

/** Bulle de discussion flottante : l'assistant IA (Gemini, via le serveur Spring Boot). */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([ACCUEIL]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const next: ChatMessage[] = [...messages, { role: 'user', text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      // Le message d'accueil n'est pas envoyé : la conversation doit commencer par l'utilisateur.
      const reply = await chatWithAssistant(next.slice(1));
      setMessages([...next, { role: 'model', text: reply.reply }]);
    } catch (err) {
      setMessages([...next, { role: 'model', text: errorMessage(err, "Désolé, je n'ai pas pu répondre.") }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button className="chat-fab" onClick={() => setOpen(true)} aria-label="Ouvrir l'assistant IA">
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="chat-panel" role="dialog" aria-label="Assistant ISETCare">
      <div className="chat-header">
        <Bot size={20} />
        <span>Assistant ISETCare</span>
        <button className="chat-close" onClick={() => setOpen(false)} aria-label="Fermer">
          <X size={18} />
        </button>
      </div>
      <div className="chat-messages" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role === 'user' ? 'chat-msg-user' : 'chat-msg-bot'}`}>
            {m.text}
          </div>
        ))}
        {loading && <div className="chat-msg chat-msg-bot chat-typing">…</div>}
      </div>
      <form className="chat-form" onSubmit={send}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrivez votre question…"
          maxLength={1000}
          autoFocus
        />
        <button type="submit" disabled={loading || !input.trim()} aria-label="Envoyer">
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}
