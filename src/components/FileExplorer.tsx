import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  Copy,
  FileSearch,
  Folder,
  Search,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { AREA_META } from '../lib/analyzer';
import type { FileNode, Project } from '../types';
import { ConfidenceBadge, EmptyState, FileIcon, formatSize } from './shared';

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  file?: FileNode;
}
function makeTree(files: FileNode[]): TreeNode {
  const root: TreeNode = { name: '', path: '', children: new Map() };
  for (const file of files) {
    let current = root;
    const parts = file.path.split('/');
    parts.forEach((part, i) => {
      if (!current.children.has(part))
        current.children.set(part, {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          children: new Map(),
        });
      current = current.children.get(part)!;
      if (i === parts.length - 1) current.file = file;
    });
  }
  return root;
}

export function FileDetails({ file }: { file: FileNode }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [tab, setTab] = useState<'source' | 'details'>('source');
  const lines = file.content?.split('\n') ?? [];
  return (
    <div className="file-details">
      <div className="file-detail-heading">
        <span className="file-detail-icon">
          <FileIcon file={file} size={23} />
        </span>
        <div>
          <h2>{file.name}</h2>
          <p title={file.path}>{file.path}</p>
        </div>
        <button
          className="icon-button"
          aria-label="Copy file path"
          title={copyError ? 'Clipboard unavailable' : copied ? 'Copied' : 'Copy path'}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(file.path);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              setCopyError(true);
            }
          }}
        >
          {copied ? <span className="copied-label">Copied</span> : <Copy size={16} />}
        </button>
      </div>
      {copyError && (
        <p role="status" className="copy-error">
          Clipboard unavailable. Select and copy the path above.
        </p>
      )}
      <div className="file-meta-strip">
        <span>{file.language}</span>
        <span>{formatSize(file.size)}</span>
        {file.lines !== undefined && <span>{file.lines} lines</span>}
        <span>{AREA_META[file.area].label}</span>
      </div>
      {file.entry && (
        <div className="file-entry">
          <Star size={14} />
          <span>Likely entry point</span>
          <ConfidenceBadge value="inferred" />
        </div>
      )}
      <div className="file-tabs" role="tablist" aria-label="File information">
        <button role="tab" aria-selected={tab === 'source'} onClick={() => setTab('source')}>
          Source preview
        </button>
        <button role="tab" aria-selected={tab === 'details'} onClick={() => setTab('details')}>
          Analysis{file.routes.length > 0 && <span>{file.routes.length}</span>}
        </button>
      </div>
      {tab === 'source' ? (
        <div role="tabpanel" aria-label="Source preview">
          {file.sensitive ? (
            <EmptyState title="Secret contents stay out" icon="shield">
              This environment or credential file is listed by name only. Its contents were not read
              or included in explanations.
            </EmptyState>
          ) : file.content !== undefined ? (
            <>
              <div className="source-code" tabIndex={0} role="region" aria-label="File source code">
                <pre>
                  {lines.slice(0, 600).map((line, i) => (
                    <div className="code-line" key={i}>
                      <span className="line-number" aria-hidden="true">
                        {i + 1}
                      </span>
                      <code>{line || ' '}</code>
                    </div>
                  ))}
                </pre>
              </div>
              {lines.length > 600 && (
                <p className="preview-limit">Preview limited to the first 600 lines.</p>
              )}
            </>
          ) : (
            <EmptyState title="Preview unavailable">
              {file.readError ??
                'This file type is included in the inventory, but its contents are not supported for text analysis.'}
            </EmptyState>
          )}
        </div>
      ) : (
        <div className="file-analysis" role="tabpanel" aria-label="File analysis">
          <h3>Classification</h3>
          <p>
            Assigned to {AREA_META[file.area].label.toLowerCase()} using its filename and directory.
            This is a structural inference.
          </p>
          <h3>
            Import references <span>{file.imports.length}</span>
          </h3>
          {file.imports.length ? (
            file.imports.map((imp, i) => (
              <code className="analysis-code" key={`${imp}-${i}`}>
                {imp}
              </code>
            ))
          ) : (
            <p>No supported JavaScript or TypeScript imports detected.</p>
          )}
          <h3>
            HTTP handlers <span>{file.routes.length}</span>
          </h3>
          {file.routes.length ? (
            file.routes.map((route) => (
              <code className="analysis-code" key={route}>
                {route}
              </code>
            ))
          ) : (
            <p>No supported HTTP method declarations detected.</p>
          )}
          {file.modified && (
            <>
              <h3>Last modified</h3>
              <p>{new Date(file.modified).toLocaleString()}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer({
  project,
  initialPath,
  initialQuery = '',
  onSelect,
}: {
  project: Project;
  initialPath?: string;
  initialQuery?: string;
  onSelect?: (path: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [ext, setExt] = useState('all');
  const [important, setImportant] = useState(false);
  const [selected, setSelected] = useState(
    initialPath ?? project.files.find((f) => f.important)?.path ?? project.files[0]?.path,
  );
  const [open, setOpen] = useState<Set<string>>(
    () =>
      new Set([
        'src',
        'src/app',
        ...(initialPath
          ?.split('/')
          .slice(0, -1)
          .map((_, i) =>
            initialPath
              .split('/')
              .slice(0, i + 1)
              .join('/'),
          ) ?? []),
      ]),
  );
  const filtered = useMemo(
    () =>
      project.files.filter(
        (f) =>
          f.path.toLowerCase().includes(query.toLowerCase()) &&
          (ext === 'all' || f.extension === ext) &&
          (!important || f.important),
      ),
    [project, query, ext, important],
  );
  const tree = useMemo(() => makeTree(filtered), [filtered]);
  const extensions = useMemo(
    () => [...new Set(project.files.map((f) => f.extension))].sort(),
    [project],
  );
  const file = project.files.find((f) => f.path === selected);
  const filtering = Boolean(query || ext !== 'all' || important);
  let rendered = 0;
  const renderTree = (parent: TreeNode, depth = 0) =>
    [...parent.children.values()]
      .sort(
        (a, b) => Number(Boolean(a.file)) - Number(Boolean(b.file)) || a.name.localeCompare(b.name),
      )
      .map((node) => {
        if (++rendered > 500) return null;
        if (node.file)
          return (
            <button
              role="treeitem"
              aria-level={depth + 1}
              aria-selected={selected === node.path}
              key={node.path}
              className={`tree-file ${selected === node.path ? 'selected' : ''}`}
              style={{ paddingLeft: 14 + depth * 16 }}
              onClick={() => {
                setSelected(node.path);
                onSelect?.(node.path);
              }}
              title={node.path}
            >
              <FileIcon file={node.file} />
              <span>{node.name}</span>
              {node.file.important && <Star size={11} className="important-star" />}
              {node.file.sensitive && <ShieldCheck size={11} />}
            </button>
          );
        const expanded = filtering || open.has(node.path);
        return (
          <div key={node.path} role="none">
            <button
              role="treeitem"
              aria-level={depth + 1}
              aria-expanded={expanded}
              className="tree-folder"
              style={{ paddingLeft: 12 + depth * 16 }}
              onClick={() =>
                setOpen((previous) => {
                  const next = new Set(previous);
                  if (next.has(node.path)) next.delete(node.path);
                  else next.add(node.path);
                  return next;
                })
              }
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  setOpen((p) => new Set([...p, node.path]));
                }
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  setOpen((p) => new Set([...p].filter((x) => x !== node.path)));
                }
              }}
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Folder size={15} />
              <span>{node.name}</span>
            </button>
            {expanded && <div role="group">{renderTree(node, depth + 1)}</div>}
          </div>
        );
      });
  return (
    <div className="explorer">
      <div className="explorer-sidebar">
        <div className="explorer-search">
          <Search size={15} />
          <input
            aria-label="Search files"
            placeholder="Find a file…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="explorer-filters">
          <select
            aria-label="Filter by extension"
            value={ext}
            onChange={(e) => setExt(e.target.value)}
          >
            <option value="all">All file types</option>
            {extensions.map((e) => (
              <option key={e} value={e}>
                {e ? `.${e}` : 'No extension'}
              </option>
            ))}
          </select>
          <button
            className={`icon-button ${important ? 'active' : ''}`}
            onClick={() => setImportant(!important)}
            aria-label="Show important files only"
            aria-pressed={important}
          >
            <Star size={15} />
          </button>
          <button
            className="icon-button"
            aria-label="Collapse all directories"
            onClick={() => {
              setOpen(new Set());
              setQuery('');
              setExt('all');
              setImportant(false);
            }}
          >
            <ChevronsDownUp size={15} />
          </button>
        </div>
        <div className="tree-root">
          <Folder size={15} />
          <strong>{project.name}</strong>
          <span>{filtered.length} files</span>
        </div>
        <div
          className="file-tree"
          role="tree"
          aria-label="Project files"
          onKeyDown={(e) => {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End')
              return;
            e.preventDefault();
            const items = Array.from(
              e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="treeitem"]'),
            );
            const index = items.indexOf(document.activeElement as HTMLButtonElement);
            const next =
              e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? items.length - 1
                  : Math.max(
                      0,
                      Math.min(items.length - 1, index + (e.key === 'ArrowDown' ? 1 : -1)),
                    );
            items[next]?.focus();
          }}
        >
          {filtered.length ? (
            renderTree(tree)
          ) : (
            <div className="tree-empty">
              <FileSearch size={23} />
              <p>No matching files</p>
              <button
                className="text-link"
                onClick={() => {
                  setQuery('');
                  setExt('all');
                  setImportant(false);
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          {rendered > 500 && (
            <p className="tree-limit">
              Showing up to 500 visible entries. Search to narrow the list.
            </p>
          )}
        </div>
        <div className="explorer-legend">
          <Star size={12} />
          Suggested starting point
        </div>
      </div>
      <div className="explorer-content">
        {file ? (
          <FileDetails key={file.path} file={file} />
        ) : (
          <EmptyState title="Every file has a place">
            Select a file to inspect its source and metadata.
          </EmptyState>
        )}
      </div>
    </div>
  );
}
