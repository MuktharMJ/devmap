import { Crosshair, Expand, GitBranch, Hand, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { useId, useRef, useState, type PointerEvent } from 'react';
import { AREA_META } from '../lib/analyzer';
import type { Area, Project } from '../types';
import { AreaIcon, FileLink } from './shared';

const positions: Record<Area, [number, number]> = {
  frontend: [55, 55],
  components: [55, 220],
  api: [355, 55],
  backend: [655, 55],
  database: [655, 220],
  other: [355, 220],
  tests: [55, 360],
  docs: [355, 360],
  config: [655, 360],
};
interface Props {
  project: Project;
  expanded?: boolean;
  onExpand?: () => void;
  onOpen: (path: string) => void;
}

export default function ArchitectureMap({ project, expanded = false, onExpand, onOpen }: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<Area | null>(null);
  const [hovered, setHovered] = useState<Area | null>(null);
  const [all, setAll] = useState(expanded);
  const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const id = useId().replaceAll(':', '');
  const nodes = project.nodes.filter((n) => all || !['tests', 'config', 'docs'].includes(n.id));
  const visibleIds = new Set(nodes.map((n) => n.id));
  const edges = project.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));
  const active = hovered ?? selected;
  const related = new Set<Area>(
    active
      ? [
          active,
          ...edges
            .filter((e) => e.source === active || e.target === active)
            .flatMap((e) => [e.source, e.target]),
        ]
      : [],
  );
  const selectedNode = project.nodes.find((n) => n.id === selected);
  const height = all ? 455 : 335;
  const adjustZoom = (delta: number) => setZoom((z) => Math.min(2.5, Math.max(0.5, z + delta)));
  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelected(null);
  };
  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest('[data-node]')) return;
    drag.current = { x: e.clientX, y: e.clientY, startX: pan.x, startY: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag.current || !svg.current) return;
    const ratio = 920 / svg.current.getBoundingClientRect().width;
    setPan({
      x: drag.current.startX + (e.clientX - drag.current.x) * ratio,
      y: drag.current.startY + (e.clientY - drag.current.y) * ratio,
    });
  };
  const focusNode = () => {
    if (!selected) return;
    const [x, y] = positions[selected];
    setZoom(1.45);
    setPan({ x: 460 - (x + 100) * 1.45, y: height / 2 - (y + 40) * 1.45 });
  };

  return (
    <div className={`map-shell ${expanded ? 'expanded' : ''}`}>
      <div className="map-toolbar">
        <div className="map-breadcrumb">
          <GitBranch size={15} />
          <span>{project.name}</span>
          <span className="slash">/</span>
          <span>Architecture</span>
        </div>
        <div className="map-actions">
          <button
            className={`mini-toggle ${all ? 'active' : ''}`}
            onClick={() => setAll(!all)}
            aria-pressed={all}
          >
            Supporting areas
          </button>
          {onExpand && (
            <button className="icon-button" onClick={onExpand} aria-label="Expand codebase map">
              <Expand size={15} />
            </button>
          )}
        </div>
      </div>
      <div className="map-canvas">
        <div className="map-annotation">
          <span className="status-dot" />
          {edges.length} resolved connections<span className="map-hint">FROM SOURCE IMPORTS</span>
        </div>
        <svg
          ref={svg}
          className="architecture-svg"
          viewBox={`0 0 920 ${height}`}
          aria-label="Interactive codebase architecture. Tab to a node and press Enter to inspect it. Use arrow keys to pan, plus or minus to zoom, and zero to reset."
          role="group"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (
              ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0'].includes(
                e.key,
              )
            )
              e.preventDefault();
            if (e.key === '+' || e.key === '=') adjustZoom(0.15);
            if (e.key === '-') adjustZoom(-0.15);
            if (e.key === '0') reset();
            if (e.key.startsWith('Arrow'))
              setPan((p) => ({
                x: p.x + (e.key === 'ArrowLeft' ? 25 : e.key === 'ArrowRight' ? -25 : 0),
                y: p.y + (e.key === 'ArrowUp' ? 25 : e.key === 'ArrowDown' ? -25 : 0),
              }));
          }}
        >
          <defs>
            <pattern id={`dots-${id}`} width="19" height="19" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="#d8ddd3" />
            </pattern>
            <marker
              id={`arrow-${id}`}
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6" fill="none" stroke="#a6b09f" />
            </marker>
            <filter id={`shadow-${id}`} x="-10%" y="-15%" width="120%" height="140%">
              <feDropShadow
                dx="0"
                dy="3"
                stdDeviation="4"
                floodColor="#31452b"
                floodOpacity="0.045"
              />
            </filter>
          </defs>
          <rect width="920" height={height} fill={`url(#dots-${id})`} />
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {edges.map((edge, i) => {
              const [sx, sy] = positions[edge.source];
              const [tx, ty] = positions[edge.target];
              const vertical = sx === tx;
              const forward = tx > sx;
              const x1 = vertical ? sx + 100 : sx + (forward ? 200 : 0);
              const y1 = vertical ? sy + (ty > sy ? 80 : 0) : sy + 40;
              const x2 = vertical ? tx + 100 : tx + (forward ? 0 : 200);
              const y2 = vertical ? ty + (ty > sy ? 0 : 80) : ty + 40;
              const bend = vertical ? (y1 + y2) / 2 : (x1 + x2) / 2;
              const connected = !active || edge.source === active || edge.target === active;
              return (
                <path
                  key={`${edge.source}-${edge.target}`}
                  d={
                    vertical && Math.abs(ty - sy) > 165
                      ? `M${sx + 200},${sy + 40} H${sx + 230} V${ty + 40} H${tx + 200}`
                      : Math.abs(tx - sx) > 300 && Math.abs(ty - sy) > 165
                        ? `M${x1},${y1} H${forward ? sx + 260 : sx - 30} V${sy > ty ? ty + 110 : ty - 30} H${tx + 100} V${sy > ty ? ty + 80 : ty}`
                        : sy === ty && Math.abs(tx - sx) > 300
                          ? `M${sx + 100},${sy} C${sx + 100},${sy - 52} ${tx + 100},${ty - 52} ${tx + 100},${ty}`
                          : vertical
                            ? `M${x1},${y1} C${x1},${bend} ${x2},${bend} ${x2},${y2}`
                            : `M${x1},${y1} C${bend},${y1 + (sy === ty ? (i % 2 ? 12 : -12) : 0)} ${bend},${y2} ${x2},${y2}`
                  }
                  fill="none"
                  strokeLinejoin="round"
                  stroke={active && connected ? '#779367' : '#b6c1ae'}
                  strokeWidth={active && connected ? 1.9 : 1.3}
                  opacity={connected ? 0.85 : 0.13}
                  markerEnd={`url(#arrow-${id})`}
                >
                  <title>
                    {AREA_META[edge.source].label} imports {AREA_META[edge.target].label}:{' '}
                    {edge.count} references
                  </title>
                </path>
              );
            })}
            {nodes.map((node) => {
              const [x, y] = positions[node.id];
              const selectedHere = selected === node.id;
              return (
                <g
                  key={node.id}
                  transform={`translate(${x} ${y})`}
                  className={`map-node ${selectedHere ? 'selected' : ''}`}
                  data-node={node.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.label}, ${node.files.length} files. Inspect area`}
                  aria-pressed={selectedHere}
                  onClick={() => setSelected(selectedHere ? null : node.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(selectedHere ? null : node.id);
                    }
                  }}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  opacity={!active || related.has(node.id) ? 1 : 0.4}
                >
                  <title>{node.subtitle}. Select to browse its files.</title>
                  <rect
                    className="node-box"
                    width="200"
                    height="80"
                    rx="9"
                    fill={selectedHere ? '#f2f7ed' : '#fff'}
                    stroke={selectedHere ? '#6a855e' : '#d9dfd5'}
                    strokeWidth={selectedHere ? '1.6' : '1'}
                    filter={`url(#shadow-${id})`}
                  />
                  <rect x="13" y="17" width="31" height="31" rx="7" fill={node.color + '15'} />
                  <foreignObject x="20" y="23" width="20" height="20">
                    <div style={{ color: node.color }}>
                      <AreaIcon area={node.id} size={18} />
                    </div>
                  </foreignObject>
                  <text x="54" y="30" className="node-name">
                    {node.label}
                  </text>
                  <text x="54" y="48" className="node-detail">
                    {node.files.length} files
                  </text>
                  <circle cx="181" cy="25" r="3" fill={node.color} />
                  <text x="14" y="67" className="node-subtitle">
                    {node.subtitle}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
        {nodes.length === 0 && (
          <div className="map-empty">
            No core areas detected. Enable supporting areas to see all files.
          </div>
        )}
        <div className="mobile-map">
          {nodes.map((n) => (
            <button
              key={n.id}
              className={`mobile-map-node ${selected === n.id ? 'active' : ''}`}
              onClick={() => setSelected(n.id)}
            >
              <span style={{ color: n.color }}>
                <AreaIcon area={n.id} />
              </span>
              <span>
                <strong>{n.label}</strong>
                <small>{n.subtitle}</small>
              </span>
              <span>{n.files.length}</span>
            </button>
          ))}
        </div>
        <div className="map-controls">
          <button aria-label="Zoom out" onClick={() => adjustZoom(-0.15)}>
            <Minus size={15} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button aria-label="Zoom in" onClick={() => adjustZoom(0.15)}>
            <Plus size={15} />
          </button>
          <i />
          <button aria-label="Reset map view" onClick={reset}>
            <RotateCcw size={14} />
          </button>
          {selected && (
            <button aria-label="Focus selected node" onClick={focusNode}>
              <Crosshair size={15} />
            </button>
          )}
        </div>
        <span className="pan-hint">
          <Hand size={12} />
          Drag to pan · Select to explore
        </span>
      </div>
      <div className="map-footer">
        <span>
          <i className="line-key" />
          Resolved relative import
        </span>
        <span>Static structure, not runtime flow</span>
      </div>
      {selectedNode && (
        <div className="node-inspector">
          <div className="node-inspector-heading">
            <span style={{ color: selectedNode.color }}>
              <AreaIcon area={selectedNode.id} />
            </span>
            <strong>{selectedNode.label}</strong>
            <span>{selectedNode.files.length} files</span>
            <button
              className="icon-button"
              aria-label="Close area details"
              onClick={() => setSelected(null)}
            >
              <X size={15} />
            </button>
          </div>
          <p>{selectedNode.subtitle}. Grouped by file and directory conventions.</p>
          <div className="node-files">
            {selectedNode.files.slice(0, expanded ? 30 : 6).map((path) => (
              <FileLink key={path} path={path} onOpen={onOpen} />
            ))}
          </div>
          {selectedNode.files.length > (expanded ? 30 : 6) && (
            <small>
              Showing {expanded ? 30 : 6} of {selectedNode.files.length} files. Use the file
              explorer for the full inventory.
            </small>
          )}
          {expanded &&
            project.edges
              .filter((e) => e.source === selected || e.target === selected)
              .map((e) => (
                <div className="edge-evidence" key={`${e.source}-${e.target}`}>
                  <strong>
                    {AREA_META[e.source].label} → {AREA_META[e.target].label}
                  </strong>
                  {e.evidence.slice(0, 3).map((path) => (
                    <code key={path}>{path}</code>
                  ))}
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
