import { analyzeProject } from './analyzer';
import type { SourceFile } from '../types';

// A checked-in sample repository, analyzed by the same pipeline as imported files.
const fixture: Record<string, string> = {
  'package.json': JSON.stringify(
    {
      name: 'orbit',
      version: '0.1.0',
      private: true,
      description:
        'A full-stack workspace for teams to organize projects, collaborate on tasks, and keep work moving.',
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        test: 'vitest run',
        'db:migrate': 'prisma migrate dev',
        'db:seed': 'tsx prisma/seed.ts',
      },
      dependencies: {
        next: '^15.0.0',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        '@prisma/client': '^6.0.0',
        'next-auth': '^4.24.0',
        zod: '^3.24.0',
      },
      devDependencies: {
        typescript: '^5.7.0',
        tailwindcss: '^4.0.0',
        prisma: '^6.0.0',
        vitest: '^3.0.0',
      },
    },
    null,
    2,
  ),
  'README.md':
    '# Orbit\n\nA collaborative project management workspace.\n\n## Local development\n\n1. Install dependencies with `pnpm install`.\n2. Copy `.env.example` to `.env` and configure a local PostgreSQL database.\n3. Run `pnpm db:migrate`.\n4. Run `pnpm dev`.\n\nThe application uses Next.js App Router, NextAuth sessions, and Prisma. API handlers check the session before reading or writing workspace data.\n\nThis is a DevMap demo fixture, not a deployable application.',
  'pnpm-lock.yaml': 'lockfileVersion: 9.0\nsettings:\n  autoInstallPeers: true\n',
  '.env.example':
    'DATABASE_URL=postgresql://localhost:5432/orbit\nNEXTAUTH_URL=http://localhost:3000\nNEXTAUTH_SECRET=replace-with-a-local-secret\n',
  '.gitignore': 'node_modules\n.next\n.env\ncoverage\n',
  'next.config.ts':
    'import type { NextConfig } from "next";\nconst config: NextConfig = { reactStrictMode: true };\nexport default config;',
  'tsconfig.json':
    '{ "compilerOptions": { "strict": true, "jsx": "preserve", "moduleResolution": "bundler" } }',
  'postcss.config.js': 'export default { plugins: { "@tailwindcss/postcss": {} } };',
  'vitest.config.ts':
    'import { defineConfig } from "vitest/config";\nexport default defineConfig({ test: { environment: "jsdom" } });',
  'eslint.config.js': 'export default [{ rules: { "no-unused-vars": "error" } }];',
  'docker-compose.yml':
    'services:\n  database:\n    image: postgres:16\n    environment:\n      POSTGRES_DB: orbit\n    ports:\n      - "5432:5432"',
  '.github/workflows/ci.yml':
    'name: CI\non: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: pnpm install\n      - run: pnpm test',
  'src/app/layout.tsx':
    'import { Sidebar } from "../components/layout/Sidebar";\nimport { Providers } from "../components/Providers";\nimport "./globals.css";\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return <html lang="en"><body><Providers><Sidebar />{children}</Providers></body></html>;\n}',
  'src/app/page.tsx':
    'import { ProjectList } from "../components/projects/ProjectList";\nimport { getProjects } from "../server/services/projects";\nexport default async function HomePage() {\n  const projects = await getProjects();\n  return <main><h1>Your workspace</h1><ProjectList projects={projects} /></main>;\n}',
  'src/app/globals.css':
    '@import "tailwindcss";\n:root { --background: #fafaf8; --foreground: #202622; }\nbody { margin: 0; background: var(--background); color: var(--foreground); }',
  'src/app/projects/page.tsx':
    'import { ProjectList } from "../../components/projects/ProjectList";\nimport { getProjects } from "../../server/services/projects";\nexport default async function ProjectsPage() { return <ProjectList projects={await getProjects()} />; }',
  'src/app/projects/[id]/page.tsx':
    'import { TaskBoard } from "../../../components/tasks/TaskBoard";\nimport { getTasks } from "../../../server/services/tasks";\nexport default async function ProjectPage({ params }) { const { id } = await params; return <TaskBoard tasks={await getTasks(id)} />; }',
  'src/app/settings/page.tsx':
    'import { AccountForm } from "../../components/settings/AccountForm";\nexport default function SettingsPage() { return <main><h1>Settings</h1><AccountForm /></main>; }',
  'src/app/login/page.tsx':
    'import { LoginForm } from "../../components/auth/LoginForm";\nexport default function LoginPage() { return <LoginForm />; }',
  'src/app/loading.tsx':
    'export default function Loading() { return <div role="status">Loading your workspace…</div>; }',
  'src/app/error.tsx':
    '"use client";\nexport default function Error({ reset }) { return <button onClick={reset}>Something went wrong. Try again.</button>; }',
  'src/app/not-found.tsx':
    'export default function NotFound() { return <main><h1>Project not found</h1><a href="/">Back to workspace</a></main>; }',
  'src/app/api/projects/route.ts':
    'import { getProjects, createProject } from "../../../server/services/projects";\nimport { requireSession } from "../../../server/auth";\nexport async function GET() { await requireSession(); return Response.json(await getProjects()); }\nexport async function POST(request: Request) { const session = await requireSession(); return Response.json(await createProject(await request.json(), session.user.id), { status: 201 }); }',
  'src/app/api/projects/[id]/route.ts':
    'import { getProject, updateProject, deleteProject } from "../../../../server/services/projects";\nimport { requireSession } from "../../../../server/auth";\nexport async function GET(request, { params }) { const user = await requireSession(); return Response.json(await getProject((await params).id, user.user.id)); }\nexport async function PATCH(request, { params }) { const user = await requireSession(); return Response.json(await updateProject((await params).id, await request.json(), user.user.id)); }\nexport async function DELETE(request, { params }) { const user = await requireSession(); await deleteProject((await params).id, user.user.id); return new Response(null, { status: 204 }); }',
  'src/app/api/tasks/route.ts':
    'import { getTasks, createTask } from "../../../server/services/tasks";\nimport { requireSession } from "../../../server/auth";\nexport async function GET(request: Request) { await requireSession(); return Response.json(await getTasks(new URL(request.url).searchParams.get("project"))); }\nexport async function POST(request: Request) { const session = await requireSession(); return Response.json(await createTask(await request.json(), session.user.id), { status: 201 }); }',
  'src/app/api/tasks/[id]/route.ts':
    'import { updateTask, deleteTask } from "../../../../server/services/tasks";\nimport { requireSession } from "../../../../server/auth";\nexport async function PATCH(request, { params }) { const session = await requireSession(); return Response.json(await updateTask((await params).id, await request.json(), session.user.id)); }\nexport async function DELETE(request, { params }) { const session = await requireSession(); await deleteTask((await params).id, session.user.id); return new Response(null, { status: 204 }); }',
  'src/app/api/auth/[...nextauth]/route.ts':
    'import NextAuth from "next-auth";\nimport { authOptions } from "../../../../server/auth";\nconst handler = NextAuth(authOptions);\nexport { handler as GET, handler as POST };',
  'src/app/api/members/route.ts':
    'import { listMembers } from "../../../server/services/members";\nimport { requireSession } from "../../../server/auth";\nexport async function GET() { const session = await requireSession(); return Response.json(await listMembers(session.user.id)); }',
  'src/components/Providers.tsx':
    '"use client";\nimport { SessionProvider } from "next-auth/react";\nexport function Providers({ children }) { return <SessionProvider>{children}</SessionProvider>; }',
  'src/components/layout/Sidebar.tsx':
    'import { NavLink } from "./NavLink";\nexport function Sidebar() { return <nav aria-label="Main"><NavLink href="/">Overview</NavLink><NavLink href="/projects">Projects</NavLink><NavLink href="/settings">Settings</NavLink></nav>; }',
  'src/components/layout/NavLink.tsx':
    'import Link from "next/link";\nexport function NavLink({ href, children }) { return <Link href={href}>{children}</Link>; }',
  'src/components/layout/Header.tsx':
    'import { Avatar } from "../ui/Avatar";\nexport function Header({ user }) { return <header><span>Orbit</span><Avatar name={user.name} /></header>; }',
  'src/components/projects/ProjectList.tsx':
    'import { ProjectCard } from "./ProjectCard";\nexport function ProjectList({ projects }) { return <section>{projects.map(project => <ProjectCard key={project.id} project={project} />)}</section>; }',
  'src/components/projects/ProjectCard.tsx':
    'import Link from "next/link";\nimport { Badge } from "../ui/Badge";\nexport function ProjectCard({ project }) { return <Link href={`/projects/${project.id}`}><h2>{project.name}</h2><Badge>{project.status}</Badge></Link>; }',
  'src/components/projects/CreateProject.tsx':
    '"use client";\nimport { Button } from "../ui/Button";\nimport { useProjects } from "../../hooks/useProjects";\nexport function CreateProject() { const { create } = useProjects(); return <Button onClick={() => create({ name: "Untitled" })}>New project</Button>; }',
  'src/components/tasks/TaskBoard.tsx':
    'import { TaskColumn } from "./TaskColumn";\nexport function TaskBoard({ tasks }) { return <div>{["todo", "in-progress", "done"].map(status => <TaskColumn key={status} status={status} tasks={tasks.filter(t => t.status === status)} />)}</div>; }',
  'src/components/tasks/TaskColumn.tsx':
    'import { TaskCard } from "./TaskCard";\nexport function TaskColumn({ status, tasks }) { return <section><h2>{status}</h2>{tasks.map(task => <TaskCard key={task.id} task={task} />)}</section>; }',
  'src/components/tasks/TaskCard.tsx':
    'import { Badge } from "../ui/Badge";\nexport function TaskCard({ task }) { return <article><h3>{task.title}</h3><Badge>{task.priority}</Badge></article>; }',
  'src/components/auth/LoginForm.tsx':
    '"use client";\nimport { signIn } from "next-auth/react";\nimport { Button } from "../ui/Button";\nexport function LoginForm() { return <Button onClick={() => signIn("github")}>Continue with GitHub</Button>; }',
  'src/components/settings/AccountForm.tsx':
    '"use client";\nimport { Input } from "../ui/Input";\nexport function AccountForm() { return <form><label htmlFor="name">Display name</label><Input id="name" name="name" /></form>; }',
  'src/components/ui/Button.tsx':
    'import type { ButtonHTMLAttributes } from "react";\nexport function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className="button" {...props} />; }',
  'src/components/ui/Input.tsx':
    'import type { InputHTMLAttributes } from "react";\nexport function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input className="input" {...props} />; }',
  'src/components/ui/Badge.tsx':
    'export function Badge({ children }) { return <span className="badge">{children}</span>; }',
  'src/components/ui/Avatar.tsx':
    'export function Avatar({ name }: { name: string }) { return <span aria-label={name}>{name.slice(0, 2).toUpperCase()}</span>; }',
  'src/components/ui/Dialog.tsx':
    'export function Dialog({ title, children }) { return <dialog aria-label={title}><h2>{title}</h2>{children}</dialog>; }',
  'src/hooks/useProjects.ts':
    '"use client";\nimport { api } from "../lib/api";\nexport function useProjects() { return { create: (data) => api("/api/projects", { method: "POST", body: JSON.stringify(data) }) }; }',
  'src/hooks/useTasks.ts':
    '"use client";\nimport { api } from "../lib/api";\nexport function useTasks(projectId: string) { return { load: () => api(`/api/tasks?project=${projectId}`) }; }',
  'src/hooks/useDebounce.ts':
    'import { useEffect, useState } from "react";\nexport function useDebounce<T>(value: T, delay = 300) { const [result, setResult] = useState(value); useEffect(() => { const id = setTimeout(() => setResult(value), delay); return () => clearTimeout(id); }, [value, delay]); return result; }',
  'src/server/auth.ts':
    'import { getServerSession } from "next-auth";\nimport GitHubProvider from "next-auth/providers/github";\nimport { db } from "../database/client";\nexport const authOptions = { providers: [GitHubProvider({ clientId: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET! })], session: { strategy: "jwt" } };\nexport async function requireSession() { const session = await getServerSession(authOptions); if (!session?.user) throw new Error("Unauthorized"); return session; }\nexport async function findUser(email: string) { return db.user.findUnique({ where: { email } }); }',
  'src/server/services/projects.ts':
    'import { db } from "../../database/client";\nimport { requireSession } from "../auth";\nexport async function getProjects() { const session = await requireSession(); return db.project.findMany({ where: { ownerId: session.user.id } }); }\nexport async function getProject(id, ownerId) { return db.project.findFirstOrThrow({ where: { id, ownerId } }); }\nexport async function createProject(data, ownerId) { return db.project.create({ data: { name: data.name, ownerId } }); }\nexport async function updateProject(id, data, ownerId) { return db.project.update({ where: { id, ownerId }, data: { name: data.name } }); }\nexport async function deleteProject(id, ownerId) { return db.project.delete({ where: { id, ownerId } }); }',
  'src/server/services/tasks.ts':
    'import { db } from "../../database/client";\nexport async function getTasks(projectId) { return db.task.findMany({ where: { projectId } }); }\nexport async function createTask(data, userId) { return db.task.create({ data: { ...data, assigneeId: userId } }); }\nexport async function updateTask(id, data, userId) { return db.task.update({ where: { id, assigneeId: userId }, data }); }\nexport async function deleteTask(id, userId) { return db.task.delete({ where: { id, assigneeId: userId } }); }',
  'src/server/services/members.ts':
    'import { db } from "../../database/client";\nexport async function listMembers(userId: string) { return db.user.findMany({ where: { projects: { some: { ownerId: userId } } }, select: { id: true, name: true } }); }',
  'src/server/middleware/rate-limit.ts':
    'const hits = new Map<string, number>();\nexport function isRateLimited(key: string) { const count = (hits.get(key) ?? 0) + 1; hits.set(key, count); return count > 100; }',
  'src/server/validation/project.ts':
    'import { z } from "zod";\nexport const projectSchema = z.object({ name: z.string().min(1).max(120) });',
  'src/server/validation/task.ts':
    'import { z } from "zod";\nexport const taskSchema = z.object({ title: z.string().min(1), projectId: z.string(), status: z.enum(["todo", "in-progress", "done"]) });',
  'src/database/client.ts':
    'import { PrismaClient } from "@prisma/client";\nconst globalForPrisma = globalThis as unknown as { prisma: PrismaClient };\nexport const db = globalForPrisma.prisma || new PrismaClient();\nif (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;',
  'prisma/schema.prisma':
    'generator client {\n  provider = "prisma-client-js"\n}\ndatasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}\nmodel User {\n  id String @id @default(cuid())\n  email String @unique\n  name String?\n  projects Project[]\n}\nmodel Project {\n  id String @id @default(cuid())\n  name String\n  ownerId String\n  owner User @relation(fields: [ownerId], references: [id])\n  tasks Task[]\n}\nmodel Task {\n  id String @id @default(cuid())\n  title String\n  status String @default("todo")\n  projectId String\n  project Project @relation(fields: [projectId], references: [id])\n}',
  'prisma/seed.ts':
    'import { db } from "../src/database/client";\nasync function seed() { await db.user.create({ data: { email: "demo@example.test", name: "Demo User" } }); }\nseed().finally(() => db.$disconnect());',
  'prisma/migrations/20250101_init/migration.sql':
    'CREATE TABLE "User" ("id" TEXT PRIMARY KEY, "email" TEXT UNIQUE NOT NULL, "name" TEXT);\nCREATE TABLE "Project" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "ownerId" TEXT REFERENCES "User"("id"));\nCREATE TABLE "Task" ("id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "projectId" TEXT REFERENCES "Project"("id"));',
  'src/lib/api.ts':
    'export async function api(path: string, options: RequestInit = {}) {\n  const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });\n  if (!response.ok) throw new Error(`Request failed: ${response.status}`);\n  return response.json();\n}',
  'src/lib/format.ts':
    'export function formatDate(date: Date) { return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date); }',
  'src/lib/utils.ts':
    'export function cn(...values: (string | false | undefined)[]) { return values.filter(Boolean).join(" "); }',
  'src/types/project.ts':
    'export interface Project { id: string; name: string; ownerId: string; status: "active" | "archived"; }',
  'src/types/task.ts':
    'export interface Task { id: string; title: string; projectId: string; status: "todo" | "in-progress" | "done"; }',
  'tests/projects.test.ts':
    'import { describe, it, expect } from "vitest";\nimport { projectSchema } from "../src/server/validation/project";\ndescribe("project validation", () => { it("rejects an empty name", () => { expect(projectSchema.safeParse({ name: "" }).success).toBe(false); }); });',
  'tests/tasks.test.ts':
    'import { it, expect } from "vitest";\nimport { taskSchema } from "../src/server/validation/task";\nit("rejects invalid status", () => { expect(taskSchema.safeParse({ title: "Task", projectId: "1", status: "invalid" }).success).toBe(false); });',
  'tests/format.test.ts':
    'import { it, expect } from "vitest";\nimport { formatDate } from "../src/lib/format";\nit("formats a date", () => expect(formatDate(new Date("2025-01-01T12:00:00Z"))).toContain("2025"));',
  'tests/api.test.ts':
    'import { it, expect, vi } from "vitest";\nimport { api } from "../src/lib/api";\nit("reports request failures", async () => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 })); await expect(api("/api/projects")).rejects.toThrow("403"); vi.unstubAllGlobals(); });',
  'tests/auth.test.ts':
    'import { it, expect, vi } from "vitest";\nvi.mock("next-auth", () => ({ getServerSession: vi.fn().mockResolvedValue(null) }));\nimport { requireSession } from "../src/server/auth";\nit("rejects anonymous access", async () => { await expect(requireSession()).rejects.toThrow("Unauthorized"); });',
  'tests/utils.test.ts':
    'import { it, expect } from "vitest";\nimport { cn } from "../src/lib/utils";\nit("removes empty classes", () => expect(cn("a", false, "b")).toBe("a b"));',
  'e2e/login.spec.ts':
    'import { test, expect } from "@playwright/test";\ntest("login offers GitHub", async ({ page }) => { await page.goto("/login"); await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible(); });',
  'e2e/projects.spec.ts':
    'import { test, expect } from "@playwright/test";\ntest("project list renders", async ({ page }) => { await page.goto("/projects"); await expect(page.getByRole("main")).toBeVisible(); });',
  'docs/architecture.md':
    '# Architecture\n\nNext.js pages compose reusable React components. Route handlers call server services, which use Prisma to query PostgreSQL. NextAuth manages identity.\n\nThe demo illustrates conventions; it does not establish security guarantees.',
  'docs/contributing.md':
    '# Contributing\n\nRun the test suite before opening a pull request. Keep API validation close to the service boundary. Start with src/app/page.tsx to understand rendering.',
  'docs/api.md':
    '# API\n\nProjects and tasks expose collection and item handlers. The method declarations in route.ts are the source of truth. All examples use a session cookie.',
  'docs/development.md':
    '# Development\n\nUse pnpm and a local PostgreSQL database. See README.md for setup. Run pnpm test for unit tests.',
};

export const demoSources: SourceFile[] = Object.entries(fixture).map(([path, content]) => ({
  path,
  content,
  size: new TextEncoder().encode(content).length,
}));
export function createDemoProject() {
  return analyzeProject('orbit', demoSources, true);
}
