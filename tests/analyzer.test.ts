import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeProject,
  importDirectory,
  isSensitive,
  isTextFile,
  MAX_FILES,
} from '../src/lib/analyzer';
import { createDemoProject, demoSources } from '../src/lib/demo';
import { LocalAnalysisProvider, OllamaProvider, validateEndpoint } from '../src/lib/ai';
import { buildGuide, guideMarkdown } from '../src/lib/guide';

test('demo metrics and connections are derived from the sample sources', () => {
  const project = createDemoProject();
  assert.equal(project.files.length, demoSources.length);
  assert.equal(project.routeCount, 12);
  assert.equal(project.packageManager, 'pnpm');
  assert.ok(project.stack.some((s) => s.name === 'Next.js'));
  assert.ok(project.stack.some((s) => s.name === 'PostgreSQL'));
  assert.ok(project.edges.some((e) => e.source === 'frontend' && e.target === 'components'));
  assert.ok(project.edges.some((e) => e.source === 'api' && e.target === 'backend'));
  assert.ok(project.edges.some((e) => e.source === 'backend' && e.target === 'database'));
  assert.ok(
    project.nodes.every((n) => n.files.every((path) => project.files.some((f) => f.path === path))),
  );
  assert.equal(
    project.nodes.reduce((s, n) => s + n.files.length, 0),
    project.files.length,
  );
  assert.ok(Math.abs(project.languages.reduce((s, l) => s + l.percentage, 0) - 100) < 0.001);
});

test('empty and unsupported projects remain honest', () => {
  const empty = analyzeProject('empty', []);
  assert.equal(empty.files.length, 0);
  assert.equal(empty.routeCount, 0);
  assert.equal(empty.packageManager, 'Unknown');
  assert.deepEqual(empty.stack, []);
  assert.equal(empty.insights[0].confidence, 'unknown');
  const binary = analyzeProject('images', [{ path: 'image.png', size: 4096 }]);
  assert.equal(binary.files[0].language, 'Other');
  assert.equal(binary.files[0].content, undefined);
  assert.equal(binary.files[0].lines, undefined);
});

test('secrets are excluded even when contents are supplied directly', () => {
  const project = analyzeProject('private', [
    { path: '.env', size: 30, content: 'API_KEY=supersecret' },
    { path: 'keys/private.pem', size: 20, content: 'PRIVATE KEY' },
    { path: '.env.example', size: 10, content: 'TOKEN=example' },
  ]);
  assert.equal(project.files[0].content, undefined);
  assert.equal(project.files[1].content, undefined);
  assert.equal(project.files[2].content, 'TOKEN=example');
  assert.equal(isSensitive('config/credentials.json'), true);
  assert.equal(isSensitive('src/auth.ts'), false);
});

test('ignored, duplicate, and traversal paths cannot inflate the inventory', () => {
  const project = analyzeProject(
    'clean',
    [
      'node_modules/x/a.ts',
      '.git/config',
      'dist/main.js',
      'src/main.ts',
      'src/main.ts',
      '../outside.ts',
    ].map((path) => ({ path, size: 10 })),
  );
  assert.deepEqual(
    project.files.map((f) => f.path),
    ['src/main.ts'],
  );
  assert.deepEqual(project.directories, ['src']);
  assert.equal(project.skipped, 3);
});

test('malformed manifests do not prevent other files from being analyzed', () => {
  const project = analyzeProject('broken', [
    { path: 'package.json', size: 20, content: '{ broken json' },
    { path: 'src/main.ts', size: 25, content: 'console.log("hello")' },
  ]);
  assert.equal(project.files.length, 2);
  assert.equal(project.warnings.length, 1);
  assert.deepEqual(project.scripts, {});
  assert.equal(project.stack.length, 0);
});

test('HTTP declarations and cross-area imports carry evidence', () => {
  const project = analyzeProject('api', [
    {
      path: 'src/routes/tasks.ts',
      size: 100,
      content:
        'import { db } from "../db/client";\nrouter.get("/tasks", handler);\nrouter.post("/tasks", create);',
    },
    { path: 'src/db/client.ts', size: 40, content: 'export const db = {};' },
    { path: 'src/app/page.tsx', size: 30, content: 'import x from "@/routes/tasks";' },
  ]);
  assert.equal(project.routeCount, 2);
  assert.deepEqual(
    project.edges.map((e) => [e.source, e.target]),
    [['api', 'database']],
  );
  assert.match(project.edges[0].evidence[0], /src\/routes\/tasks.ts → src\/db\/client.ts/);
});

test('limits, large files, and deep nesting produce actionable notes', () => {
  const limited = analyzeProject(
    'large',
    Array.from({ length: MAX_FILES + 1 }, (_, i) => ({ path: `f${i}.ts`, size: 1 })),
  );
  assert.equal(limited.files.length, MAX_FILES);
  assert.equal(limited.skipped, 1);
  assert.ok(limited.warnings[0].includes('limited'));
  const project = analyzeProject('deep', [{ path: 'a/b/c/d/e/f/g/h.ts', size: 120_000 }]);
  assert.ok(project.insights.some((i) => i.id === 'large'));
  assert.ok(project.insights.some((i) => i.id === 'deep'));
});

test('Python and Go manifests are supported for import', () => {
  assert.equal(isTextFile('requirements.txt'), true);
  assert.equal(isTextFile('go.mod'), true);
  const project = analyzeProject('python', [
    { path: 'requirements.txt', size: 15, content: 'fastapi==0.115.0' },
  ]);
  assert.ok(project.stack.some((s) => s.name === 'FastAPI'));
});

test('directory import skips dependencies, keeps metadata, and reports progress', async () => {
  const file = (path: string, content: string) => {
    const f = new File([content], path.split('/').pop()!);
    Object.defineProperty(f, 'webkitRelativePath', { value: `sample/${path}` });
    return f;
  };
  const progress: number[] = [];
  const project = await importDirectory(
    [
      file('src/main.ts', 'export const hello = 1;'),
      file('.env', 'SECRET=value'),
      file('node_modules/a.ts', ''),
    ],
    (n) => progress.push(n),
  );
  assert.equal(project.name, 'sample');
  assert.equal(project.files.length, 2);
  assert.equal(project.skipped, 1);
  assert.equal(project.files.find((f) => f.sensitive)?.content, undefined);
  assert.equal(progress.at(-1), 100);
  await assert.rejects(() => importDirectory([], () => {}), /empty/);
});

test('onboarding contains all eight sections, evidence, and demo labeling', () => {
  const project = createDemoProject();
  assert.equal(buildGuide(project).length, 8);
  const markdown = guideMarkdown(project);
  assert.match(markdown, /DEMO DATA/);
  assert.match(markdown, /pnpm run dev/);
  assert.match(markdown, /not been executed or verified/);
});

test('local explainer answers with source evidence and admits unsupported questions', async () => {
  const provider = new LocalAnalysisProvider();
  const project = createDemoProject();
  const auth = await provider.explain('How does authentication work?', project);
  assert.equal(auth.confidence, 'inferred');
  assert.ok(auth.sources.some((s) => s.includes('auth')));
  const api = await provider.explain('Where are API routes?', project);
  assert.equal(api.confidence, 'detected');
  assert.match(api.text, /12 HTTP/);
  const unknown = await provider.explain('Calculate the cyclomatic complexity', project);
  assert.equal(unknown.confidence, 'unknown');
});

test('Ollama accepts only local HTTP endpoints and rejects malformed responses', async () => {
  assert.equal(validateEndpoint('http://localhost:11434/'), 'http://localhost:11434');
  assert.throws(() => validateEndpoint('https://example.com'), /local/);
  assert.throws(() => validateEndpoint('file:///etc/passwd'));
  assert.throws(() => validateEndpoint('http://user:pass@localhost:11434'));
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ message: {} }), { status: 200 });
    await assert.rejects(
      () =>
        new OllamaProvider({
          endpoint: 'http://localhost:11434',
          model: 'test',
          enabled: true,
        }).explain('Explain', createDemoProject(), []),
      /malformed/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
