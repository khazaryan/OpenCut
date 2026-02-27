import path from "node:path";
import fs from "node:fs";

function findProjectRoot(): string {
	let dir = process.cwd();
	// Walk up until we find package.json with "workspaces"
	for (let i = 0; i < 10; i++) {
		const pkgPath = path.join(dir, "package.json");
		if (fs.existsSync(pkgPath)) {
			try {
				const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
				if (pkg.workspaces) return dir;
			} catch {
				// ignore
			}
		}
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return process.cwd();
}

const PROJECT_ROOT = findProjectRoot();

export const MEDIA_BASE_PATH =
	process.env.MEDIA_BASE_PATH ||
	path.join(PROJECT_ROOT, "apps/export-processor/data");

export const EXPORTS_DIR = path.join(MEDIA_BASE_PATH, "exports");
export const SOURCES_DIR = path.join(MEDIA_BASE_PATH, "sources");
