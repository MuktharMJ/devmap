export type Area =
  | 'frontend'
  | 'components'
  | 'api'
  | 'backend'
  | 'database'
  | 'tests'
  | 'config'
  | 'docs'
  | 'other';
export type Confidence = 'detected' | 'inferred' | 'unknown';

export interface SourceFile {
  path: string;
  size: number;
  content?: string;
  readError?: string;
  modified?: number;
}

export interface FileNode extends SourceFile {
  name: string;
  extension: string;
  language: string;
  area: Area;
  lines?: number;
  important: boolean;
  entry: boolean;
  sensitive: boolean;
  imports: string[];
  routes: string[];
}

export interface ProjectInsight {
  id: string;
  title: string;
  description: string;
  confidence: Confidence;
  kind: 'entry' | 'api' | 'database' | 'auth' | 'tests' | 'config' | 'size' | 'structure';
  files: string[];
}

export interface ArchitectureNode {
  id: Area;
  label: string;
  subtitle: string;
  color: string;
  files: string[];
}

export interface ArchitectureEdge {
  source: Area;
  target: Area;
  count: number;
  evidence: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  demo: boolean;
  analyzedAt: string;
  files: FileNode[];
  directories: string[];
  stack: { name: string; evidence: string }[];
  packageManager: string;
  scripts: Record<string, string>;
  languages: { name: string; count: number; percentage: number; color: string }[];
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  insights: ProjectInsight[];
  warnings: string[];
  skipped: number;
  routeCount: number;
}

export interface AIResponse {
  text: string;
  sources: string[];
  provider: 'local' | 'ollama';
  confidence: Confidence;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  response?: AIResponse;
}

export type View = 'overview' | 'map' | 'files' | 'insights' | 'explainer' | 'onboarding';
