import type { Confidence, Project } from '../types';

export interface GuideSection {
  title: string;
  confidence: Confidence;
  text: string;
  files: string[];
}
export function buildGuide(project: Project): GuideSection[] {
  const entries = project.files.filter((f) => f.entry).map((f) => f.path);
  const auth = project.insights.find((i) => i.kind === 'auth');
  const readme = project.files.find((f) => /^readme\.md$/i.test(f.path));
  const scripts = Object.entries(project.scripts);
  const runner =
    project.packageManager === 'Unknown' ? 'npm' : project.packageManager.toLowerCase();
  return [
    {
      title: 'What this project is',
      confidence: project.description ? 'detected' : 'unknown',
      text: project.description
        ? `The root package manifest describes ${project.name} as: “${project.description}”`
        : `The purpose of ${project.name} cannot be established from its manifest. Read its documentation and entry points for context.`,
      files: project.description ? ['package.json'] : readme ? [readme.path] : [],
    },
    {
      title: 'How the architecture is organized',
      confidence: 'inferred',
      text: project.nodes.length
        ? `File conventions suggest ${project.nodes.map((n) => n.label.toLowerCase()).join(', ')} areas. ${project.edges.length} directed connections between areas were resolved from relative imports. These describe static dependencies, not guaranteed runtime behavior.`
        : 'No architectural areas could be established from the selected files.',
      files: project.nodes.flatMap((n) => n.files.slice(0, 1)).slice(0, 6),
    },
    {
      title: 'Important directories',
      confidence: 'detected',
      text:
        project.directories
          .filter((d) => d.split('/').length <= 2)
          .slice(0, 16)
          .join(' · ') || 'All included files are at the project root.',
      files: [],
    },
    {
      title: 'Important files',
      confidence: 'inferred',
      text: 'Manifests describe dependencies and commands. README files explain intent. Conventional entry files offer a starting point; importance is based on filenames, not runtime tracing.',
      files: project.files
        .filter((f) => f.important)
        .slice(0, 8)
        .map((f) => f.path),
    },
    {
      title: 'Request and data flow',
      confidence: project.edges.length ? 'inferred' : 'unknown',
      text: project.edges.length
        ? project.edges
            .filter((e) => !['tests', 'config', 'docs'].includes(e.source))
            .slice(0, 6)
            .map(
              (e) =>
                `${project.nodes.find((n) => n.id === e.source)?.label} imports ${project.nodes.find((n) => n.id === e.target)?.label} (${e.count} references).`,
            )
            .join(' ') +
          ' Import direction does not prove request order. Follow the linked source to verify runtime flow.'
        : 'No cross-area relative imports were resolved. Aliases, dynamic imports, and other language module systems may hide relationships.',
      files: project.files
        .filter((f) => f.routes.length)
        .slice(0, 3)
        .map((f) => f.path),
    },
    {
      title: 'Authentication flow',
      confidence: auth ? 'inferred' : 'unknown',
      text: auth
        ? 'Authentication-related files or library references are present. Inspect session creation, request checks, and resource ownership before assuming endpoints are protected. Structural analysis does not verify security.'
        : 'Authentication was not detected. It may be absent, external, or implemented using an unrecognized convention.',
      files: auth?.files.slice(0, 5) ?? [],
    },
    {
      title: 'Where to start reading',
      confidence: 'inferred',
      text: 'Start with the README and package manifest. Then read an application entry point, follow its imports, and inspect a corresponding test. Use the map to move between areas.',
      files: [
        ...(readme ? [readme.path] : []),
        ...entries.slice(0, 3),
        ...project.files
          .filter((f) => f.area === 'tests')
          .slice(0, 1)
          .map((f) => f.path),
      ],
    },
    {
      title: 'How to run the project',
      confidence: scripts.length ? 'detected' : 'unknown',
      text: scripts.length
        ? `${project.packageManager === 'Unknown' ? 'No lockfile identifies a package manager; npm syntax is shown as an example.' : `The lockfile indicates ${project.packageManager}.`} Commands declared in the root package manifest:\n\n${scripts.map(([name, command]) => `${runner} run ${name}  →  ${command}`).join('\n')}\n\nThese commands have not been executed or verified by DevMap. Check the README and environment requirements first.`
        : 'No root package scripts were found. Check the project documentation and language-specific manifest for setup instructions.',
      files: scripts.length
        ? ['package.json', ...(readme ? [readme.path] : [])]
        : readme
          ? [readme.path]
          : [],
    },
  ];
}

export function guideMarkdown(project: Project) {
  return (
    `# ${project.name} — Project field guide\n\n${project.demo ? '**DEMO DATA**\n\n' : ''}Generated by DevMap from local static analysis.\n\n` +
    buildGuide(project)
      .map(
        (s, i) =>
          `## ${i + 1}. ${s.title}\n\n**${s.confidence}**\n\n${s.text}\n\n${s.files.map((f) => `- \`${f}\``).join('\n')}`,
      )
      .join('\n\n')
  );
}
