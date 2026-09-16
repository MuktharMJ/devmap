import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Braces,
  ChevronRight,
  CircleCheck,
  Files,
  Folder,
  GitBranch,
  Layers3,
  Network,
  Package,
  Sparkles,
  TestTube2,
} from 'lucide-react';
import { AREA_META } from '../lib/analyzer';
import type { Project, View } from '../types';
import ArchitectureMap from './ArchitectureMap';
import { AreaIcon, ConfidenceBadge, FileIcon, SectionTitle, TextLink } from './shared';

export default function Overview({
  project,
  navigate,
  onOpen,
}: {
  project: Project;
  navigate: (view: View) => void;
  onOpen: (path: string) => void;
}) {
  const entries = project.files.filter((f) => f.entry);
  const testCount = project.files.filter((f) => f.area === 'tests').length;
  const mainStack = project.stack.slice(0, 6);
  const mainDirs = [
    ...new Set(
      project.files.map((f) => (f.path.includes('/') ? f.path.split('/')[0] : '')).filter(Boolean),
    ),
  ];
  return (
    <>
      <section className="project-intro">
        <div className="project-avatar">
          <GitBranch size={27} strokeWidth={1.6} />
        </div>
        <div className="project-title">
          <div className="project-name-row">
            <h2>{project.name}</h2>
            <span className="tiny-tag">{project.demo ? 'DEMO DATA' : 'LOCAL PROJECT'}</span>
            <span className="analysis-complete">
              <CircleCheck size={13} />
              Analysis complete
            </span>
          </div>
          <p>
            {project.description || 'A local codebase, mapped from its files and configuration.'}
          </p>
        </div>
        <button
          className="project-menu-button"
          aria-label="Explore project files"
          onClick={() => navigate('files')}
        >
          <ArrowUpRight size={20} />
        </button>
      </section>
      <div className="stack-row">
        <span className="stack-label">DETECTED STACK</span>
        {mainStack.length ? (
          mainStack.map((stack, i) => (
            <button
              className="stack-chip"
              key={stack.name}
              title={`Evidence: ${stack.evidence}`}
              onClick={() => onOpen(stack.evidence)}
            >
              <span className={`stack-symbol s${i}`}>
                {stack.name === 'Next.js' ? (
                  'N'
                ) : stack.name === 'React' ? (
                  '⚛'
                ) : stack.name === 'TypeScript' ? (
                  'TS'
                ) : stack.name === 'PostgreSQL' ? (
                  <DatabaseSymbol />
                ) : stack.name === 'Prisma' ? (
                  '△'
                ) : (
                  <Braces size={12} />
                )}
              </span>
              {stack.name}
            </button>
          ))
        ) : (
          <span className="muted">No supported framework declarations found</span>
        )}
        {project.stack.length > 6 && (
          <span
            className="more-stack"
            title={project.stack
              .slice(6)
              .map((s) => s.name)
              .join(', ')}
          >
            +{project.stack.length - 6}
          </span>
        )}
        <span className="package-manager">
          <Package size={13} />
          {project.packageManager === 'Unknown'
            ? 'Package manager unknown'
            : project.packageManager}
        </span>
      </div>
      <div className="metrics-strip">
        {[
          { icon: Files, value: project.files.length, label: 'Files', view: 'files' },
          { icon: Folder, value: project.directories.length, label: 'Directories', view: 'files' },
          {
            icon: Braces,
            value: project.languages.filter((l) => l.name !== 'Other').length,
            label: 'Languages & formats',
            view: 'files',
          },
          { icon: Network, value: project.routeCount, label: 'API handlers', view: 'insights' },
          { icon: TestTube2, value: testCount, label: 'Test-related files', view: 'insights' },
        ].map((metric) => (
          <button key={metric.label} onClick={() => navigate(metric.view as View)}>
            <metric.icon size={17} strokeWidth={1.5} />
            <strong>{metric.value.toLocaleString()}</strong>
            <span>{metric.label}</span>
          </button>
        ))}
      </div>
      <div className="overview-grid">
        <section className="architecture-section">
          <SectionTitle
            title="The big picture"
            action={<TextLink onClick={() => navigate('map')}>Explore map</TextLink>}
          />
          <p className="section-description">
            Your architecture, connected. Select an area to look inside.
          </p>
          <ArchitectureMap project={project} onExpand={() => navigate('map')} onOpen={onOpen} />
        </section>
        <aside className="overview-right">
          <section className="language-section">
            <SectionTitle title="Composition" />
            <p className="section-description">A breakdown by file count</p>
            <div
              className="language-bar"
              role="img"
              aria-label={project.languages
                .map((l) => `${l.name} ${Math.round(l.percentage)} percent`)
                .join(', ')}
            >
              {project.languages.map((l) => (
                <div
                  key={l.name}
                  style={{ width: `${l.percentage}%`, background: l.color }}
                  title={`${l.name}: ${l.count} files`}
                />
              ))}
            </div>
            <div className="language-list">
              {project.languages.slice(0, 5).map((l) => (
                <div key={l.name}>
                  <i style={{ background: l.color }} />
                  <span>{l.name}</span>
                  <strong>
                    {l.percentage.toFixed(1)}
                    <small>%</small>
                  </strong>
                </div>
              ))}
              {project.languages.length > 5 && (
                <div>
                  <i style={{ background: '#b9bdb4' }} />
                  <span>{project.languages.length - 5} other formats</span>
                  <strong>
                    {project.languages
                      .slice(5)
                      .reduce((s, l) => s + l.percentage, 0)
                      .toFixed(1)}
                    <small>%</small>
                  </strong>
                </div>
              )}
            </div>
          </section>
          <section className="onboarding-callout">
            <span className="callout-icon">
              <BookOpen size={21} strokeWidth={1.5} />
            </span>
            <span className="eyebrow">NEW HERE?</span>
            <h3>
              A codebase.
              <br />A clear starting point.
            </h3>
            <p>Get a guided introduction to the architecture and files that matter.</p>
            <button onClick={() => navigate('onboarding')}>
              Explain this project
              <ArrowRight size={16} />
            </button>
            <div className="callout-decoration" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </section>
        </aside>
      </div>
      <div className="overview-bottom">
        <section className="entry-section">
          <SectionTitle
            title="Start reading here"
            action={<span className="section-counter">{entries.length} ENTRY POINTS</span>}
          />
          <p className="section-description">A few good doors into this codebase.</p>
          <div className="entry-list">
            {entries.length ? (
              entries.slice(0, 3).map((file, i) => (
                <button className="entry-row" key={file.path} onClick={() => onOpen(file.path)}>
                  <span className="entry-number">0{i + 1}</span>
                  <span className="entry-file-icon">
                    <FileIcon file={file} size={18} />
                  </span>
                  <span className="entry-text">
                    <strong>{file.path}</strong>
                    <small>{AREA_META[file.area].label} · Likely entry point</small>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              ))
            ) : (
              <div className="quiet-empty">
                No conventional entry points found. Start with the project documentation.
              </div>
            )}
          </div>
        </section>
        <section className="insight-preview">
          <SectionTitle
            title="Worth knowing"
            action={<TextLink onClick={() => navigate('insights')}>All insights</TextLink>}
          />
          <p className="section-description">Useful signals. Grounded in your source.</p>
          {project.insights
            .filter((i) => i.kind !== 'entry')
            .slice(0, 3)
            .map((insight) => (
              <button
                className="insight-preview-row"
                key={insight.id}
                onClick={() => navigate('insights')}
              >
                <span className={`insight-symbol ${insight.kind}`}>
                  <AreaIcon
                    area={
                      insight.kind === 'auth'
                        ? 'backend'
                        : insight.kind === 'size' || insight.kind === 'structure'
                          ? 'other'
                          : insight.kind === 'config'
                            ? 'config'
                            : insight.kind === 'database'
                              ? 'database'
                              : insight.kind === 'api'
                                ? 'api'
                                : 'tests'
                    }
                    size={16}
                  />
                </span>
                <span>
                  <strong>{insight.title}</strong>
                  <small>
                    {insight.files.length
                      ? `${insight.files.length} related files`
                      : 'More context needed'}
                  </small>
                </span>
                <ConfidenceBadge value={insight.confidence} />
                <ChevronRight size={13} />
              </button>
            ))}
        </section>
      </div>
      <section className="directory-strip">
        <span>
          <Folder size={15} />
          At the root
        </span>
        {mainDirs.slice(0, 6).map((dir) => (
          <button
            key={dir}
            onClick={() => onOpen(project.files.find((f) => f.path.startsWith(dir + '/'))!.path)}
          >
            <Folder size={13} />
            {dir}
            <ArrowUpRight size={11} />
          </button>
        ))}
        <button className="all-files-link" onClick={() => navigate('files')}>
          Browse all files
          <ArrowRight size={13} />
        </button>
      </section>
      <div className="overview-bottom-note">
        <span>
          <Sparkles size={13} />A little less searching. A lot more understanding.
        </span>
        <span>
          Analyzed locally <span>·</span>{' '}
          {new Date(project.analyzedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </>
  );
}

function DatabaseSymbol() {
  return <Layers3 size={12} />;
}

export function PageHeader({
  view,
  project,
  onGuide,
  onImport,
}: {
  view: View;
  project: Project;
  onGuide: () => void;
  onImport: () => void;
}) {
  const content: Record<View, [string, string]> = {
    overview: ['Project overview', 'Less searching. More understanding.'],
    map: ['Codebase map', 'Follow the connections. Find your bearings.'],
    files: ['File explorer', 'Every directory, every file. A place to start.'],
    insights: ['Architecture insights', 'The signals that make an unfamiliar project familiar.'],
    explainer: ['Project explainer', 'Your questions. Your code. A little more clarity.'],
    onboarding: ['Your project field guide', 'From first look to first contribution.'],
  };
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          <span className="eyebrow-line" />
          YOUR CODE, IN CONTEXT
        </div>
        <h1>{content[view][0]}</h1>
        <p>{content[view][1]}</p>
      </div>
      <div className="page-actions">
        {view === 'overview' && (
          <button className="button secondary" onClick={onGuide}>
            <BookOpen size={15} />
            Quick tour
            <ArrowRight size={13} />
          </button>
        )}
        <button className="button primary" onClick={onImport}>
          <Folder size={15} />
          Import project
          <ArrowDown size={13} />
        </button>
      </div>
      <span className="sr-only">Current project: {project.name}</span>
    </div>
  );
}
