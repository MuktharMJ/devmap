import {
  ArrowRight,
  ArrowUp,
  CircleHelp,
  LoaderCircle,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { LocalAnalysisProvider, OllamaProvider, type OllamaSettings } from '../lib/ai';
import type { ChatMessage, Project } from '../types';
import { ConfidenceBadge, FileLink, Logo, preferredScrollBehavior } from './shared';
const suggestions = [
  'What does this project do?',
  'How does authentication work?',
  'Where are API requests handled?',
  'Which files should I read first?',
];
export default function Explainer({
  project,
  settings,
  messages,
  setMessages,
  onSettings,
  onOpen,
}: {
  project: Project;
  settings: OllamaSettings;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  onSettings: () => void;
  onOpen: (path: string) => void;
}) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    if (messages.length)
      end.current?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'nearest' });
  }, [messages, busy]);
  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    const controller = new AbortController();
    abort.current = controller;
    const q = question.trim().slice(0, 6000);
    setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: 'user', text: q }]);
    setInput('');
    setBusy(true);
    setNotice('');
    try {
      const provider = settings.enabled
        ? new OllamaProvider(settings)
        : new LocalAnalysisProvider();
      let response;
      try {
        response = await provider.explain(q, project, messages, controller.signal);
      } catch (e) {
        if (controller.signal.aborted) return;
        setNotice(
          `Ollama is unavailable. ${e instanceof Error ? e.message : 'The request failed.'} Answered with local analysis instead.`,
        );
        response = await new LocalAnalysisProvider().explain(q, project);
      }
      if (!controller.signal.aborted)
        setMessages((previous) => [
          ...previous,
          { id: crypto.randomUUID(), role: 'assistant', text: response.text, response },
        ]);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return (
    <div className="explainer-layout">
      <div className="chat-panel">
        <div className="chat-toolbar">
          <span>
            <span className="status-dot" />
            {settings.enabled ? `Ollama · ${settings.model}` : 'Local analysis'}
          </span>
          <div>
            <button
              className="icon-button"
              aria-label="Clear conversation"
              disabled={!messages.length || busy}
              onClick={() => {
                setMessages([]);
                setNotice('');
              }}
            >
              <Trash2 size={15} />
            </button>
            <button className="button small secondary" onClick={onSettings}>
              <Settings2 size={14} />
              Provider
            </button>
          </div>
        </div>
        <div className="chat-body">
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <div className="explainer-mark">
                <Logo small />
              </div>
              <div className="eyebrow">A LITTLE CONTEXT GOES A LONG WAY</div>
              <h2>Meet your codebase.</h2>
              <p>
                Find the starting point, follow a request,
                <br />
                or make sense of how it all fits together.
              </p>
              <div className="question-grid">
                {suggestions.map((q) => (
                  <button key={q} onClick={() => void ask(q)}>
                    {q}
                    <ArrowUp size={15} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((message) => (
                <article key={message.id} className={`message ${message.role}`}>
                  <div className="message-avatar">
                    {message.role === 'assistant' ? <Logo small /> : 'Y'}
                  </div>
                  <div className="message-content">
                    <div className="message-label">
                      <strong>{message.role === 'assistant' ? 'DevMap' : 'You'}</strong>
                      {message.response && (
                        <>
                          <span>
                            {message.response.provider === 'local' ? 'Local analysis' : 'Ollama'}
                          </span>
                          <ConfidenceBadge value={message.response.confidence} />
                        </>
                      )}
                    </div>
                    <div className="message-text">{message.text}</div>
                    {Boolean(message.response?.sources.length) && (
                      <div className="message-sources">
                        <span>SOURCE FILES</span>
                        {message.response!.sources.map((path) => (
                          <FileLink key={path} path={path} onOpen={onOpen} />
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
              {busy && (
                <div className="chat-thinking" role="status">
                  <LoaderCircle size={16} className="spin" />
                  Reading the project context…
                </div>
              )}
              <div ref={end} />
            </div>
          )}
        </div>
        {notice && (
          <div className="chat-notice" role="status">
            <CircleHelp size={16} />
            <span>{notice}</span>
          </div>
        )}
        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <label htmlFor="question" className="sr-only">
            Ask about this project
          </label>
          <textarea
            id="question"
            rows={2}
            maxLength={6000}
            placeholder={`Ask anything about ${project.name}…`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void ask(input);
              }
            }}
          />
          <div className="composer-bottom">
            <span>
              <ShieldCheck size={12} />
              {settings.enabled
                ? 'Sent to your local Ollama server'
                : 'Your code stays in this browser'}
            </span>
            {busy ? (
              <button
                type="button"
                className="send-button"
                aria-label="Stop generating"
                onClick={() => {
                  abort.current?.abort();
                  setBusy(false);
                  setNotice('Generation stopped. You can ask another question.');
                }}
              >
                <Square size={15} />
              </button>
            ) : (
              <button className="send-button" aria-label="Send question" disabled={!input.trim()}>
                <ArrowUp size={18} />
              </button>
            )}
          </div>
        </form>
        <p className="composer-disclaimer">
          {settings.enabled
            ? 'AI explanations may be incorrect. Verify claims against source files.'
            : 'Structural answers, not generated AI. Connect Ollama for open-ended reasoning.'}
        </p>
      </div>
      <aside className="chat-context">
        <div className="eyebrow">IN CONTEXT</div>
        <h3>
          {project.name}
          <span className="tiny-tag">{project.demo ? 'DEMO' : 'LOCAL'}</span>
        </h3>
        <p>
          {project.files.length} files · {project.nodes.length} architectural areas
        </p>
        <hr />
        <h4>
          Good questions lead
          <br />
          to useful discoveries.
        </h4>
        <p>Ask about an area of the project, then follow the source links to see the evidence.</p>
        <div className="context-prompt">
          <Sparkles size={17} />
          <span>“How does data flow from the frontend to the database?”</span>
        </div>
        <button
          className="text-link"
          onClick={() => void ask('How does data flow from the frontend to the database?')}
          disabled={busy}
        >
          Explore data flow
          <ArrowRight size={14} />
        </button>
        <div className="context-footnote">
          <ShieldCheck size={18} />
          <p>
            No external API key.
            <br />
            No background uploads.
            <br />
            Just your code and its context.
          </p>
        </div>
      </aside>
    </div>
  );
}
