import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  Download,
  Folder,
  FolderOpen,
  GitBranch,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Network,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { importDirectory } from './lib/analyzer';
import { createDemoProject } from './lib/demo';
import { buildGuide, guideMarkdown } from './lib/guide';
import type { OllamaSettings } from './lib/ai';
import type { ChatMessage, Project, View } from './types';
import Overview, { PageHeader } from './components/Overview';
import ArchitectureMap from './components/ArchitectureMap';
import FileExplorer, { FileDetails } from './components/FileExplorer';
import { ProviderSettings, loadSettings } from './components/ProviderSettings';
import {
  ConfidenceBadge,
  ErrorNotice,
  FileIcon,
  FileLink,
  Logo,
  Modal,
  preferredScrollBehavior,
} from './components/shared';

const Explainer = lazy(() => import('./components/Explainer'));
const navigation: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'map', label: 'Codebase map', icon: Network },
  { id: 'files', label: 'File explorer', icon: FolderOpen },
  { id: 'insights', label: 'Architecture insights', icon: Activity },
  { id: 'explainer', label: 'Project explainer', icon: Sparkles },
  { id: 'onboarding', label: 'Onboarding guide', icon: BookOpen },
];

function App() {
  const [project, setProject] = useState<Project>(createDemoProject);
  const [view, setView] = useState<View>(() =>
    navigation.some((n) => n.id === location.hash.slice(1))
      ? (location.hash.slice(1) as View)
      : 'overview',
  );
  const [modal, setModal] = useState<'import' | 'settings' | 'help' | 'search' | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 680px)').matches);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importError, setImportError] = useState('');
  const [settings, setSettings] = useState(loadSettings);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filePath, setFilePath] = useState<string>();
  const [preview, setPreview] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [fileQuery, setFileQuery] = useState('');
  const [insightFilter, setInsightFilter] = useState('all');
  const [toast, setToast] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const main = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const navigate = (target: View) => {
    setView(target);
    window.location.hash = target;
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    main.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    const media = window.matchMedia('(max-width: 680px)');
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!compact || !mobileNav) return;
    const previous = document.activeElement as HTMLElement | null;
    const nav = navRef.current;
    nav?.querySelector<HTMLElement>('a,button')?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !nav) return;
      const items = Array.from(nav.querySelectorAll<HTMLElement>('a,button'));
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
        event.preventDefault();
        items[0]?.focus();
      }
    };
    document.addEventListener('keydown', trap);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', trap);
      document.body.style.overflow = previousOverflow;
      previous?.focus({ preventScroll: true });
    };
  }, [compact, mobileNav]);
  useEffect(() => {
    const change = () => {
      const next = location.hash.slice(1);
      if (navigation.some((n) => n.id === next)) setView(next as View);
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setModal((current) => (current ? null : 'search'));
      }
      if (e.key === 'Escape') setMobileNav(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(id);
  }, [toast]);
  const openFile = (path: string) => {
    setFilePath(path);
    setFileQuery('');
    setModal(null);
    navigate('files');
  };
  const openPreview = (path: string) => {
    if (project.files.some((f) => f.path === path)) setPreview(path);
  };
  const previewFile = project.files.find((f) => f.path === preview);
  const showImport = () => {
    setImportError('');
    setModal('import');
  };
  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setImporting(true);
    setImportError('');
    setProgress(0);
    try {
      const result = await importDirectory(files, setProgress);
      setProject(result);
      setMessages([]);
      setFilePath(undefined);
      setFileQuery('');
      setPreview(null);
      setModal(null);
      navigate('overview');
      setToast(`${result.name} is ready to explore.`);
    } catch (e) {
      setImportError(
        e instanceof Error ? e.message : 'The project could not be analyzed. Try another folder.',
      );
    } finally {
      setImporting(false);
      if (input.current) input.current.value = '';
    }
  };
  const saveSettings = (next: OllamaSettings) => {
    setSettings(next);
    try {
      localStorage.setItem('devmap-ollama', JSON.stringify(next));
      setToast('Provider preferences saved.');
    } catch {
      setToast('Provider updated for this session. Browser storage is unavailable.');
    }
  };
  const downloadGuide = () => {
    const blob = new Blob([guideMarkdown(project)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9_-]/gi, '-')}-field-guide.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast('Your Markdown field guide is ready.');
  };
  const searchResults = project.files
    .filter((f) => f.path.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 12);
  const filteredInsights = project.insights.filter(
    (i) => insightFilter === 'all' || i.confidence === insightFilter,
  );

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        ref={navRef}
        inert={compact && !mobileNav}
        aria-hidden={compact && !mobileNav ? true : undefined}
        className={`sidebar ${mobileNav ? 'open' : ''}`}
      >
        <a
          href="#overview"
          className="brand-link"
          aria-label="DevMap home"
          onClick={() => navigate('overview')}
        >
          <Logo />
        </a>
        <div className="workspace-label">
          WORKSPACE<span>01</span>
        </div>
        <button className="project-switcher" onClick={showImport}>
          <span className="project-switcher-icon">
            <GitBranch size={18} />
          </span>
          <span>
            <strong>{project.name}</strong>
            <small>{project.demo ? 'Sample project' : 'Local project'}</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <div className="nav-label">EXPLORE</div>
        <nav aria-label="Main navigation">
          {navigation.slice(0, 4).map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
              aria-current={view === item.id ? 'page' : undefined}
            >
              <item.icon size={17} strokeWidth={1.65} />
              <span>{item.label}</span>
              {item.id === 'insights' && (
                <span className="nav-count">{project.insights.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="nav-label understand-label">UNDERSTAND</div>
        <nav aria-label="Project understanding">
          {navigation.slice(4).map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
              aria-current={view === item.id ? 'page' : undefined}
            >
              <item.icon size={17} strokeWidth={1.65} />
              <span>{item.label}</span>
              {item.id === 'explainer' && <span className="ai-tag">AI</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-status">
            <div>
              <span className="status-dot" />
              <strong>Local by design</strong>
            </div>
            <p>
              Your code stays with you.
              <br />
              Your curiosity can go anywhere.
            </p>
          </div>
          <button className="nav-item" onClick={() => setModal('settings')}>
            <Settings2 size={16} />
            <span>Settings</span>
          </button>
          <button className="nav-item" onClick={() => setModal('help')}>
            <CircleHelp size={16} />
            <span>Help & shortcuts</span>
            <ArrowUpRight size={13} />
          </button>
          <div className="sidebar-signoff">
            <span className="user-avatar">Y</span>
            <span>
              Your workspace<small>Personal · local session</small>
            </span>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={20} />
            </button>
            <Folder size={14} />
            <span>Projects</span>
            <ChevronRight size={12} />
            <button onClick={() => navigate('overview')}>{project.name}</button>
            <ChevronRight size={12} />
            <strong>{navigation.find((n) => n.id === view)?.label}</strong>
          </div>
          <div className="topbar-right">
            <button
              className="global-search"
              aria-label="Jump to a file"
              onClick={() => {
                setSearch('');
                setModal('search');
              }}
            >
              <Search size={14} />
              <span>Jump to a file…</span>
              <kbd>
                <Command size={10} />K
              </kbd>
            </button>
            <div className="topbar-divider" />
            <span className="local-indicator">
              <span className="status-dot" />
              Local workspace
            </span>
            <button
              className="topbar-avatar"
              aria-label="Workspace settings"
              onClick={() => setModal('settings')}
            >
              Y
            </button>
          </div>
        </header>
        <main id="main-content" ref={main} tabIndex={-1}>
          <div className={`page-content view-${view}`}>
            <PageHeader
              view={view}
              project={project}
              onGuide={() => navigate('onboarding')}
              onImport={showImport}
            />
            {project.warnings.length > 0 && (
              <details className="analysis-warnings">
                <summary>
                  {project.warnings.length} analysis note{project.warnings.length === 1 ? '' : 's'}{' '}
                  · Some results may be incomplete
                </summary>
                <ul>
                  {project.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </details>
            )}
            {view === 'overview' && (
              <Overview project={project} navigate={navigate} onOpen={openFile} />
            )}
            {view === 'map' && (
              <>
                <div className="view-intro-row">
                  <span>
                    <GitBranch size={15} />
                    {project.name}
                    <span className="tiny-tag">{project.demo ? 'DEMO DATA' : 'LOCAL PROJECT'}</span>
                  </span>
                  <p>
                    {project.nodes.length} areas · {project.edges.length} connections
                  </p>
                </div>
                <ArchitectureMap key={project.id} project={project} expanded onOpen={openFile} />
                <div className="map-explanation">
                  <div>
                    <h3>Every line has a source.</h3>
                    <p>
                      Connections represent resolved relative JavaScript and TypeScript imports
                      between areas. Select a node to inspect the files and import evidence.
                    </p>
                  </div>
                  <div>
                    <h3>A map, with honest limits.</h3>
                    <p>
                      Areas are inferred from paths. Package imports, path aliases, dynamic
                      expressions, and other language module systems are not resolved. Missing lines
                      do not mean code is isolated.
                    </p>
                  </div>
                </div>
              </>
            )}
            {view === 'files' && (
              <FileExplorer
                key={`${project.id}-${filePath}-${fileQuery}`}
                project={project}
                initialPath={filePath}
                initialQuery={fileQuery}
              />
            )}
            {view === 'insights' && (
              <>
                <div className="insights-toolbar">
                  <div className="segmented-control" aria-label="Filter insights">
                    {['all', 'detected', 'inferred', 'unknown'].map((f) => (
                      <button
                        key={f}
                        className={insightFilter === f ? 'active' : ''}
                        aria-pressed={insightFilter === f}
                        onClick={() => setInsightFilter(f)}
                      >
                        {f === 'all' ? 'All insights' : f}
                        <span>
                          {project.insights.filter((i) => f === 'all' || i.confidence === f).length}
                        </span>
                      </button>
                    ))}
                  </div>
                  <span className="insights-caption">Evidence over assumptions.</span>
                </div>
                <div className="insight-list">
                  {filteredInsights.map((insight, i) => (
                    <article className="insight-card" key={insight.id}>
                      <div className="insight-index">{String(i + 1).padStart(2, '0')}</div>
                      <div className="insight-card-body">
                        <div className="insight-card-heading">
                          <h2>{insight.title}</h2>
                          <ConfidenceBadge value={insight.confidence} />
                        </div>
                        <p>{insight.description}</p>
                        <div className="insight-files">
                          {insight.files.slice(0, 4).map((path) => (
                            <FileLink key={path} path={path} onOpen={openFile} />
                          ))}
                        </div>
                        {insight.files.length > 4 && (
                          <details className="more-evidence">
                            <summary>View {insight.files.length - 4} more source files</summary>
                            <div className="insight-files">
                              {insight.files.slice(4).map((path) => (
                                <FileLink key={path} path={path} onOpen={openFile} />
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </article>
                  ))}
                  {!filteredInsights.length && (
                    <div className="empty-state">
                      <ShieldCheck size={30} />
                      <h3>No {insightFilter} insights</h3>
                      <p>Try another confidence filter to see the available findings.</p>
                    </div>
                  )}
                </div>
                <div className="confidence-explainer">
                  <span>
                    <ConfidenceBadge value="detected" />
                    Direct source evidence
                  </span>
                  <span>
                    <ConfidenceBadge value="inferred" />
                    Convention-based interpretation
                  </span>
                  <span>
                    <ConfidenceBadge value="unknown" />
                    Insufficient evidence
                  </span>
                </div>
              </>
            )}
            {view === 'explainer' && (
              <Suspense
                fallback={
                  <div className="loading-view">
                    <LoaderCircle className="spin" />
                    Loading the explainer…
                  </div>
                }
              >
                <Explainer
                  key={project.id}
                  project={project}
                  settings={settings}
                  messages={messages}
                  setMessages={setMessages}
                  onSettings={() => setModal('settings')}
                  onOpen={openPreview}
                />
              </Suspense>
            )}
            {view === 'onboarding' && (
              <div className="guide-layout">
                <aside className="guide-toc">
                  <span className="eyebrow">THE FIELD GUIDE</span>
                  <h2>
                    {project.name}
                    <span className="tiny-tag">{project.demo ? 'DEMO' : 'LOCAL'}</span>
                  </h2>
                  <p>Eight steps to find your bearings.</p>
                  <nav aria-label="Guide contents">
                    {buildGuide(project).map((section, i) => (
                      <button
                        key={section.title}
                        onClick={() =>
                          document.getElementById(`guide-${i}`)?.scrollIntoView({
                            behavior: preferredScrollBehavior(),
                            block: 'start',
                          })
                        }
                      >
                        <span>{String(i + 1).padStart(2, '0')}</span>
                        {section.title}
                      </button>
                    ))}
                  </nav>
                  <button className="button secondary" onClick={downloadGuide}>
                    <Download size={15} />
                    Export Markdown
                  </button>
                  <small>
                    Built from static analysis.
                    <br />
                    Verify inferences in source.
                  </small>
                </aside>
                <div className="guide-content">
                  <div className="guide-cover">
                    <BookOpen size={27} strokeWidth={1.4} />
                    <span className="eyebrow">HELLO, {project.name.toUpperCase()}.</span>
                    <h2>
                      Make yourself
                      <br />
                      at home in the code.
                    </h2>
                    <p>
                      A practical introduction, grounded in the repository.
                      <br />
                      Follow a file link whenever curiosity takes over.
                    </p>
                  </div>
                  {buildGuide(project).map((section, i) => (
                    <section id={`guide-${i}`} className="guide-section" key={section.title}>
                      <div className="guide-section-heading">
                        <span>{String(i + 1).padStart(2, '0')}</span>
                        <h2>{section.title}</h2>
                        <ConfidenceBadge value={section.confidence} />
                      </div>
                      <p>{section.text}</p>
                      <div className="guide-files">
                        {section.files.map((path) => (
                          <FileLink key={path} path={path} onOpen={openPreview} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            )}
            <footer className="page-footer">
              <span>
                <Logo small />
                DevMap<span className="footer-divider">/</span>Find your way through code.
              </span>
              <span>
                Built for the curious.<span className="footer-version">v1.0</span>
              </span>
            </footer>
          </div>
        </main>
      </div>
      <input
        ref={input}
        className="sr-only"
        type="file"
        tabIndex={-1}
        aria-label="Select project directory"
        {...{ webkitdirectory: '', directory: '' }}
        multiple
        onChange={(e) => void importFiles(e.target.files)}
      />
      {modal === 'import' && (
        <Modal
          title="Bring your code into focus"
          onClose={() => {
            if (!importing) setModal(null);
          }}
        >
          <p className="modal-intro">
            Choose a local project folder. We’ll map its structure and help you find your way
            around.
          </p>
          <button
            className="import-dropzone"
            disabled={importing}
            onClick={() => input.current?.click()}
          >
            {importing ? (
              <LoaderCircle size={33} className="spin" />
            ) : (
              <FolderOpen size={35} strokeWidth={1.4} />
            )}
            <strong>
              {importing ? `Analyzing your project… ${progress}%` : 'Choose a project folder'}
            </strong>
            <span>
              {importing
                ? 'Reading files and connecting the dots.'
                : 'Select the root directory of your codebase'}
            </span>
            {importing ? (
              <progress value={progress} max={100} aria-label="Import progress" />
            ) : (
              <span className="button primary">
                <Upload size={15} />
                Browse folders
              </span>
            )}
          </button>
          {importError && <ErrorNotice message={importError} />}
          <div className="import-privacy">
            <ShieldCheck size={19} />
            <div>
              <strong>Local files. Local analysis.</strong>
              <p>
                Files stay in browser memory and are cleared on refresh. Dependencies and build
                output are skipped. Known secret files are listed without reading their contents.
              </p>
            </div>
          </div>
          <details className="import-limits">
            <summary>Supported files & analysis limits</summary>
            <p>
              Up to 8,000 files; text previews up to 256 KB per file and 24 MB total. Common source
              languages, manifests, and documentation are supported. Binary files are inventoried by
              name. Empty directories are not exposed by browser folder selection.
            </p>
          </details>
          <div className="demo-option">
            <div>
              <span className="tiny-tag">DEMO DATA</span>
              <strong>Just exploring?</strong>
              <p>Take a look around Orbit, our full-stack sample.</p>
            </div>
            <button
              className="button secondary"
              disabled={importing}
              onClick={() => {
                setProject(createDemoProject());
                setMessages([]);
                setFilePath(undefined);
                setFileQuery('');
                setModal(null);
                navigate('overview');
                setToast('Demo project loaded.');
              }}
            >
              Load demo
              <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {modal === 'settings' && (
        <ProviderSettings current={settings} onSave={saveSettings} onClose={() => setModal(null)} />
      )}
      {modal === 'help' && (
        <Modal title="A compass for your codebase" onClose={() => setModal(null)}>
          <p className="modal-intro">
            DevMap helps you understand a repository through static file analysis. It does not run
            project code or verify runtime behavior.
          </p>
          <div className="help-sections">
            <section>
              <h3>
                <FolderOpen size={17} />
                Import a project
              </h3>
              <p>
                Select a folder to analyze it locally. The default Orbit workspace is explicitly
                labeled demo data and is processed using the same analyzer.
              </p>
            </section>
            <section>
              <h3>
                <Network size={17} />
                Read the map
              </h3>
              <p>
                Select a node to inspect its files. Drag the canvas to pan; use + and − to zoom.
                When the canvas is focused, arrow keys pan and 0 resets. On mobile, areas become a
                navigable list.
              </p>
            </section>
            <section>
              <h3>
                <Sparkles size={17} />
                Ask better questions
              </h3>
              <p>
                The local explainer answers supported structural questions. Connect a local Ollama
                model in Settings for AI reasoning. A failed AI request falls back to local
                analysis.
              </p>
            </section>
            <section>
              <h3>
                <Command size={17} />
                Make yourself comfortable
              </h3>
              <p>
                <kbd>Ctrl / ⌘ K</kbd> jump to files. <kbd>Esc</kbd> close dialogs. Use arrow keys in
                the file tree. Export a Markdown onboarding guide to share with your team.
              </p>
            </section>
          </div>
        </Modal>
      )}
      {modal === 'search' && (
        <Modal title="Jump to a file" onClose={() => setModal(null)}>
          <div className="command-search">
            <Search size={18} />
            <input
              autoFocus
              aria-label="Search all project files"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${project.files.length} files in ${project.name}…`}
            />
          </div>
          <div className="command-results">
            {searchResults.map((file) => (
              <button key={file.path} onClick={() => openFile(file.path)}>
                <FileIcon file={file} />
                <span>
                  <strong>{file.name}</strong>
                  <small>{file.path}</small>
                </span>
                <ArrowUpRight size={15} />
              </button>
            ))}
            {!searchResults.length && (
              <div className="empty-state">
                <Search size={26} />
                <h3>No matching files</h3>
                <p>Try a filename, extension, or directory.</p>
              </div>
            )}
          </div>
          {project.files.filter((f) => f.path.toLowerCase().includes(search.toLowerCase())).length >
            12 && (
            <button
              className="search-all"
              onClick={() => {
                setFileQuery(search);
                setFilePath(undefined);
                setModal(null);
                navigate('files');
              }}
            >
              See all matches in file explorer
              <ArrowRight size={14} />
            </button>
          )}
          <div className="command-footer">
            <span>
              <kbd>Tab</kbd> navigate <kbd>Enter</kbd> open
            </span>
            <span>
              <kbd>Esc</kbd> close
            </span>
          </div>
        </Modal>
      )}
      {previewFile && (
        <Modal title="Source reference" wide onClose={() => setPreview(null)}>
          <FileDetails key={previewFile.path} file={previewFile} />
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="fatal-error">
        <Logo />
        <h1>This view couldn’t be loaded.</h1>
        <p>
          Your original project files have not been changed. Reload to return to the demo workspace.
        </p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload DevMap
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}

export default App;
