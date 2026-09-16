import { ArrowRight, Check, Cpu, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { DEFAULT_OLLAMA, OllamaProvider, validateEndpoint, type OllamaSettings } from '../lib/ai';
import { ErrorNotice, Modal } from './shared';
export function loadSettings(): OllamaSettings {
  try {
    // Preserve provider preferences saved before the DevMap rename.
    const value = JSON.parse(
      localStorage.getItem('devmap-ollama') ?? localStorage.getItem('codeatlas-ollama') ?? 'null',
    );
    return value && typeof value.endpoint === 'string' && typeof value.model === 'string'
      ? { ...DEFAULT_OLLAMA, ...value, enabled: value.enabled === true }
      : DEFAULT_OLLAMA;
  } catch {
    return DEFAULT_OLLAMA;
  }
}

export function ProviderSettings({
  current,
  onSave,
  onClose,
}: {
  current: OllamaSettings;
  onSave: (settings: OllamaSettings) => void;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState(current);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [models, setModels] = useState<string[]>([]);
  return (
    <Modal title="Explanation provider" onClose={onClose}>
      <p className="modal-intro">
        Start with local analysis. Connect Ollama for open-ended questions, with inference on your
        own machine.
      </p>
      <div className="provider-options">
        <button
          className={!settings.enabled ? 'selected' : ''}
          onClick={() => setSettings({ ...settings, enabled: false })}
        >
          <ShieldCheck size={22} />
          <strong>Local analysis</strong>
          <span>Evidence-based summaries. No model needed.</span>
          {!settings.enabled && <Check size={16} />}
        </button>
        <button
          className={settings.enabled ? 'selected' : ''}
          onClick={() => setSettings({ ...settings, enabled: true })}
        >
          <Cpu size={22} />
          <strong>Ollama</strong>
          <span>Ask a local language model about your code.</span>
          {settings.enabled && <Check size={16} />}
        </button>
      </div>
      {settings.enabled && (
        <div className="provider-fields">
          <label>
            Local endpoint
            <input
              value={settings.endpoint}
              onChange={(e) => {
                setSettings({ ...settings, endpoint: e.target.value });
                setStatus('');
                setError('');
              }}
              placeholder="http://localhost:11434"
            />
          </label>
          <label>
            Model
            <input
              list="ollama-models"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              placeholder="qwen2.5-coder:7b"
            />
            <datalist id="ollama-models">
              {models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>
          <button
            className="button secondary"
            disabled={testing}
            onClick={async () => {
              setTesting(true);
              setError('');
              setStatus('');
              try {
                const list = await new OllamaProvider(settings).models();
                setModels(list);
                setStatus(
                  list.length
                    ? `Connected. ${list.length} local model${list.length === 1 ? '' : 's'} available.`
                    : 'Connected, but no models are installed. Run ollama pull qwen2.5-coder:7b.',
                );
              } catch (e) {
                setError(
                  `Could not connect. ${e instanceof Error ? e.message : 'Connection failed.'} Ensure Ollama is running and allows this app’s origin (${window.location.origin}) via OLLAMA_ORIGINS.`,
                );
              } finally {
                setTesting(false);
              }
            }}
          >
            {testing ? <LoaderCircle className="spin" size={15} /> : <Cpu size={15} />}
            {testing ? 'Checking connection…' : 'Test connection'}
          </button>
          {status && (
            <p className="success-message" role="status">
              {status}
            </p>
          )}
          <div className="privacy-note">
            <ShieldCheck size={17} />
            <p>
              When you ask a question, project metadata and selected source excerpts are sent to
              your local Ollama server. Known secret files are excluded. Source files can still
              contain hardcoded secrets. Nothing is sent until you submit a question.
            </p>
          </div>
        </div>
      )}
      {error && <ErrorNotice message={error} />}
      <div className="modal-footer">
        <button className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="button primary"
          onClick={() => {
            try {
              if (settings.enabled) {
                validateEndpoint(settings.endpoint);
                if (!settings.model.trim()) throw new Error('Enter an installed model name.');
              }
              onSave(settings);
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Invalid settings.');
            }
          }}
        >
          Save provider
          <ArrowRight size={15} />
        </button>
      </div>
    </Modal>
  );
}
