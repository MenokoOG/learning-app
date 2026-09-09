import * as path from "path";

// Resolved relative to the compiled file location (dist/common/paths.js),
// so ../../.. lands back at the monorepo root regardless of cwd.
const MONOREPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

export function contentDir(): string {
  const configured = process.env.CONTENT_DIR;
  if (configured && path.isAbsolute(configured)) return configured;
  if (configured) return path.resolve(process.cwd(), configured);
  return path.join(MONOREPO_ROOT, "content");
}

export function dataDir(): string {
  const configured = process.env.DATA_DIR;
  if (configured && path.isAbsolute(configured)) return configured;
  if (configured) return path.resolve(process.cwd(), configured);
  return path.join(MONOREPO_ROOT, "data");
}
