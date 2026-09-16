import {
  ArrowUpRight,
  Braces,
  ChevronRight,
  Code2,
  Database,
  FileCode2,
  FileCog,
  FileText,
  Folder,
  Layers3,
  Network,
  PanelTop,
  Server,
  ShieldCheck,
  TestTube2,
  X,
} from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import type { Area, Confidence, FileNode } from '../types';

export const areaIcons = {
  frontend: PanelTop,
  components: Layers3,
  api: Network,
  backend: Server,
  database: Database,
  tests: TestTube2,
  config: FileCog,
  docs: FileText,
  other: Braces,
};
export function AreaIcon({ area, size = 18 }: { area: Area; size?: number }) {
  const Icon = areaIcons[area];
  return <Icon size={size} strokeWidth={1.6} />;
}
export function ConfidenceBadge({ value }: { value: Confidence }) {
  return (
    <span className={`confidence ${value}`}>
      <i />
      {value}
    </span>
  );
}
export function FileIcon({
  file,
  size = 16,
}: {
  file: Pick<FileNode, 'extension' | 'area'>;
  size?: number;
}) {
  if (file.extension === 'md') return <FileText size={size} className="file-icon muted" />;
  if (file.extension === 'json') return <Braces size={size} className="file-icon amber" />;
  if (file.area === 'database') return <Database size={size} className="file-icon rose" />;
  return (
    <FileCode2
      size={size}
      className={`file-icon ${/tsx?|jsx?/.test(file.extension) ? 'blue' : 'muted'}`}
    />
  );
}
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? 'small' : ''}`}>
      <svg width="31" height="31" viewBox="0 0 34 34" fill="none" aria-hidden="true">
        <path
          d="m5 27 12-21 12 21M10 19h14M17 6v24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M7 27h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {!small && (
        <span>
          DevMap<span className="brand-dot">.</span>
        </span>
      )}
    </div>
  );
}
export function FileLink({ path, onOpen }: { path: string; onOpen: (path: string) => void }) {
  return (
    <button className="file-link" onClick={() => onOpen(path)} title={path}>
      <FileCode2 size={13} />
      <span>{path}</span>
      <ArrowUpRight size={12} />
    </button>
  );
}
export function EmptyState({
  title,
  children,
  icon = 'files',
}: {
  title: string;
  children: ReactNode;
  icon?: 'files' | 'shield';
}) {
  return (
    <div className="empty-state">
      {icon === 'files' ? <Folder size={30} /> : <ShieldCheck size={30} />}
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
export function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ChevronRight size={14} />
    </button>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={19} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="error-notice" role="alert">
      <Code2 size={17} />
      <span>{message}</span>
    </div>
  );
}
export function formatSize(bytes: number) {
  return bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
}
