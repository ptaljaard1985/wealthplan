/**
 * Scans the codebase and writes lib/ai/codebase-context.md
 * Run: npx tsx scripts/generate-codebase-context.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "lib", "ai", "codebase-context.md");

const SKIP = new Set(["node_modules", ".next", ".git", ".vercel"]);

// ── Helpers ──────────────────────────────────────────────────────

function walk(dir: string, depth: number, maxDepth: number): string[] {
  if (depth > maxDepth) return [];
  const lines: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return lines;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    if (SKIP.has(e.name) || e.name.startsWith(".")) continue;
    const indent = "  ".repeat(depth);
    if (e.isDirectory()) {
      lines.push(`${indent}${e.name}/`);
      lines.push(...walk(path.join(dir, e.name), depth + 1, maxDepth));
    } else {
      lines.push(`${indent}${e.name}`);
    }
  }
  return lines;
}

function fileTree(): string {
  const sections: string[] = [];
  for (const top of ["app", "components", "lib", "db"]) {
    const abs = path.join(ROOT, top);
    if (!fs.existsSync(abs)) continue;
    sections.push(`${top}/`);
    sections.push(...walk(abs, 1, 4));
  }
  return sections.join("\n");
}

function discoverRoutes(): string[] {
  const routes: string[] = [];
  function scan(dir: string, routePath: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        // Strip route groups like (main)
        const segment = e.name.startsWith("(") && e.name.endsWith(")")
          ? ""
          : `/${e.name}`;
        scan(path.join(dir, e.name), routePath + segment);
      } else if (e.name === "page.tsx") {
        routes.push(`PAGE  ${routePath || "/"}`);
      } else if (e.name === "route.ts") {
        routes.push(`API   ${routePath}`);
      }
    }
  }
  scan(path.join(ROOT, "app"), "");
  return routes.sort();
}

function extractTables(): string[] {
  const dbDir = path.join(ROOT, "db");
  if (!fs.existsSync(dbDir)) return [];
  const files = ["schema.sql", ...fs.readdirSync(dbDir)
    .filter((f) => f.startsWith("migration-") && f.endsWith(".sql"))
    .sort()];
  const tables: string[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const abs = path.join(dbDir, file);
    if (!fs.existsSync(abs)) continue;
    const sql = fs.readFileSync(abs, "utf-8");
    const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\(([\s\S]*?)\);/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) {
      const name = m[1];
      if (seen.has(name)) continue;
      seen.add(name);
      const cols = m[2]
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("--") && !l.startsWith("check") && !l.startsWith("constraint"))
        .map((l) => l.split(/\s+/)[0])
        .filter((c) => c && !c.startsWith("(") && c !== "primary" && c !== "unique" && c !== "foreign");
      tables.push(`${name} (${cols.join(", ")})`);
    }
  }
  return tables;
}

function extractInterfaces(): string[] {
  const targets = [
    "lib/types/database.ts",
    "lib/engines/types.ts",
  ];
  const results: string[] = [];
  for (const rel of targets) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const src = fs.readFileSync(abs, "utf-8");
    const ifRe = /export\s+interface\s+(\w+)\s*(?:extends\s+\w+\s*)?\{([^}]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = ifRe.exec(src)) !== null) {
      const name = m[1];
      const fields = m[2]
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("/*") && !l.startsWith("*") && !l.startsWith("//"))
        .map((l) => l.replace(/[;,]$/, "").split(/[?]?:/)[0].trim())
        .filter(Boolean);
      results.push(`${rel}: ${name} { ${fields.join(", ")} }`);
    }
  }
  return results;
}

function listMigrations(): string[] {
  const dbDir = path.join(ROOT, "db");
  if (!fs.existsSync(dbDir)) return [];
  return fs.readdirSync(dbDir)
    .filter((f) => f.startsWith("migration-") && f.endsWith(".sql"))
    .sort();
}

// ── Build markdown ───────────────────────────────────────────────

const sections: string[] = [
  "# Codebase Context (auto-generated)",
  "",
  "## File Tree",
  "```",
  fileTree(),
  "```",
  "",
  "## Routes",
  ...discoverRoutes().map((r) => `- ${r}`),
  "",
  "## Database Tables",
  ...extractTables().map((t) => `- ${t}`),
  "",
  "## Key TypeScript Interfaces",
  ...extractInterfaces().map((i) => `- ${i}`),
  "",
  "## Migrations",
  ...listMigrations().map((m) => `- ${m}`),
  "",
];

const md = sections.join("\n");

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, md, "utf-8");
console.log(`Wrote ${md.length} chars → ${path.relative(ROOT, OUT)}`);
