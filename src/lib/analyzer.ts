import type {
  Area,
  ArchitectureEdge,
  FileNode,
  Project,
  ProjectInsight,
  SourceFile,
} from '../types';

export const AREA_META: Record<Area, { label: string; subtitle: string; color: string }> = {
  frontend: { label: 'Frontend', subtitle: 'Pages & application shell', color: '#638778' },
  components: { label: 'Components', subtitle: 'Reusable interface elements', color: '#8e83b9' },
  api: { label: 'API layer', subtitle: 'Routes & request handlers', color: '#658eae' },
  backend: { label: 'Backend', subtitle: 'Services & business logic', color: '#b48b53' },
  database: { label: 'Database', subtitle: 'Models & persistence', color: '#bc7972' },
  tests: { label: 'Tests', subtitle: 'Specs & test utilities', color: '#879466' },
  config: { label: 'Configuration', subtitle: 'Project & tooling setup', color: '#8e9195' },
  docs: { label: 'Documentation', subtitle: 'Guides & project context', color: '#ac937c' },
  other: { label: 'Other files', subtitle: 'Utilities & project assets', color: '#8c9491' },
};

const LANGUAGES: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'JavaScript',
  jsx: 'JavaScript',
  mjs: 'JavaScript',
  cjs: 'JavaScript',
  py: 'Python',
  rs: 'Rust',
  go: 'Go',
  java: 'Java',
  kt: 'Kotlin',
  rb: 'Ruby',
  php: 'PHP',
  cs: 'C#',
  cpp: 'C++',
  c: 'C',
  h: 'C',
  swift: 'Swift',
  vue: 'Vue',
  svelte: 'Svelte',
  css: 'CSS',
  scss: 'CSS',
  sass: 'CSS',
  html: 'HTML',
  json: 'JSON',
  md: 'Markdown',
  mdx: 'Markdown',
  yaml: 'YAML',
  yml: 'YAML',
  toml: 'TOML',
  sql: 'SQL',
  prisma: 'Prisma',
  sh: 'Shell',
  svg: 'SVG',
};
const COLORS: Record<string, string> = {
  TypeScript: '#6c8eae',
  JavaScript: '#d5b46e',
  CSS: '#a896c8',
  JSON: '#9aa885',
  Markdown: '#c5b6a0',
  Python: '#7aa9a1',
  Rust: '#ba8574',
  Go: '#77abbc',
  Prisma: '#9d9590',
};
const IGNORED = new Set([
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'coverage',
  '.venv',
  'venv',
  '__pycache__',
  'vendor',
  'target',
  '.turbo',
  '.cache',
]);
export const MAX_FILES = 8000;
export const MAX_FILE_BYTES = 256_000;
export const MAX_TEXT_BYTES = 24_000_000;

export function isIgnored(path: string) {
  return path
    .replaceAll('\\', '/')
    .split('/')
    .some((p) => IGNORED.has(p));
}
export function isSensitive(path: string) {
  return (
    /(^|\/)(\.env($|\.)|id_rsa|id_ed25519|credentials(?:\.|$)|secrets?(?:\.|$))|\.(pem|key|p12|pfx)$/i.test(
      path,
    ) && !/\.example$|\.sample$|\.template$/i.test(path)
  );
}
export function extension(path: string) {
  const name = path.split('/').pop() ?? path;
  return name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
}
export function isTextFile(path: string) {
  return (
    Boolean(LANGUAGES[extension(path)]) ||
    /(^|\/)(Dockerfile|Makefile|\.gitignore|\.env.*|.*\.lock|requirements.*\.txt|go\.mod|go\.sum|LICENSE)$/i.test(
      path,
    )
  );
}

function classify(path: string): Area {
  if (/(^|\/)(__tests__|tests?|spec|e2e|fixtures)(\/|$)|\.(test|spec)\./i.test(path))
    return 'tests';
  if (/(^|\/)(docs?|documentation)(\/|$)|\.(md|mdx)$/i.test(path)) return 'docs';
  if (/(^|\/)(prisma|drizzle|db|database|models|migrations)(\/|$)|\.(sql|prisma)$/i.test(path))
    return 'database';
  if (/(^|\/)(api|routes|controllers)(\/|$)|(^|\/)route\.[cm]?[jt]sx?$/i.test(path)) return 'api';
  if (/(^|\/)(components|ui)(\/|$)/i.test(path)) return 'components';
  if (/(^|\/)(server|backend|services|middleware)(\/|$)/i.test(path)) return 'backend';
  if (
    /\.config\.|(^|\/)(package\.json|.*lock.*|tsconfig.*|Dockerfile|docker-compose.*|\.env.*|\.gitignore|\.github|config)(\/|$)/i.test(
      path,
    )
  )
    return 'config';
  if (
    /(^|\/)(app|pages|views|client|frontend|hooks|styles|layouts)(\/|$)|\.(tsx|jsx|vue|svelte|css|scss|html)$/i.test(
      path,
    )
  )
    return 'frontend';
  return 'other';
}

function parseRoutes(file: SourceFile, area: Area): string[] {
  const content = file.content ?? '';
  const result = new Set<string>();
  if (area === 'api' && /(^|\/)route\.[jt]s$/.test(file.path)) {
    for (const m of content.matchAll(
      /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=/g,
    ))
      result.add(
        `${m[1] ?? m[2]} /${file.path.replace(/^.*?app\//, '').replace(/\/route\.[jt]s$/, '')}`,
      );
    for (const block of content.matchAll(/export\s*\{([^}]+)\}/g))
      for (const m of block[1].matchAll(/\bas\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g))
        result.add(`${m[1]} /${file.path.replace(/^.*?app\//, '').replace(/\/route\.[jt]s$/, '')}`);
  }
  for (const m of content.matchAll(
    /\b(?:app|router|server)\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
  ))
    result.add(`${m[1].toUpperCase()} ${m[2]}`);
  for (const m of content.matchAll(
    /@(?:app|router)\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g,
  ))
    result.add(`${m[1].toUpperCase()} ${m[2]}`);
  return [...result];
}

export function analyzeProject(
  name: string,
  input: SourceFile[],
  demo = false,
  initialWarnings: string[] = [],
  skipped = 0,
): Project {
  const warnings = [...initialWarnings];
  const eligible = input.filter((f) => !isIgnored(f.path));
  if (eligible.length > MAX_FILES)
    warnings.push(
      `Analysis limited to ${MAX_FILES.toLocaleString()} files. Select a smaller directory for complete results.`,
    );
  const seen = new Set<string>();
  const files: FileNode[] = eligible.slice(0, MAX_FILES).flatMap((source) => {
    const path = source.path.replaceAll('\\', '/').replace(/^\/+/, '');
    if (path.split('/').includes('..') || seen.has(path) || !path) return [];
    seen.add(path);
    const sensitive = isSensitive(path);
    const content = sensitive ? undefined : source.content;
    const file = { ...source, path, content };
    const ext = extension(path);
    const area = classify(path);
    const entry =
      (/(^|\/)(main|index|server|app)\.[cm]?[jt]sx?$/.test(path) &&
        !['components', 'tests', 'database'].includes(area)) ||
      (/(^|\/)(layout|page)\.tsx$/.test(path) && path.split('/').length <= 3) ||
      /(^|\/)(main\.py|manage\.py|main\.go|lib\.rs|main\.rs|Program\.cs)$/.test(path);
    const imports = [
      ...(content ?? '').matchAll(
        /(?:from\s*|import\s*\(|require\s*\(|import\s*)['"]([^'"]+)['"]/g,
      ),
    ].map((m) => m[1]);
    return [
      {
        ...file,
        name: path.split('/').pop()!,
        extension: ext,
        language: LANGUAGES[ext] ?? 'Other',
        area,
        lines: content !== undefined ? content.split('\n').length : undefined,
        important:
          entry || /(^|\/)(package\.json|README\.md|schema\.prisma|Dockerfile)$/i.test(path),
        entry,
        sensitive,
        imports,
        routes: parseRoutes(file, area),
      },
    ];
  });
  const directories = [
    ...new Set(
      files.flatMap((f) => {
        const parts = f.path.split('/');
        return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
      }),
    ),
  ].sort();
  const stack: Project['stack'] = [];
  let description = '';
  let scripts: Record<string, string> = {};
  const known: Record<string, string> = {
    next: 'Next.js',
    react: 'React',
    vue: 'Vue',
    nuxt: 'Nuxt',
    svelte: 'Svelte',
    '@sveltejs/kit': 'SvelteKit',
    express: 'Express',
    fastify: 'Fastify',
    '@nestjs/core': 'NestJS',
    prisma: 'Prisma',
    '@prisma/client': 'Prisma',
    drizzle: 'Drizzle',
    'drizzle-orm': 'Drizzle',
    tailwindcss: 'Tailwind CSS',
    vite: 'Vite',
    typescript: 'TypeScript',
    'next-auth': 'NextAuth',
    mongoose: 'Mongoose',
  };
  for (const f of files.filter((f) => f.name === 'package.json' && f.content)) {
    try {
      const pkg = JSON.parse(f.content!);
      if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg))
        throw new Error('Expected an object');
      if (f.path === 'package.json') {
        description = typeof pkg.description === 'string' ? pkg.description : '';
        scripts =
          pkg.scripts && typeof pkg.scripts === 'object'
            ? (Object.fromEntries(
                Object.entries(pkg.scripts).filter(([, v]) => typeof v === 'string'),
              ) as Record<string, string>)
            : {};
      }
      for (const key of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }))
        if (known[key] && !stack.some((s) => s.name === known[key]))
          stack.push({ name: known[key], evidence: f.path });
    } catch {
      warnings.push(`Could not parse ${f.path}. Manifest-based detection is incomplete.`);
    }
  }
  const signatures: [string, RegExp, RegExp?][] = [
    ['Django', /(^|\/)(requirements.*\.txt|pyproject\.toml)$/, /django/i],
    ['FastAPI', /(^|\/)(requirements.*\.txt|pyproject\.toml)$/, /fastapi/i],
    ['Flask', /(^|\/)(requirements.*\.txt|pyproject\.toml)$/, /flask/i],
    ['Rust', /(^|\/)Cargo\.toml$/],
    ['Go', /(^|\/)go\.mod$/],
    ['PostgreSQL', /\.(prisma|ya?ml|toml)$/, /provider\s*=\s*"postgresql"|image:\s*postgres/],
    ['SQLite', /\.prisma$/, /provider\s*=\s*"sqlite"/],
  ];
  for (const [label, pathRe, textRe] of signatures) {
    const f = files.find((f) => pathRe.test(f.path) && (!textRe || textRe.test(f.content ?? '')));
    if (f && !stack.some((s) => s.name === label)) stack.push({ name: label, evidence: f.path });
  }
  const packageManager = files.some((f) => f.name === 'pnpm-lock.yaml')
    ? 'pnpm'
    : files.some((f) => f.name === 'yarn.lock')
      ? 'Yarn'
      : files.some((f) => /^bun.lockb?$/.test(f.name))
        ? 'Bun'
        : files.some((f) => f.name === 'package-lock.json')
          ? 'npm'
          : files.some((f) => f.name === 'uv.lock')
            ? 'uv'
            : files.some((f) => f.name === 'Cargo.toml')
              ? 'Cargo'
              : 'Unknown';
  const counts = new Map<string, number>();
  files.forEach((f) => counts.set(f.language, (counts.get(f.language) ?? 0) + 1));
  const languages = [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      percentage: files.length ? (count / files.length) * 100 : 0,
      color: COLORS[name] ?? '#b9bdb4',
    }));
  const nodes = (Object.keys(AREA_META) as Area[]).flatMap((id) => {
    const matching = files.filter((f) => f.area === id);
    return matching.length ? [{ id, ...AREA_META[id], files: matching.map((f) => f.path) }] : [];
  });
  const byPath = new Map(files.map((f) => [f.path, f]));
  const edgeMap = new Map<string, ArchitectureEdge>();
  for (const f of files)
    for (const imp of f.imports) {
      if (!imp.startsWith('.')) continue;
      const parts = f.path.split('/').slice(0, -1);
      for (const part of imp.split('/')) {
        if (part === '..') parts.pop();
        else if (part !== '.') parts.push(part);
      }
      const base = parts.join('/');
      const target = [
        base,
        ...['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'].map(
          (e) => base + e,
        ),
      ]
        .map((p) => byPath.get(p))
        .find(Boolean);
      if (!target || target.area === f.area) continue;
      const key = `${f.area}:${target.area}`;
      const edge = edgeMap.get(key) ?? {
        source: f.area,
        target: target.area,
        count: 0,
        evidence: [],
      };
      edge.count++;
      if (edge.evidence.length < 8) edge.evidence.push(`${f.path} → ${target.path}`);
      edgeMap.set(key, edge);
    }
  const insights: ProjectInsight[] = [];
  const add = (
    id: string,
    title: string,
    description: string,
    confidence: ProjectInsight['confidence'],
    kind: ProjectInsight['kind'],
    matches: FileNode[],
  ) => {
    if (matches.length)
      insights.push({
        id,
        title,
        description,
        confidence,
        kind,
        files: matches.map((f) => f.path),
      });
  };
  const entries = files.filter((f) => f.entry);
  add(
    'entry',
    `${entries.length} likely entry point${entries.length === 1 ? '' : 's'}`,
    'Conventional entry filenames suggest where execution or page rendering begins. Verify their callers and framework configuration.',
    'inferred',
    'entry',
    entries,
  );
  const routes = files.filter((f) => f.routes.length);
  const routeCount = files.reduce((sum, f) => sum + f.routes.length, 0);
  add(
    'api',
    `${routeCount} API handler${routeCount === 1 ? '' : 's'} detected`,
    'HTTP method declarations found in source. Dynamic routes, mounted prefixes, and runtime registration may add or change endpoints.',
    'detected',
    'api',
    routes,
  );
  add(
    'database',
    'A persistence layer is present',
    'Database schemas, models, or migration paths were found. Runtime connectivity has not been verified.',
    'inferred',
    'database',
    files.filter((f) => f.area === 'database'),
  );
  add(
    'auth',
    'Authentication deserves a closer look',
    'Authentication-related names or library references suggest an identity flow. Read the implementation to confirm access checks.',
    'inferred',
    'auth',
    files.filter((f) =>
      /(^|\/)(auth|session|login|middleware)[/.-]|next-auth|passport|jwt\.verify/i.test(
        f.path + ' ' + (f.content ?? ''),
      ),
    ),
  );
  add(
    'tests',
    `${files.filter((f) => f.area === 'tests').length} test-related files`,
    'Test filenames and directories are present. This is a structural inventory, not a measure of test coverage or passing tests.',
    'detected',
    'tests',
    files.filter((f) => f.area === 'tests'),
  );
  add(
    'config',
    'Project configuration identified',
    'Manifests, environment filenames, and tooling configuration provide setup context. Secret file contents are excluded from analysis.',
    'detected',
    'config',
    files.filter((f) => f.area === 'config'),
  );
  add(
    'large',
    'Large files may need extra context',
    'These files exceed 500 lines or 100 KB. Consider reading their exports and callers before reading them end to end.',
    'detected',
    'size',
    files.filter((f) => (f.lines ?? 0) > 500 || f.size > 100_000),
  );
  add(
    'deep',
    'Some files are deeply nested',
    'These files are more than six directory levels deep. Their location may reflect routing conventions or a complex module boundary.',
    'detected',
    'structure',
    files.filter((f) => f.path.split('/').length > 7),
  );
  if (!routes.length)
    insights.push({
      id: 'unknown-api',
      title: 'API surface is not established',
      description:
        'No supported HTTP handler declarations were found. The repository may have no API, or use an unsupported routing convention.',
      confidence: 'unknown',
      kind: 'api',
      files: [],
    });
  const readErrors = files.filter((f) => f.readError).length;
  if (readErrors)
    warnings.push(`${readErrors} files could not be read; their metadata is included.`);
  return {
    id: `${name}-${Date.now()}`,
    name,
    description,
    demo,
    analyzedAt: new Date().toISOString(),
    files,
    directories,
    stack,
    packageManager,
    scripts,
    languages,
    nodes,
    edges: [...edgeMap.values()],
    insights,
    warnings,
    skipped: skipped + input.length - eligible.length + Math.max(0, eligible.length - MAX_FILES),
    routeCount,
  };
}

export async function importDirectory(
  fileList: FileList | File[],
  onProgress: (n: number) => void,
): Promise<Project> {
  const all = Array.from(fileList);
  if (!all.length)
    throw new Error(
      'This folder is empty or no files were selected. Choose a folder containing source files.',
    );
  const root = all[0].webkitRelativePath?.split('/')[0] || 'Imported project';
  const pathOf = (f: File) =>
    f.webkitRelativePath ? f.webkitRelativePath.split('/').slice(1).join('/') : f.name;
  const eligible = all.filter((f) => !isIgnored(pathOf(f)));
  const selected = eligible.slice(0, MAX_FILES);
  if (!selected.length)
    throw new Error(
      'No analyzable files found. Dependencies and build output are excluded; choose the source project folder.',
    );
  let textBytes = 0;
  let limited = 0;
  const sources: SourceFile[] = [];
  for (let i = 0; i < selected.length; i += 32) {
    const batch = await Promise.all(
      selected.slice(i, i + 32).map(async (f) => {
        const source: SourceFile = { path: pathOf(f), size: f.size, modified: f.lastModified };
        if (isTextFile(source.path) && !isSensitive(source.path)) {
          if (f.size <= MAX_FILE_BYTES && textBytes + f.size <= MAX_TEXT_BYTES) {
            textBytes += f.size;
            try {
              const text = await f.text();
              if (!text.includes('\0')) source.content = text;
              else source.readError = 'Binary content; preview unavailable.';
            } catch {
              source.readError = 'Your browser could not read this file.';
            }
          } else {
            limited++;
            source.readError = 'Content omitted to stay within analysis limits.';
          }
        }
        return source;
      }),
    );
    sources.push(...batch);
    onProgress(Math.min(100, Math.round(((i + batch.length) / selected.length) * 100)));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const warnings: string[] = [];
  if (eligible.length > MAX_FILES)
    warnings.push(`Only the first ${MAX_FILES.toLocaleString()} eligible files were included.`);
  if (limited)
    warnings.push(
      `${limited} file contents omitted (256 KB per file / 24 MB total text limit). Metadata is still available.`,
    );
  return analyzeProject(root, sources, false, warnings, all.length - selected.length);
}
